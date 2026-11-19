/**
 * The old site's own post types, into the collections that model them.
 *
 *     set -a; source .env; set +a
 *     tsx tools/import-wp-types.ts --dry --limit=3
 *     tsx tools/import-wp-types.ts --only=announcements
 *     tsx tools/import-wp-types.ts --out=wp-types.json   # where the old site answers
 *     tsx tools/import-wp-types.ts --in=wp-types.json    # where the database lives
 *     tsx tools/import-wp-types.ts --drop-posts          # undo an earlier import-as-posts
 *
 * ibsu.edu.ge keeps six post types of its own beside ordinary posts.
 * student-experiences was migrated already, into `experiences`. Three more
 * come here:
 *
 *   announcements  (116) → the `announcements` collection, behind
 *                          /news/announcements
 *   vacancy         (36) → `vacancies`, behind /vacancies
 *   ibsu-navigator  (59) → `navigator`, a collection of its own
 *
 * Each goes to the collection that models it rather than into posts. The
 * first two already existed, holding a dozen prototype samples each and a
 * note in the website's accessor saying the real ones were still on
 * WordPress — these are those. Keeping the old site's types apart is also
 * simply what they are: a vacancy has a deadline and a status, an
 * announcement has a category the page files it under, and a post has
 * neither.
 *
 * The prototype samples are left in place; they are ordinary records and an
 * editor can delete them. Nothing here overwrites a record it did not
 * write: the key carries the old site's id (`wp-64452`).
 */
import fs from "node:fs";
import mongoose from "mongoose";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import { decode, fetchRetry, keyFor, plain, publicUrl, sleep } from "./wp-common";

interface TypeDef {
  /** the REST base on the old site */
  base: string;
  /** the collection the records are written to */
  collection: string;
  label: string;
}

const TYPES: Record<string, TypeDef> = {
  announcements: { base: "announcements", collection: "announcements", label: "Announcements" },
  vacancy: { base: "vacancy", collection: "vacancies", label: "Vacancies" },
  "ibsu-navigator": { base: "ibsu-navigator", collection: "navigator", label: "Programme navigator" },
};

/**
 * Which of the five categories a notice is filed under.
 *
 * The old site has no such field — the page here does, and it drives the
 * feed's tabs — so it is read off the words. 80 of the 116 say plainly
 * what they are; the rest are "general", which is what the category is for.
 */
const CATEGORY: [AnnouncementCategory, RegExp][] = [
  ["defences", /დაცვ|დისერტაცი|სადოქტორო/i],
  ["competitions", /კონკურს/i],
  ["exchange", /გაცვლ|erasmus|exchange|მობილობ/i],
];

type AnnouncementCategory = "general" | "defences" | "exchange" | "competitions" | "other";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const dropPosts = args.includes("--drop-posts");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice("--limit=".length)) || Infinity;
const out = args.find((a) => a.startsWith("--out="))?.slice("--out=".length);
const from = args.find((a) => a.startsWith("--in="))?.slice("--in=".length);

const WP = "https://ibsu.edu.ge/wp-json/wp/v2";

interface WpItem {
  id: number;
  slug: string;
  link: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: { source_url?: string }[] };
}

interface Row {
  collection: string;
  key: string;
  order: number;
  data: Record<string, unknown>;
}

/** One type's items, a page at a time, with the featured image attached. */
async function items(base: string): Promise<WpItem[]> {
  const all: WpItem[] = [];
  for (let page = 1; ; page += 1) {
    const res = await fetchRetry(
      `${WP}/${base}?per_page=50&page=${page}&_embed=wp:featuredmedia` +
        `&_fields=id,slug,link,date,title,content,excerpt,_links,_embedded`,
    );
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`${base} page ${page}: HTTP ${res.status}`);
    const batch = (await res.json()) as WpItem[];
    if (batch.length === 0) break;
    all.push(...batch);
    process.stdout.write(`\r  ${base}: ${all.length} fetched   `);
    if (batch.length < 50) break;
    await sleep(900);
  }
  process.stdout.write("\n");
  return all.slice(0, limit);
}

/**
 * The summary the feed prints, where the old site wrote none.
 *
 * Every one of these has an empty excerpt. The opening of the text is a
 * truer summary than a blank line, and it is a field an editor can replace.
 */
function summaryOf(item: WpItem, max = 220): string {
  const written = plain(item.excerpt?.rendered ?? "");
  if (written) return written;
  const text = plain(item.content?.rendered ?? "");
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return `${stop > max / 2 ? cut.slice(0, stop + 1) : cut.trimEnd()}…`;
}

/** Both languages from one: these types exist only in Georgian. */
const both = (value: string) => ({ ka: value, en: value });

