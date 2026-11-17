/**
 * Imports the LIVE WordPress site (ibsu.edu.ge) into this CMS, over its public
 * REST API — the real posts and media library that the records-based migration
 * never had.
 *
 *     tsx tools/import-wp.ts media              # the media library + metadata
 *     tsx tools/import-wp.ts posts              # the posts
 *     tsx tools/import-wp.ts media posts        # both
 *     tsx tools/import-wp.ts posts --limit=200  # just the first N (a trial)
 *
 * This stage only reads *metadata*; not a single file is transferred. It is
 * step one of four, and the order matters:
 *
 *     import-wp media           what exists, and everything WordPress knew
 *     rescue-wp-media           the files themselves -> R2
 *     mirror-wp-derivatives     the sized copies old posts ask for -> R2
 *     import-wp posts / relink  the references, rewritten to our bucket
 *
 * Re-running is safe and is the point: media is matched on its WordPress id
 * (falling back to the key its URL maps to, for rows imported before that id
 * was kept) and refreshed in place, so a file already moved into R2 keeps its
 * `path`, `key` and `source` and only its metadata is brought up to date.
 * Posts are matched on `source.key`, their WordPress post id.
 *
 * Posts are tagged `source.collection = "wp:post"` so they are told apart
 * from the records-posts in the admin's Type filter. Their bodies are
 * relinked to the bucket as they are written, using the proof-of-mirror in
 * the media library — so importing posts can never undo a relink.
 */
import mongoose from "mongoose";
import slugify from "slugify";
import { PostSchema } from "../src/schemas/post.schema";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import { keyFor, legacyKeyFor, plain, wpAll } from "./wp-common";
import { mirroredKeys, relinkText } from "./wp-relink";

const args = process.argv.slice(2);
const want = (name: string): boolean => args.includes(name);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8)) || Infinity;

/** What we ask WordPress for. `media_details` carries the sizes and filesize. */
const MEDIA_FIELDS = [
  "id",
  "date",
  "modified",
  "slug",
  "title",
  "alt_text",
  "caption",
  "description",
  "media_type",
  "mime_type",
  "source_url",
  "post",
  "author",
  "media_details",
].join(",");

interface WpRendered {
  rendered?: string;
}
interface WpMediaDetails {
  width?: number;
  height?: number;
  filesize?: number;
  file?: string;
  sizes?: Record<
    string,
    { width?: number; height?: number; mime_type?: string; source_url?: string }
  >;
}

