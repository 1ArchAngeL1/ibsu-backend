/**
 * The last of ibsu.edu.ge's manageable content: its Pages, and the two page
 * types the old wp-admin keeps beside them.
 *
 *     set -a; source .env; set +a
 *     tsx tools/import-wp-pages.ts all --harvest=seed/wp --dry
 *     tsx tools/import-wp-pages.ts all --harvest=seed/wp
 *     tsx tools/import-wp-pages.ts pages --harvest=seed/wp --limit=5
 *     tsx tools/import-wp-pages.ts all --harvest=seed/wp --out=wp-pages.json
 *     tsx tools/import-wp-pages.ts --in=wp-pages.json       # where the database is
 *
 * Four earlier tools took the old site's posts, media, events and four of its
 * custom types. What they left behind is what the wp-admin sidebar lists
 * above all of them:
 *
 *     Pages          358 → `wpPages`
 *     Interc Pages     9 → `intercPages`
 *     IRO Pages        9 → `iroPages`
 *     Categories      +2 → the `categories` collection (17 on the old site
 *                          against the 15 seeded here; `books` files 17 posts
 *                          that until now pointed at a category with no row)
 *     Navigator tags  34 → `navigatorTags`, and onto the 59 navigator records
 *
 * The old site's five post *tags* are deliberately not among them. Every one
 * is attached to nothing (`count: 0`), and `post.tags` here already means
 * something else — the migrations write a provenance label into it
 * ("WordPress", "Newsroom stories"), which is what the admin's Type filter
 * reads. A Tags screen offering five empty terms that do not drive that
 * field would be a screen that lies. They are in `seed/wp/tags.json` if the
 * decision is ever revisited.
 *
 * ## Why a harvest directory rather than a fetch
 *
 * The old site will not be read in bulk twice. It answers a crawl of
 * `/wp-json/wp/v2/pages` with a *200 and an HTML block page* — not a 429, so
 * a reader that trusts the status code parses `<!DOCTYPE` as JSON and dies —
 * and it blocks per URL, so waiting does not clear it. Getting all 358 took
 * reading the list from both ends (the default order is id descending, so the
 * oldest came back from `order=asc`) and then naming the remainder one slug
 * at a time out of `page-sitemap1.xml` and `page-sitemap2.xml`.
 *
 * That harvest is checked in under `seed/wp`, and this reads it. `--fetch`
 * will go to the old site, politely, and is there for a re-run years from now
 * — but it is not how the 358 got here and should not be the first thing
 * tried. One page is missing from the harvest and known to be: `/quiz/`
 * never came back, and the site has its own quiz behind
 * /applicants/quiz.
 *
 * ## What lands in a record
 *
 * Not `content.rendered` as it arrives. A page body on the old site is the
 * page builder's shortcodes — or the HTML it generates, the site uses both —
 * wrapped in a breadcrumb trail, an inline stylesheet and a JSON-LD blob
 * that every `the_content` filter on the site has added. `cleanPageHtml` in
 * `wp-shortcodes.ts` takes that apart; read its header for what survives and
 * why. Media URLs are then rewritten to our bucket exactly as the posts were,
 * and only where we hold a mirrored copy.
 *
 * Nothing on the website renders these yet. They are the old pages, editable,
 * each with the path it had, so the content is here to be used rather than
 * only on a WordPress box nobody can log into.
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import { CategorySchema } from "../src/schemas/category.schema";
import { decode, fetchRetry, plain, sleep } from "./wp-common";
import { cleanPageHtml } from "./wp-shortcodes";
import { mirroredKeys, relinkText } from "./wp-relink";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const dry = args.includes("--dry");
const fetchLive = args.includes("--fetch");
const harvestDir = flag("harvest") ?? "seed/wp";
const limit = Number(flag("limit")) || Infinity;
const out = flag("out");
const from = flag("in");
const WP = "https://ibsu.edu.ge/wp-json/wp/v2";

/** What `all` means, and the order it runs in. */
const STEPS = ["pages", "interc", "iro", "taxonomies"] as const;
type Step = (typeof STEPS)[number];

const chosen: Step[] = args.includes("all")
  ? [...STEPS]
  : STEPS.filter((step) => args.includes(step));

/** The three page types, and the collection each becomes. */
const PAGE_TYPES: Record<string, { base: string; collection: string; label: string }> = {
  pages: { base: "pages", collection: "wpPages", label: "Pages" },
  interc: { base: "interc", collection: "intercPages", label: "Interc pages" },
  iro: { base: "iro", collection: "iroPages", label: "IRO pages" },
};