function rowFor(type: string, def: TypeDef, item: WpItem): Row {
  const title = decode(item.title?.rendered ?? "") || `#${item.id}`;
  const body = item.content?.rendered ?? "";
  const summary = summaryOf(item);
  const cover = item._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const key = `wp-${item.id}`;
  const date = (item.date ?? "").slice(0, 10);

  if (def.collection === "announcements") {
    const haystack = `${title} ${plain(body).slice(0, 400)}`;
    const found = CATEGORY.find(([, test]) => test.test(haystack));
    return {
      collection: def.collection,
      key,
      order: 0,
      data: {
        id: key,
        category: found ? found[0] : "general",
        date,
        // The finer label and the unit are the page's, not the old site's.
        kind: both(""),
        unit: both(""),
        title: both(title),
        excerpt: both(summary),
        body: both(body),
        cover,
        source: item.link,
      },
    };
  }

  if (def.collection === "vacancies") {
    return {
      collection: def.collection,
      key,
      order: 0,
      data: {
        id: key,
        /**
         * Open, and academic. Both are guesses an editor can correct in a
         * click, and both are the common case: these are the competitions
         * the university was advertising. The deadline is left empty
         * rather than guessed — 35 of the 36 name a date somewhere in the
         * text, but not reliably the closing one.
         */
        status: "open",
        category: "academic",
        deadline: "",
        text: {
          ka: { title, categoryLabel: "", unit: "", type: "", summary: "", requirements: [], documents: [] },
          en: { title, categoryLabel: "", unit: "", type: "", summary: "", requirements: [], documents: [] },
        },
        body: both(body),
        cover,
        source: item.link,
      },
    };
  }

  return {
    collection: def.collection,
    key,
    order: 0,
    data: {
      id: key,
      title: both(title),
      date,
      excerpt: both(summary),
      body: both(body),
      cover,
      source: item.link,
    },
  };
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Record = mongoose.model("ContentRecord", ContentRecordSchema);
  const Media = mongoose.model("MediaAsset", MediaAssetSchema);
  const base = process.env.R2_PUBLIC_BASE_URL;

  /**
   * Undoes the first run of this tool, which wrote these as posts under a
   * category each before they were given collections of their own.
   */
  if (dropPosts) {
    const db = mongoose.connection.db!;
    const slugs = ["announcements", "vacancies-wp", "ibsu-navigator"];
    const posts = await db
      .collection("posts")
      .deleteMany({ categories: { $in: slugs }, "source.collection": /^wp:/ });
    const cats = await db.collection("categories").deleteMany({ slug: { $in: slugs } });
    console.log(`removed ${posts.deletedCount} posts and ${cats.deletedCount} categories`);
    await mongoose.disconnect();
    return;
  }

  /**
   * A cover on the bucket rather than on the old site.
   *
   * Resolved when the record is written, not when the old site is read:
   * which files are mirrored is a property of the database being written.
   */
  const relink = async (cover: unknown): Promise<string | null> => {
    if (typeof cover !== "string" || !cover) return null;
    if (!base) return cover;
    const key = keyFor(cover);
    if (!key) return cover;
    const mirrored = publicUrl(base, key);
    return (await Media.exists({ path: mirrored })) ? mirrored : cover;
  };

  const save = async (row: Row, order: number): Promise<"new" | "updated"> => {
    row.data.cover = await relink(row.data.cover);
    const existing = await Record.findOne({
      collectionName: row.collection,
      key: row.key,
    }).exec();
    if (existing) {
      existing.set({ data: row.data, status: "published", publishedAt: new Date() });
      await existing.save();
      return "updated";
    }
    await Record.create({
      collectionName: row.collection,
      key: row.key,
      data: row.data,
      status: "published",
      publishedAt: new Date(),
      order,
    });
    return "new";
  };

  const apply = async (rows: Row[]): Promise<void> => {
    let made = 0;
    let changed = 0;
    for (const [i, row] of rows.entries()) {
      (await save(row, 1000 + i)) === "new" ? (made += 1) : (changed += 1);
    }
    const byCollection: Record<string, number> = {};
    for (const row of rows) byCollection[row.collection] = (byCollection[row.collection] ?? 0) + 1;
    console.log(
      `\nwrote ${rows.length} records: ${made} new, ${changed} updated ` +
        `(${Object.entries(byCollection).map(([c, n]) => `${c} ${n}`).join(", ")})`,
    );
  };

  if (from) {
    await apply(JSON.parse(fs.readFileSync(from, "utf8")) as Row[]);
    await mongoose.disconnect();
    return;
  }

  const chosen = Object.entries(TYPES).filter(([name]) => !only || name === only);
  const collected: Row[] = [];
  for (const [type, def] of chosen) {
    console.log(`\n${def.label} (${type}) → ${def.collection}`);
    const found = await items(def.base);
    for (const item of found) collected.push(rowFor(type, def, item));
    console.log(`  ${found.length} items read`);
  }

  if (out) {
    fs.writeFileSync(out, `${JSON.stringify(collected, null, 1)}\n`);
    console.log(`\nwrote ${collected.length} records to ${out} — apply with --in=${out}`);
  } else if (dry) {
    console.log(`\nwould write ${collected.length} records`);
    console.log(JSON.stringify(collected[0], null, 1).slice(0, 700));
  } else {
    await apply(collected);
  }

  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
