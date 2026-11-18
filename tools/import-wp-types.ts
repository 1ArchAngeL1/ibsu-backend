/**
 * The old site's own post types, as posts here.
 *
 *     set -a; source .env; set +a
 *     tsx tools/import-wp-types.ts --dry --limit=3
 *     tsx tools/import-wp-types.ts --only=announcements
 *     tsx tools/import-wp-types.ts --out=wp-types.json   # where the old site answers
 *     tsx tools/import-wp-types.ts --in=wp-types.json    # where the database lives
 *
 * ibsu.edu.ge keeps six post types of its own beside ordinary posts. One of
 * them — student-experiences — was migrated already, into the `experiences`
 * collection. Three more are plain dated articles with an HTML body, which
 * is what a post is here, so they arrive as posts under a category of their
 * own: announcements, vacancies, and the programme navigator.
 *
 * Posts rather than a collection each, because this CMS says content is a
 * post placed by category, and because it buys the whole editor — search,
 * drafts, the trash, scheduling — instead of three bespoke record forms.
 *
 * The remaining two (interc, iro) are WPBakery shortcode pages whose text
 * lives only in the rendered HTML; they are not handled here.
 *
 * Nothing is deleted and nothing already written is overwritten blindly:
 * a post is matched by the source id it came from, so a second run updates
 * the same row and an editor's own posts are never touched.
 */
import fs from "node:fs";
import mongoose from "mongoose";
import { PostSchema } from "../src/schemas/post.schema";
import { CategorySchema } from "../src/schemas/category.schema";
import { decode, fetchRetry, keyFor, plain, publicUrl, sleep } from "./wp-common";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";

interface TypeDef {
  /** the REST base on the old site */
  base: string;
  /** the category these posts are placed in here */
  category: string;
  title: { ka: string; en: string };
  description: { ka: string; en: string };
}

const TYPES: Record<string, TypeDef> = {
  announcements: {
    base: "announcements",
    category: "announcements",
    title: { ka: "განცხადებები", en: "Announcements" },
    description: {
      ka: "უნივერსიტეტის განცხადებები — ძველი საიტიდან გადმოტანილი.",
      en: "University announcements, carried over from the old site.",
    },
  },
  vacancy: {
    base: "vacancy",
    category: "vacancies-wp",
    title: { ka: "ვაკანსიები", en: "Vacancies" },
    description: {
      ka: "აკადემიური და ადმინისტრაციული კონკურსები.",
      en: "Academic and administrative competitions.",
    },
  },
  "ibsu-navigator": {
    base: "ibsu-navigator",
    category: "ibsu-navigator",
    title: { ka: "IBSU ნავიგატორი", en: "IBSU navigator" },
    description: {
      ka: "პროგრამების გზამკვლევი — რატომ ამ პროგრამას.",
      en: "The programme guide: why this programme.",
    },
  },
};

const args = process.argv.slice(2);
const dry = args.includes("--dry");
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
 * The lede, where the old site never wrote one.
 *
 * These types have an empty excerpt to a one. The first sentences of the
 * body are a truer summary than nothing at all, and the editor can replace
 * it — it is a field in the post editor like any other.
 */
function excerptOf(item: WpItem): string {
  const written = plain(item.excerpt?.rendered ?? "");
  if (written) return written;
  const text = plain(item.content?.rendered ?? "");
  if (text.length <= 220) return text;
  const cut = text.slice(0, 220);
  const stop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return `${stop > 120 ? cut.slice(0, stop + 1) : cut.trimEnd()}…`;
}

/**
 * The slug a post gets.
 *
 * WordPress percent-encodes a Georgian title into its URL, so the slug
 * arrives as `%e1%83%a1...` — unreadable in a URL bar and in the admin's
 * own list. The post id from the old site keeps it short, stable and
 * unique, and the readable name is the title.
 */
const slugFor = (type: string, item: WpItem): string => `${type}-${item.id}`;