interface WpRendered {
  rendered: string;
}

interface WpPage {
  id: number;
  slug: string;
  link: string;
  date: string;
  modified?: string;
  parent?: number;
  template?: string;
  featured_media?: number;
  title: WpRendered;
  content: WpRendered;
  excerpt?: WpRendered;
}

interface WpTerm {
  id: number;
  slug: string;
  name: string;
  description?: string;
  count?: number;
  parent?: number;
}

interface Row {
  collection: string;
  key: string;
  order: number;
  data: Record<string, unknown>;
}

/** Georgian only, both languages the same: these pages have one. */
const both = (value: string) => ({ ka: value, en: value });

/** `https://ibsu.edu.ge/library/trainings/` -> `/library/trainings`, readable. */
function pathOf(link: string): string {
  try {
    const decoded = decodeURIComponent(new URL(link).pathname);
    return decoded.replace(/\/+$/, "") || "/";
  } catch {
    return link;
  }
}

/**
 * The opening of the text, where the old site wrote no excerpt.
 *
 * WordPress's own `excerpt.rendered` is only worth having when somebody
 * typed it. Where nobody did, WordPress generates one by trimming the *raw*
 * post — shortcodes and all — so the field arrives holding
 * `[vc_row type="full-width"][vc_column]…`, which is not a summary of
 * anything. A written excerpt is recognised by not containing the page
 * builder; everything else falls through to the cleaned body.
 */
