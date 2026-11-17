/**
 * Imports CLEAN posts: only the collections that are genuinely news, stories
 * and blog on the site — not the structured data (staff, tuition, programmes,
 * library, …) the broad migration also swept in.
 *
 *     tsx tools/import-posts.ts            # clears posts, imports the clean set
 *     tsx tools/import-posts.ts --dry      # just report what it would import
 *
 * Posts are derived from `records` (which are left untouched), so clearing and
 * re-importing loses nothing. Newsroom stories keep their body: it lives in a
 * separate `mediaBodies` collection, joined here by story id.
 */
import mongoose from "mongoose";
import slugify from "slugify";
import { COLLECTIONS } from "../src/content-model/catalogue";
import type { CollectionDef, FieldDef } from "../src/content-model/types";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";
import { PostSchema } from "../src/schemas/post.schema";

type Row = Record<string, unknown>;
type Localized = { ka: string; en: string };

/** The collections that read as posts on the live site. */
const POST_COLLECTIONS = [
  "homeNews",
  "scientificNews",
  "announcements",
  "deskStories",
  "mediaCoverage",
  "iroNews",
  "careerNews",
  "schoolNews",
  "events",
  "studentPosts",
  "blogPosts",
  "theses",
  "mediaStories",
];

const dry = process.argv.includes("--dry");

const str = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function localized(data: Row, field: FieldDef): Localized {
  if (field.siblings) return { ka: str(data[field.siblings.ka]), en: str(data[field.siblings.en]) };
  const raw = data[field.name];
  if (field.localized && raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Row;
    const keys = field.localeKeys ?? { ka: "ka", en: "en" };
    return { ka: str(o[keys.ka]) || str(o.ge) || str(o.ka), en: str(o[keys.en]) || str(o.en) };
  }
  return { ka: str(raw), en: "" };
}

function titleOf(data: Row, c: CollectionDef, key: string): Localized {
  const f = c.fields.find((x) => x.name === c.titleField);
  const t = f ? localized(data, f) : { ka: str(data[c.titleField]), en: "" };
  return t.ka || t.en ? t : { ka: key, en: "" };
}

function bodyOf(data: Row, c: CollectionDef): Localized {
  const parts: Localized[] = [];
  for (const f of c.fields) {
    if (f.kind !== "richtext" && f.kind !== "textarea") continue;
    const v = localized(data, f);
    if (v.ka || v.en) parts.push(v);
  }
  return {
    ka: parts.map((p) => p.ka).filter(Boolean).join("\n\n"),
    en: parts.map((p) => p.en).filter(Boolean).join("\n\n"),
  };
}

function excerptOf(data: Row, c: CollectionDef): Localized {
  const f = c.fields.find((x) => x.kind === "textarea" && x.name !== c.titleField);
  return f ? localized(data, f) : { ka: "", en: "" };
}

function coverOf(data: Row, c: CollectionDef): string | null {
  const f = c.fields.find((x) => x.kind === "image");
  const v = f ? data[f.name] : undefined;
  return typeof v === "string" && v ? v : null;
}

/** Newsroom story blocks → HTML, per language. */
function blocksToHtml(blocks: unknown, loc: "ka" | "en"): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((b) => {
      const o = b as Row;
      const text = loc === "ka" ? str(o.ge) || str(o.ka) : str(o.en);
      if (o.t === "h") return text && `<h2>${esc(text)}</h2>`;
      if (o.t === "quote") return text && `<blockquote>${esc(text)}</blockquote>`;
      if (o.t === "img" && typeof o.img === "string")
        return `<img src="/${o.img.replace(/^\//, "")}" alt="" />`;
      return text && `<p>${esc(text)}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Record = mongoose.model("ContentRecord", ContentRecordSchema);
  const Post = mongoose.model("Post", PostSchema);
  const byName = new Map(COLLECTIONS.map((c) => [c.name, c]));

  // Newsroom bodies, by story id.
  const bodyByStory = new Map<string, { ka: string; en: string }>();
  for (const b of await Record.find({ collectionName: "mediaBodies" }).lean()) {
    const d = (b as unknown as { data: Row }).data ?? {};
    const id = str(d.storyId);
    if (id) bodyByStory.set(id, { ka: blocksToHtml(d.blocks, "ka"), en: blocksToHtml(d.blocks, "en") });
  }

  if (!dry) {
    const removed = await Post.deleteMany({});
    console.log(`cleared ${removed.deletedCount} existing posts`);
  }

  const taken = new Set<string>();
  const uniqueSlug = (base: string): string => {
    const root = slugify(base || "post", { lower: true, strict: true }) || "post";
    let slug = root;
    for (let n = 2; taken.has(slug); n += 1) slug = `${root}-${n}`;
    taken.add(slug);
    return slug;
  };

  const perCollection: Record<string, number> = {};
  const docs: Row[] = [];

  for (const name of POST_COLLECTIONS) {
    const collection = byName.get(name);
    if (!collection) continue;
    const records = await Record.find({ collectionName: name }).lean();
    for (const record of records) {
      const r = record as unknown as { key: string; data: Row | null; draft: Row | null; status: string; publishedAt?: Date };
      const data = r.data ?? r.draft ?? {};

      let title: Localized;
      let excerpt: Localized;
      let body: Localized;
      let cover: string | null;

      if (name === "mediaStories") {
        const en = (data.en ?? {}) as Row;
        const ge = (data.ge ?? {}) as Row;
        title = { ka: str(ge.title), en: str(en.title) };
        excerpt = { ka: str(ge.excerpt), en: str(en.excerpt) };
        body = bodyByStory.get(str(data.id) || r.key) ?? { ka: "", en: "" };
        cover = typeof data.img === "string" ? `/${(data.img as string).replace(/^\//, "")}` : null;
      } else {
        title = titleOf(data, collection, r.key);
        excerpt = excerptOf(data, collection);
        body = bodyOf(data, collection);
        cover = coverOf(data, collection);
      }
      if (!title.ka && !title.en) title = { ka: r.key, en: "" };

      perCollection[name] = (perCollection[name] ?? 0) + 1;
      if (dry) continue;

      docs.push({
        slug: uniqueSlug(`${name}-${r.key}`),
        title,
        excerpt,
        body,
        cover,
        categories: [],
        tags: [collection.label],
        status: "published",
        visibility: "public",
        password: "",
        sticky: false,
        allowComments: true,
        publishedAt: r.publishedAt ?? new Date(),
        authorName: "IBSU",
        source: { collection: name, key: r.key, label: collection.label, data },
      });
    }
  }

  if (!dry && docs.length) await Post.insertMany(docs);

  console.log(`${dry ? "[dry] " : ""}clean posts by collection:`);
  for (const name of POST_COLLECTIONS) {
    if (perCollection[name]) console.log(`  ${name.padEnd(16)}${perCollection[name]}`);
  }
  console.log(`total: ${Object.values(perCollection).reduce((a, b) => a + b, 0)}`);
  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