function postFor(type: string, def: TypeDef, item: WpItem): Record<string, unknown> {
  const title = decode(item.title?.rendered ?? "") || `#${item.id}`;
  const body = item.content?.rendered ?? "";
  const excerpt = excerptOf(item);
  const cover = item._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

  return {
    slug: slugFor(type, item),
    /**
     * The same text in both languages. These types exist only in Georgian
     * on the old site — the REST API returns the Georgian record whatever
     * language is asked for — and the earlier student-experiences
     * migration made the same choice rather than leaving English blank.
     */
    title: { ka: title, en: title },
    excerpt: { ka: excerpt, en: excerpt },
    body: { ka: body, en: body },
    cover,
    categories: [def.category],
    tags: [],
    status: "published",
    publishedAt: item.date ? new Date(item.date) : null,
    /**
     * The shape `source` already has — which collection a migrated post
     * came from, its key there, and the original data kept whole. The
     * "collection" here is the old site's post type, so a row says plainly
     * that it came from ibsu.edu.ge rather than from a records collection.
     */
    source: {
      collection: `wp:${type}`,
      key: String(item.id),
      label: def.title.en,
      data: { id: item.id, slug: item.slug, link: item.link, date: item.date },
    },
  };
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Post = mongoose.model("Post", PostSchema);
  const Category = mongoose.model("Category", CategorySchema);

  /** The category a type's posts are filed under, made if it is not there. */
  const ensureCategory = async (def: TypeDef): Promise<void> => {
    const existing = await Category.findOne({ slug: def.category }).exec();
    if (existing) return;
    await Category.create({
      slug: def.category,
      name: def.title,
      description: def.description,
    });
    console.log(`  created the category "${def.category}"`);
  };

  const Media = mongoose.model("MediaAsset", MediaAssetSchema);
  const base = process.env.R2_PUBLIC_BASE_URL;

  /**
   * A cover on the bucket rather than on the old site.
   *
   * The featured image arrives as an ibsu.edu.ge upload URL. The media
   * migration already mirrored those files, so pointing at the mirror
   * keeps the new site off the old one — which will not be there for
   * ever, and is slower than the bucket while it is.
   *
   * Resolved here rather than when the old site was read, because which
   * files are mirrored is a property of the database being written: the
   * production media library holds them, a local one may not.
   */
  const relink = async (cover: unknown): Promise<string | null> => {
    if (typeof cover !== "string" || !cover) return null;
    if (!base) return cover;
    const key = keyFor(cover);
    if (!key) return cover;
    const mirrored = publicUrl(base, key);
    const known = await Media.exists({ path: mirrored });
    return known ? mirrored : cover;
  };

  const save = async (row: Record<string, unknown>): Promise<"new" | "updated"> => {
    row.cover = await relink(row.cover);
    // The slug is built from the old site's id, so finding by slug is
    // finding by origin — no second lookup, and no way to make a duplicate
    // of a post this tool has already written.
    const existing = await Post.findOne({ slug: String(row.slug) }).exec();
    if (existing) {
      // An editor may have rewritten the post here; only what the old site
      // is the authority on is refreshed.
      existing.set({
        title: row.title,
        body: row.body,
        cover: row.cover,
        publishedAt: row.publishedAt,
        source: row.source,
      });
      await existing.save();
      return "updated";
    }
    await Post.create(row);
    return "new";
  };

  if (from) {
    const rows = JSON.parse(fs.readFileSync(from, "utf8")) as {
      categories: TypeDef[];
      posts: Record<string, unknown>[];
    };
    for (const def of rows.categories) await ensureCategory(def);
    let made = 0;
    let changed = 0;
    for (const row of rows.posts) {
      (await save(row)) === "new" ? (made += 1) : (changed += 1);
    }
    console.log(`applied ${rows.posts.length} posts from ${from}: ${made} new, ${changed} updated`);
    await mongoose.disconnect();
    return;
  }

  const chosen = Object.entries(TYPES).filter(([name]) => !only || name === only);
  const collected: Record<string, unknown>[] = [];
  const used: TypeDef[] = [];

  for (const [type, def] of chosen) {
    console.log(`\n${def.title.en} (${type})`);
    const found = await items(def.base);
    used.push(def);
    for (const item of found) collected.push(postFor(type, def, item));
    console.log(`  ${found.length} items read`);
  }

  if (out) {
    fs.writeFileSync(out, `${JSON.stringify({ categories: used, posts: collected }, null, 1)}\n`);
    console.log(`\nwrote ${collected.length} posts to ${out} — apply with --in=${out}`);
  } else if (dry) {
    console.log(`\nwould write ${collected.length} posts`);
    console.log(JSON.stringify(collected[0], null, 1).slice(0, 900));
  } else {
    for (const def of used) await ensureCategory(def);
    let made = 0;
    let changed = 0;
    for (const row of collected) {
      (await save(row)) === "new" ? (made += 1) : (changed += 1);
    }
    console.log(`\nwrote ${collected.length} posts: ${made} new, ${changed} updated`);
  }

  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