function summaryOf(page: WpPage, body: string, max = 220): string {
  const written = plain(page.excerpt?.rendered ?? "");
  if (written && !/\[(?:\/)?vc_/.test(written)) return written;
  const text = plain(body);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return `${stop > max / 2 ? cut.slice(0, stop + 1) : cut.trimEnd()}…`;
}

function readHarvest<T>(name: string): T[] {
  const file = path.join(harvestDir, `${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `${file} is missing. The harvest of the old site lives in seed/wp; ` +
        `pass --harvest=<dir> or --fetch to read ibsu.edu.ge directly.`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
}

/**
 * The old site, read live. Slowly, and willing to give up on a page rather
 * than hammer it — see this file's header for what it does under load.
 */
async function fetchAll<T>(base: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page += 1) {
    const res = await fetchRetry(`${WP}/${base}?per_page=50&page=${page}`);
    if (res.status === 400) break;
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("json")) {
      console.warn(`\n  ! ${base} page ${page}: ${res.status} ${type.split(";")[0]} — stopping`);
      break;
    }
    const batch = (await res.json()) as T[];
    if (batch.length === 0) break;
    all.push(...batch);
    process.stdout.write(`\r  ${base}: ${all.length} fetched   `);
    if (batch.length < 50) break;
    await sleep(1500);
  }
  process.stdout.write("\n");
  return all;
}

const source = async <T>(name: string, base: string): Promise<T[]> =>
  fetchLive ? fetchAll<T>(base) : readHarvest<T>(name);

async function main(): Promise<void> {
  if (!chosen.length && !from) {
    console.log(`Nothing to do. Name a step — ${STEPS.join(", ")} — or "all".`);
    return;
  }

  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  /*
   * Untyped models, as the other migration tools take them. A document type
   * inferred from a Nest schema class does not satisfy `Model<unknown>` —
   * the shape `toBSON` returns differs — so the cast happens once here
   * rather than at every call that passes one on.
   */
  const model = <T>(name: string, schema: T): mongoose.Model<unknown> =>
    mongoose.model(name, schema as never) as unknown as mongoose.Model<unknown>;
  const Record = model("ContentRecord", ContentRecordSchema);
  const Media = model("MediaAsset", MediaAssetSchema);
  const Category = model("Category", CategorySchema);
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

  /** Already applied rows, from a run on another machine. */
  if (from) {
    const rows = JSON.parse(fs.readFileSync(from, "utf8")) as Row[];
    await apply(Record, rows);
    await mongoose.disconnect();
    return;
  }

  /*
   * What the bodies need before they are worth storing: which files we hold
   * (so a URL is only rewritten when the object is really in the bucket), and
   * what each WordPress attachment id is served at (so the image shortcodes,
   * which name their picture by id and nothing else, resolve to a file).
   */
  const mirrored = publicBase ? await mirroredKeys(Media) : new Set<string>();
  const byWpId = new Map<number, string>();
  for (const row of (await Media.find(
    { "wp.id": { $exists: true } },
    { "wp.id": 1, path: 1 },
  ).lean()) as { wp?: { id?: number }; path?: string }[]) {
    if (row.wp?.id && row.path) byWpId.set(row.wp.id, row.path);
  }
  console.log(
    `library: ${byWpId.size} attachments known by their old id, ` +
      `${mirrored.size} objects mirrored`,
  );

  const rows: Row[] = [];
  const report = { forms: 0, menus: 0, droppedImages: 0, relinked: 0, missed: new Set<string>() };

  for (const step of chosen) {
    if (step === "taxonomies") continue; // written straight, not as page rows
    const def = PAGE_TYPES[step];
    console.log(`\n${def.label} → ${def.collection}`);
    const pages = (await source<WpPage>(step, def.base)).slice(0, limit);
    const byId = new Map(pages.map((p) => [p.id, p]));

    for (const [index, page] of pages.entries()) {
      const clean = cleanPageHtml(page.content?.rendered ?? "", {
        imageUrl: (id) => byWpId.get(id) ?? null,
      });
      report.forms += clean.forms.length;
      report.menus += clean.menus;
      report.droppedImages += clean.dropped.filter((d) => d.startsWith("image ")).length;

      const relinked = relinkText(clean.html, mirrored, publicBase);
      report.relinked += relinked.replaced;
      for (const url of relinked.missed) report.missed.add(url);

      const body = relinked.text;
      const title = decode(page.title?.rendered ?? "") || `#${page.id}`;
      const cover = page.featured_media ? byWpId.get(page.featured_media) ?? null : null;
      const parent = page.parent && byId.has(page.parent) ? `wp-${page.parent}` : "";

      rows.push({
        collection: def.collection,
        key: `wp-${page.id}`,
        order: index,
        data: {
          id: `wp-${page.id}`,
          title: both(title),
          path: pathOf(page.link),
          parent,
          date: (page.date ?? "").slice(0, 10),
          /**
           * The old theme file that rendered it. Worth keeping because it is
           * what tells an archive shell from a page: eleven of the 358 are
           * `archive-*.php` or `single-*-post-template.php` and hold no text
           * of their own — WordPress filled them from a loop.
           */
          template: page.template ?? "",
          excerpt: both(summaryOf(page, body)),
          body: both(body),
          cover,
          source: page.link,
        },
      });
    }
    console.log(`  ${pages.length} read`);
  }

  if (chosen.includes("taxonomies")) {
    rows.push(...(await taxonomyRows()));
  }

  console.log(
    `\nbodies: ${report.relinked} media URLs moved to the bucket` +
      (report.missed.size ? `, ${report.missed.size} left on the old site (not mirrored)` : "") +
      (report.forms ? `, ${report.forms} forms removed` : "") +
      (report.menus ? `, ${report.menus} theme menus removed` : "") +
      (report.droppedImages ? `, ${report.droppedImages} images unresolved` : ""),
  );

  /**
   * The references still pointing at ibsu.edu.ge, for the rescuer.
   *
   * These are files the earlier migration never moved, because it mirrored
   * what the *posts* referenced and these are in pages. The URLs still work,
   * which is why they are left alone rather than rewritten to a 404 — but
   * they work only as long as the old box does, so the list is worth having
   * as the input to `rescue-wp-media.ts`.
   */
  const missedFile = flag("missed");
  if (missedFile && report.missed.size) {
    fs.writeFileSync(missedFile, `${[...report.missed].sort().join("\n")}\n`);
    console.log(`  the ${report.missed.size} left behind are listed in ${missedFile}`);
  }

  if (out) {
    fs.writeFileSync(out, `${JSON.stringify(rows, null, 1)}\n`);
    console.log(`wrote ${rows.length} rows to ${out} — apply with --in=${out}`);
  } else if (dry) {
    console.log(`\nwould write ${rows.length} records`);
    const byCollection: Record<string, number> = {};
    for (const row of rows) byCollection[row.collection] = (byCollection[row.collection] ?? 0) + 1;
    console.log(Object.entries(byCollection).map(([c, n]) => `  ${c}: ${n}`).join("\n"));
    console.log(`\n${JSON.stringify(rows[0], null, 1).slice(0, 900)}`);
  } else {
    await apply(Record, rows);
    if (chosen.includes("taxonomies")) {
      await applyCategories(Category);
      await tagNavigator(Record);
    }
  }

  await mongoose.disconnect();
}