async function importMedia(Media: mongoose.Model<unknown>): Promise<void> {
  console.log("media: reading the WordPress library…");
  let seen = 0;
  let skipped = 0;
  const ops: Record<string, unknown>[] = [];
  const flush = async (): Promise<void> => {
    if (!ops.length) return;
    await Media.bulkWrite(ops.splice(0) as Parameters<typeof Media.bulkWrite>[0]);
  };

  for await (const item of wpAll("media", { fields: MEDIA_FIELDS, limit })) {
    const url = item.source_url as string | undefined;
    const key = url ? keyFor(url) : null;
    if (!url || !key) {
      skipped += 1; // an attachment with no file, or one outside uploads/
      continue;
    }
    const details = (item.media_details ?? {}) as WpMediaDetails;
    const title = plain((item.title as WpRendered)?.rendered ?? "");
    const file = key.split("/").pop() ?? url;
    const caption = plain((item.caption as WpRendered)?.rendered ?? "");
    const alt = plain((item.alt_text as string) ?? "");

    const set: Record<string, unknown> = {
      originalName: title || file,
      mime: (item.mime_type as string) || "application/octet-stream",
      wp: {
        id: item.id as number,
        url,
        file,
        slug: (item.slug as string) ?? "",
        title,
        date: (item.date as string) ?? null,
        modified: (item.modified as string) ?? null,
        mediaType: (item.media_type as string) ?? "",
        // The WordPress "description" of an image is an auto-generated
        // <p class="attachment"> wrapper far more often than it is prose;
        // keep the text of it, which is empty in exactly that case.
        description: plain((item.description as WpRendered)?.rendered ?? ""),
        parentPost: (item.post as number) ?? null,
        author: (item.author as number) ?? null,
        width: details.width ?? null,
        height: details.height ?? null,
        filesize: details.filesize ?? null,
        sizes: Object.entries(details.sizes ?? {})
          .filter(([, s]) => s.source_url)
          .map(([name, s]) => ({
            name,
            width: s.width ?? 0,
            height: s.height ?? 0,
            mime: s.mime_type ?? "",
            url: s.source_url as string,
          })),
      },
    };
    if (details.width) set.width = details.width;
    if (details.height) set.height = details.height;
    if (details.filesize) set.bytes = details.filesize;
    // Only written when WordPress has something to say, so a re-run never
    // blanks out alt text an editor has since written here.
    if (alt) set.alt = { ka: alt, en: "" };
    if (caption) set.caption = { ka: caption, en: "" };

    // Identity and location are an insert-time decision: a row already
    // rescued into R2 has a path and key of its own and must keep them.
    const onInsert: Record<string, unknown> = {
      path: url,
      source: "wp",
      bytes: details.filesize ?? 0,
      alt: { ka: alt, en: "" },
      caption: { ka: caption, en: "" },
      folder: "wordpress",
      tags: [],
      variants: [],
    };
    // Mongo refuses an update that names one field in both operators, and
    // `bytes`, `alt` and `caption` are each written by whichever of the two
    // has something to say — so $set wins and $setOnInsert stands down.
    for (const field of Object.keys(set)) delete onInsert[field];

    ops.push({
      updateOne: {
        filter: {
          $or: [
            { "wp.id": item.id },
            { key },
            { key: legacyKeyFor(url) ?? key },
            { path: url },
          ],
        },
        update: { $set: set, $setOnInsert: onInsert },
        upsert: true,
      },
    });
    seen += 1;
    if (ops.length >= 300) await flush();
  }
  await flush();

  const [total, bySource] = await Promise.all([
    Media.countDocuments({ "wp.id": { $exists: true } }),
    Media.aggregate([
      { $match: { "wp.id": { $exists: true } } },
      { $group: { _id: "$source", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  console.log(
    `media: ${seen} attachments read${skipped ? `, ${skipped} without a usable file` : ""}` +
      `\n       ${total} in the library from WordPress — ` +
      (bySource as { _id: string; n: number }[]).map((r) => `${r.n} ${r._id}`).join(", "),
  );
}

async function importPosts(
  Post: mongoose.Model<unknown>,
  Media: mongoose.Model<unknown>,
  publicBase: string,
): Promise<void> {
  // Category ids -> our slugs, so posts are filed where the site expects.
  const catSlug = new Map<number, string>();
  for await (const c of wpAll("categories", { fields: "id,slug" })) {
    catSlug.set(c.id as number, c.slug as string);
  }

  // Tag ids -> names, the secondary taxonomy, kept as free-form tags.
  const tagName = new Map<number, string>();
  for await (const t of wpAll("tags", { fields: "id,name" })) {
    tagName.set(t.id as number, plain(t.name as string));
  }

  const keys = await mirroredKeys(Media);
  console.log(`posts: ${keys.size} mirrored files to relink against`);

  const taken = new Set<string>(
    ((await Post.find().select("slug").lean()) as unknown as { slug: string }[]).map((p) => p.slug),
  );
  const uniqueSlug = (base: string): string => {
    const root = slugify(base || "post", { lower: true, strict: true }) || "post";
    let slug = root;
    for (let i = 2; taken.has(slug); i += 1) slug = `${root}-${i}`;
    taken.add(slug);
    return slug;
  };

  let seen = 0;
  let relinked = 0;
  const missed = new Set<string>();
  const ops: Record<string, unknown>[] = [];
  const flush = async (): Promise<void> => {
    if (!ops.length) return;
    await Post.bulkWrite(ops.splice(0) as Parameters<typeof Post.bulkWrite>[0]);
  };

  for await (const p of wpAll("posts", { embed: true, limit })) {
    if (p.status !== "publish") continue;
    const title = plain((p.title as WpRendered)?.rendered ?? "");
    const rawBody = (p.content as WpRendered)?.rendered ?? "";
    const excerpt = plain((p.excerpt as WpRendered)?.rendered ?? "");
    const cats = ((p.categories as number[]) ?? [])
      .map((id) => catSlug.get(id))
      .filter(Boolean) as string[];
    const tags = ((p.tags as number[]) ?? [])
      .map((id) => tagName.get(id))
      .filter(Boolean) as string[];
    const embedded = p._embedded as
      | { "wp:featuredmedia"?: { source_url?: string }[] }
      | undefined;
    const rawCover = embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

    // Relink as we write: a body that comes in pointing at ibsu.edu.ge is
    // stored pointing at our bucket, so re-importing cannot undo the move.
    const body = relinkText(rawBody, keys, publicBase);
    const cover = rawCover ? relinkText(rawCover, keys, publicBase) : null;
    relinked += body.replaced + (cover?.replaced ?? 0);
    for (const m of body.missed) missed.add(m);
    for (const m of cover?.missed ?? []) missed.add(m);

    const key = String(p.id);
    ops.push({
      updateOne: {
        filter: { "source.collection": "wp:post", "source.key": key },
        update: {
          $set: {
            title: { ka: title, en: "" },
            excerpt: { ka: excerpt, en: "" },
            body: { ka: body.text, en: "" },
            cover: cover?.text ?? null,
            categories: cats,
            tags: ["WordPress", ...tags],
            status: "published",
            visibility: "public",
            publishedAt: p.date ? new Date(p.date as string) : new Date(),
            authorName: "IBSU",
            source: {
              collection: "wp:post",
              key,
              label: "WordPress",
              // Where it came from, not a second copy of it: the pre-relink
              // body is not kept here (it would double this collection) and
              // does not need to be. Every rewrite is a pure function of a
              // URL, and each media row remembers the ibsu.edu.ge URL it was
              // mirrored from in `wp.url`, so the mapping can be inverted.
              data: { wpId: p.id, link: p.slug, modified: p.modified ?? null },
            },
          },
          $setOnInsert: {
            slug: uniqueSlug(title || `wp-${key}`),
            password: "",
            sticky: Boolean(p.sticky),
            allowComments: true,
          },
        },
        upsert: true,
      },
    });
    seen += 1;
    if (ops.length >= 200) await flush();
  }
  await flush();
  console.log(
    `posts: ${seen} imported (source "wp:post"), ${relinked} image URLs pointed at our bucket`,
  );
  if (missed.size) {
    console.log(`       ${missed.size} URLs left on ibsu.edu.ge (no copy mirrored yet):`);
    [...missed].slice(0, 8).forEach((u) => console.log(`         ${u}`));
  }
}

async function main(): Promise<void> {
  if (!want("media") && !want("posts")) {
    console.log("nothing to do: name at least one of `media`, `posts`.");
    return;
  }
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Post = mongoose.model("Post", PostSchema);
  const Media = mongoose.model("MediaAsset", MediaAssetSchema);
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

  if (want("media")) await importMedia(Media as unknown as mongoose.Model<unknown>);
  if (want("posts")) {
    if (!publicBase) throw new Error("R2_PUBLIC_BASE_URL is not set; posts would import unrelinked.");
    await importPosts(
      Post as unknown as mongoose.Model<unknown>,
      Media as unknown as mongoose.Model<unknown>,
      publicBase,
    );
  }

  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
