/**
 * Imports the LIVE WordPress site (ibsu.edu.ge) into this CMS, over its public
 * REST API — the real posts and media that the records-based migration never
 * had.
 *
 *     tsx tools/import-wp.ts posts            # import all WP posts
 *     tsx tools/import-wp.ts media            # import all WP media (by URL)
 *     tsx tools/import-wp.ts posts media      # both
 *     tsx tools/import-wp.ts posts --limit=200   # just the first N (a trial)
 *
 * Posts are tagged source.collection = "wp:post" so they are told apart from
 * the records-posts in the admin's Type filter. Media is referenced by its
 * live ibsu.edu.ge URL (no download); the gallery loads it from there.
 * Nothing is cleared — this adds to what exists; re-running upserts by key.
 */
import mongoose from "mongoose";
import slugify from "slugify";
import { PostSchema } from "../src/schemas/post.schema";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";

const WP = "https://ibsu.edu.ge/wp-json/wp/v2";
const args = process.argv.slice(2);
const want = (name: string) => args.includes(name);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8)) || Infinity;

const decode = (s: string): string =>
  (s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
const plain = (html: string): string => decode((html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch with backoff: ibsu.edu.ge throttles bulk crawls (429, then 403). */
async function fetchRetry(url: string, tries = 8): Promise<Response> {
  for (let i = 0; ; i += 1) {
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      if (i >= tries) throw new Error(`${url}: network error after ${tries} retries`);
      await sleep(Math.min(5000 * 2 ** i, 90000));
      continue;
    }
    if (res.status === 429 || res.status === 403 || res.status >= 500) {
      if (i >= tries) throw new Error(`${url}: HTTP ${res.status} after ${tries} retries`);
      const after = Number(res.headers.get("retry-after")) * 1000;
      await sleep(after || Math.min(5000 * 2 ** i, 90000));
      continue;
    }
    return res;
  }
}

/** Page through a WP collection, yielding every item, politely. */
async function* wpAll(
  path: string,
  fields: string,
  embed = false,
): AsyncGenerator<Record<string, unknown>> {
  let page = 1;
  let yielded = 0;
  const per = embed ? 40 : 100;
  for (;;) {
    const q = embed
      ? `per_page=${per}&page=${page}&_embed=wp:featuredmedia`
      : `per_page=${per}&page=${page}&_fields=${fields}`;
    const res = await fetchRetry(`${WP}/${path}?${q}`);
    if (res.status === 400) break; // past the last page
    if (!res.ok) throw new Error(`${path} page ${page}: HTTP ${res.status}`);
    const batch = (await res.json()) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const item of batch) {
      yield item;
      yielded += 1;
      if (yielded >= limit) return;
    }
    const totalPages = Number(res.headers.get("X-WP-TotalPages") || "0");
    process.stdout.write(`\r  ${path}: ${yielded} fetched (page ${page}/${totalPages})   `);
    if (page >= totalPages) break;
    page += 1;
    await sleep(1200); // stay under the rate limit
  }
  process.stdout.write("\n");
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Post = mongoose.model("Post", PostSchema);
  const Media = mongoose.model("MediaAsset", MediaAssetSchema);

  // id -> {slug} for categories, so posts carry our category slugs.
  const catSlug = new Map<number, string>();
  for await (const c of wpAll("categories", "id,slug")) catSlug.set(c.id as number, c.slug as string);

  if (want("media")) {
    console.log("importing media…");
    let n = 0;
    const docs: Record<string, unknown>[] = [];
    const flushMedia = async () => {
      if (docs.length) await Media.bulkWrite(docs.splice(0) as Parameters<typeof Media.bulkWrite>[0]);
    };
    for await (const m of wpAll("media", "id,source_url,mime_type,title,alt_text,caption")) {
      const url = m.source_url as string;
      if (!url) continue;
      if ((m.mime_type as string)?.startsWith("image/") === false) continue;
      docs.push({
        updateOne: {
          filter: { path: url },
          update: {
            $setOnInsert: {
              path: url,
              source: "wp",
              originalName: plain((m.title as { rendered?: string })?.rendered ?? "") || url.split("/").pop(),
              mime: m.mime_type,
              bytes: 0,
              alt: { ka: plain((m.alt_text as string) ?? ""), en: "" },
              caption: { ka: plain((m.caption as { rendered?: string })?.rendered ?? ""), en: "" },
              folder: "wordpress",
              tags: [],
              variants: [],
            },
          },
          upsert: true,
        },
      });
      n += 1;
      if (docs.length >= 300) await flushMedia();
    }
    await flushMedia();
    console.log(`media: ${n} imported (referenced by URL)`);
  }

  if (want("posts")) {
    console.log("importing posts…");
    const taken = new Set<string>((await Post.find().select("slug").lean()).map((p) => (p as { slug: string }).slug));
    const uniqueSlug = (base: string): string => {
      const root = slugify(base || "post", { lower: true, strict: true }) || "post";
      let slug = root;
      for (let i = 2; taken.has(slug); i += 1) slug = `${root}-${i}`;
      taken.add(slug);
      return slug;
    };

    let n = 0;
    const ops: Record<string, unknown>[] = [];
    const flushPosts = async () => {
      if (ops.length) await Post.bulkWrite(ops.splice(0) as Parameters<typeof Post.bulkWrite>[0]);
    };
    for await (const p of wpAll("posts", "", true)) {
      if (p.status !== "publish") continue;
      const title = plain((p.title as { rendered?: string })?.rendered ?? "");
      const body = decode((p.content as { rendered?: string })?.rendered ?? "");
      const excerpt = plain((p.excerpt as { rendered?: string })?.rendered ?? "");
      const cats = ((p.categories as number[]) ?? []).map((id) => catSlug.get(id)).filter(Boolean) as string[];
      const emb = p._embedded as { "wp:featuredmedia"?: { source_url?: string }[] } | undefined;
      const cover = emb?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
      const key = String(p.id);
      ops.push({
        updateOne: {
          filter: { "source.collection": "wp:post", "source.key": key },
          update: {
            $set: {
              title: { ka: title, en: "" },
              excerpt: { ka: excerpt, en: "" },
              body: { ka: body, en: "" },
              cover,
              categories: cats,
              tags: ["WordPress"],
              status: "published",
              visibility: "public",
              publishedAt: p.date ? new Date(p.date as string) : new Date(),
              authorName: "IBSU",
              source: { collection: "wp:post", key, label: "WordPress", data: { wpId: p.id, link: p.slug } },
            },
            $setOnInsert: { slug: uniqueSlug(title || `wp-${key}`), password: "", sticky: false, allowComments: true },
          },
          upsert: true,
        },
      });
      n += 1;
      if (ops.length >= 300) await flushPosts();
    }
    await flushPosts();
    console.log(`posts: ${n} imported (source "wp:post")`);
  }

  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