/**
 * The navigator's own taxonomy: 34 terms, and the entry each one files.
 *
 * The terms are a collection of their own so they can be renamed, and the
 * names are written onto the navigator records as well — a tag an editor
 * cannot see on the thing it tags is not much of a tag. `navigator-tagged`
 * holds the join as the old site gave it: entry id to term ids.
 */
async function taxonomyRows(): Promise<Row[]> {
  console.log(`\nNavigator tags → navigatorTags`);
  const terms = await source<WpTerm>("navigator_tag", "navigator_tag");
  const rows: Row[] = terms.map((term, index) => ({
    collection: "navigatorTags",
    key: `wp-${term.id}`,
    order: index,
    data: {
      id: `wp-${term.id}`,
      name: both(decode(term.name)),
      slug: decodeURIComponent(term.slug),
      description: both(plain(term.description ?? "")),
      count: term.count ?? 0,
    },
  }));
  console.log(`  ${rows.length} terms read`);
  return rows;
}

/**
 * The tags onto the 59 navigator records that carry them.
 *
 * Stored as the terms' names rather than their ids, so the field reads as
 * what it is in the admin and on any page that comes to use it. The records
 * were imported before the taxonomy was, which is why this is a second pass
 * over them rather than part of writing them.
 */
async function tagNavigator(Record: mongoose.Model<unknown>): Promise<void> {
  const terms = await source<WpTerm>("navigator_tag", "navigator_tag");
  const name = new Map(terms.map((term) => [term.id, decode(term.name)]));
  const tagged = await source<{ id: number; navigator_tag?: number[] }>(
    "navigator-tagged",
    "ibsu-navigator?_fields=id,navigator_tag",
  );

  let written = 0;
  let absent = 0;
  for (const entry of tagged) {
    const names = (entry.navigator_tag ?? []).map((id) => name.get(id)).filter(Boolean);
    if (!names.length) continue;
    const result = await Record.updateOne(
      { collectionName: "navigator", key: `wp-${entry.id}` },
      { $set: { "data.tags": names } },
    );
    result.matchedCount ? (written += 1) : (absent += 1);
  }
  console.log(
    `navigator: tagged ${written} records` +
      (absent ? `, ${absent} entries have no record here` : ""),
  );
}

/**
 * The two categories the old site has and this database does not.
 *
 * Written to the `categories` collection rather than as records, because
 * that is where a post's categories come from. Existing rows are left
 * exactly as they are — the fifteen seeded here carry hand-written Georgian
 * and English names, and the old site has only the Georgian.
 */
async function applyCategories(Category: mongoose.Model<unknown>): Promise<void> {
  const terms = await source<WpTerm>("categories", "categories");
  const existing = new Set(
    ((await Category.find({}, { slug: 1 }).lean()) as unknown as { slug: string }[]).map(
      (c) => c.slug,
    ),
  );
  const missing = terms.filter((term) => !existing.has(term.slug));
  if (!missing.length) {
    console.log(`categories: all ${terms.length} already here`);
    return;
  }
  let order = existing.size;
  for (const term of missing) {
    const name = decode(term.name);
    await Category.create({
      slug: term.slug,
      name: { ka: name, en: name },
      parent: null,
      order: order++,
      description: { ka: plain(term.description ?? ""), en: "" },
    });
    console.log(`categories: added ${term.slug} (${name}, ${term.count ?? 0} posts)`);
  }
}

/**
 * Write the rows, matched on the old site's id.
 *
 * Re-running is safe and is the point: a record already here is refreshed
 * rather than duplicated, and nothing touches a record this tool did not
 * write — the key carries the old id (`wp-64628`).
 */
async function apply(Record: mongoose.Model<unknown>, rows: Row[]): Promise<void> {
  let made = 0;
  let changed = 0;
  for (const row of rows) {
    const result = await Record.updateOne(
      { collectionName: row.collection, key: row.key },
      {
        $set: { data: row.data, status: "published", publishedAt: new Date() },
        $setOnInsert: { collectionName: row.collection, key: row.key, order: row.order },
      },
      { upsert: true },
    );
    result.upsertedCount ? (made += 1) : (changed += 1);
  }
  const byCollection: Record<string, number> = {};
  for (const row of rows) byCollection[row.collection] = (byCollection[row.collection] ?? 0) + 1;
  console.log(
    `wrote ${rows.length} records: ${made} new, ${changed} updated ` +
      `(${Object.entries(byCollection).map(([c, n]) => `${c} ${n}`).join(", ")})`,
  );
}

void main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
