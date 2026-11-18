/**
 * Lecturer profiles out of the old WordPress site.
 *
 *     set -a; source .env; set +a
 *     tsx tools/import-lecturers.ts --dry --limit=3     # look before writing
 *     tsx tools/import-lecturers.ts --only=business
 *     tsx tools/import-lecturers.ts                     # all three schools
 *
 * Onto a server the old site refuses — ibsu.edu.ge answers 403 to the
 * tester VM — in two steps, reading there and writing here:
 *
 *     tsx tools/import-lecturers.ts --out=lecturers.json   # where it can read
 *     tsx tools/import-lecturers.ts --in=lecturers.json    # where it must write
 *
 * `--in` touches nothing but the database, so the same file can be applied
 * to a second environment and give the same rows.
 *
 * The roster migration took the names and ranks off the schools' lecturer
 * lists. This takes what is behind each name: the bio, the publications,
 * the courses taught, the email address.
 *
 * Only three of the five schools have anything to take. Computer Science
 * and the Medical School publish their lecturers as plain names with no
 * page behind them — their lecturers pages have no child pages at all — so
 * they keep the roster they already have, and this tool says so rather
 * than reporting them as empty.
 *
 * The profiles are pages, not a post type of their own, and WordPress
 * serves their content as unexpanded WPBakery shortcodes. So the source
 * here is the rendered HTML of each page, in both languages: the theme has
 * already turned the shortcodes into the tabs an editor arranged.
 *
 * Writes `staffProfiles` records, keyed by a slug made from the English
 * name — the shape /staff/<id> already reads. Nothing is deleted: a key
 * that exists is updated in place, so the three hand-made sample profiles
 * and any editing done in the admin survive a re-run.
 */
import fs from "node:fs";
import mongoose from "mongoose";
import slugify from "slugify";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";
import { decode, fetchRetry, plain, pool, sleep } from "./wp-common";

/** The app's school key, and the WordPress page whose children are its lecturers. */
const SCHOOLS: { school: string; parent: number; label: string }[] = [
  { school: "business", parent: 44545, label: "School of Business" },
  { school: "law", parent: 44255, label: "Law School" },
  { school: "eduhum", parent: 44573, label: "Education & Humanities" },
];

/** Lecturer pages exist for the three above; these two have none. */
const WITHOUT_PROFILES = [
  { school: "computing", parent: 44600, label: "Computer Science" },
  { school: "medicine", parent: 44636, label: "Medical School" },
];

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice("--limit=".length)) || Infinity;
const out = args.find((a) => a.startsWith("--out="))?.slice("--out=".length);
const from = args.find((a) => a.startsWith("--in="))?.slice("--in=".length);

interface Child {
  id: number;
  slug: string;
  link: string;
  title: string;
}

interface Profile {
  name: string;
  email: string | null;
  bio: string[];
  publications: { title: string; year: string | null; link: string | null }[];
  /** the course catalogue, each row under the degree it belongs to */
  courses: { course: string; level: string }[];
  /** "currently teaching", which the pages write as prose, not a list */
  current: string[];
  extra: string[];
}

/**
 * The placeholders the old site is full of: WPBakery's default text block,
 * left in the "additional information" tab of profile after profile, and
 * the theme's stand-in for a tab nobody filled. Neither is content, and
 * neither may reach the new site — an empty tab has to arrive as empty.
 */
const PLACEHOLDER =
  /I am text block\.|Lorem ipsum dolor sit amet|Empty section\.\s*Edit page|ცარიელი სექცია/i;

/** The degrees a course list groups itself by, in either language. */
const LEVELS =
  /^(ბაკალავრიატი|მაგისტრატურა|დოქტორანტურა|ბაკალავრიატი:|მაგისტრატურა:|დოქტორანტურა:|bachelor'?s?|master'?s?|doctoral|ph\.?d\.?|ba|ma)\s*:?\s*$/i;

/** One language's profile, as the rendered page gives it. */
export function parseProfile(html: string): Profile | null {
  const start = html.indexOf("single-personal");
  if (start < 0) return null;
  /**
   * Where the profile stops and the page furniture begins.
   *
   * Without a bound the last tab swallows the site footer — on one page
   * that is 3.6 kB of opening hours and quick links, on another it is the
   * copyright line, and either would be stored as the lecturer's
   * "additional information". The pages do not share one footer: the law
   * profiles have no `footer-row` and no contact widget, just a copyright
   * bar. So take whichever marker comes first.
   */
  const end = ["footer-row", "cs_contact_details_widget", 'class="copyright']
    .map((mark) => html.indexOf(mark, start))
    .filter((at) => at > start)
    .reduce((first, at) => Math.min(first, at), Infinity);
  // Cutting at a marker can land inside a tag, and half a tag survives
  // tag-stripping as text — one profile stored "<span" as its biography.
  const body = html
    .slice(start, Number.isFinite(end) ? end : start + 80_000)
    .replace(/<[^>]*$/, "");

  const bioAt = body.indexOf('class="bio');
  const bio = bioAt < 0 ? "" : body.slice(bioAt, bioAt + 4000);
  const name = plain((bio.match(/<h4[^>]*>([\s\S]*?)<\/h4>/) || [])[1] || "");
  const email = cfEmail((bio.match(/data-cfemail="([0-9a-f]+)"/) || [])[1]);

  const nav =
    (body.match(/<ul[^>]*class="[^"]*tabs_navigation[^"]*"[^>]*>([\s\S]*?)<\/ul>/) || [])[1] ?? "";
  const titles = [...nav.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map((m) => plain(m[1]));

  const marks = [...body.matchAll(/<div[^>]*class="[^"]*wpb_tab[^"]*"[^>]*>/g)].map(
    (m) => m.index as number,
  );
  const panes = marks.map((at, i) => body.slice(at, marks[i + 1] ?? body.length));

  const paneFor = (test: RegExp): string => {
    const at = titles.findIndex((title) => test.test(title));
    return at >= 0 ? panes[at] ?? "" : "";
  };

  const coursesPane = paneFor(/(course|კურს)/i);
  return {
    name,
    email,
    bio: paragraphs(paneFor(/^(about|შესახებ)/i)),
    publications: publications(paneFor(/(publicat|პუბლიკაც)/i)),
    courses: courses(column(coursesPane, /კატალოგი|catalog/i)),
    current: paragraphs(column(coursesPane, /მიმდინარე|current/i)),
    extra: paragraphs(paneFor(/(additional|დამატებით)/i)),
  };
}

/**
 * One of the two columns the courses tab is built from.
 *
 * They are told apart by their own heading — "currently teaching" beside
 * "the course catalogue" — because the theme leaves both headings in
 * Georgian even on the English page. Falls back to the whole tab for a
 * profile that only filled one column in.
 */
function column(pane: string, heading: RegExp): string {
  if (!pane) return "";
  const parts = pane.split(/<div[^>]*class="[^"]*cources[^"]*"[^>]*>/).slice(1);
  const found = parts.find((part) => {
    const title = (part.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/) || [])[1] ?? "";
    return heading.test(plain(title));
  });
  // The column's own heading is furniture. Left in, an otherwise empty
  // column arrives as a lecturer "currently teaching: Current lecture
  // courses".
  return (found ?? (parts.length > 0 ? "" : pane)).replace(
    /<h\d[^>]*>[\s\S]*?<\/h\d>/g,
    " ",
  );
}

/**
 * The catalogue list, each course under its degree.
 *
 * The degree headings are inside the list rather than above it: a `<strong>`
 * at the tail of the row before the group it opens, and sometimes a row of
 * its own. So a row contributes a course, a heading, or both — and the
 * heading it carries applies to what comes after it, not to itself.
 */
function courses(pane: string): { course: string; level: string }[] {
  if (!pane) return [];
  const out: { course: string; level: string }[] = [];
  let level = "";
  for (const row of [...pane.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1])) {
    const heads = [...row.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/g)].map((m) => plain(m[1]));
    const course = plain(row.replace(/<strong[^>]*>[\s\S]*?<\/strong>/g, " "));
    if (course && !LEVELS.test(course)) out.push({ course, level });
    const next = [...heads, course].find((text) => text && LEVELS.test(text));
    if (next) level = next.replace(/:\s*$/, "");
  }
  return out;
}

/** Cloudflare hides an address behind hex; the first byte is the key. */
function cfEmail(hex?: string): string | null {
  if (!hex) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(out) ? out : null;
}

/** A tab's prose, one entry per paragraph. */
function paragraphs(pane: string): string[] {
  if (!pane) return [];
  const keep = (text: string): boolean =>
    text.length > 1 && !PLACEHOLDER.test(text) && /[\p{L}\p{N}]/u.test(text.replace(/^<\w*/, ""));

  const found = [...pane.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => plain(m[1])).filter(keep);
  if (found.length > 0) return found;
  const whole = plain(pane);
  return keep(whole) ? [whole] : [];
}

/** Publications come as title / year / link inside one row. */
function publications(pane: string): Profile["publications"] {
  if (!pane) return [];
  return [...pane.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
    .map((m) => {
      const row = m[1];
      const spans = [...row.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
        .map((s) => plain(s[1]))
        .filter(Boolean);
      const link = (row.match(/<a[^>]*href="([^"]+)"/) || [])[1] ?? null;
      const year = spans.find((s) => /^(19|20)\d{2}$/.test(s)) ?? null;
      const title = (spans.find((s) => s !== year) ?? plain(row)).replace(/[,\s]+$/, "");
      return title ? { title, year, link } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

/** The English page of a Georgian one: ibsu.edu.ge/en/… */
const englishUrl = (link: string): string =>
  link.replace("https://ibsu.edu.ge/", "https://ibsu.edu.ge/en/");

async function children(parent: number): Promise<Child[]> {
  const out: Child[] = [];
  for (let page = 1; ; page += 1) {
    const res = await fetchRetry(
      `https://ibsu.edu.ge/wp-json/wp/v2/pages?parent=${parent}&per_page=100&page=${page}` +
        `&_fields=id,slug,link,title`,
    );
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`children of ${parent}: HTTP ${res.status}`);
    const batch = (await res.json()) as { id: number; slug: string; link: string; title: { rendered: string } }[];
    if (batch.length === 0) break;
    out.push(
      ...batch.map((p) => ({ id: p.id, slug: p.slug, link: p.link, title: decode(p.title.rendered) })),
    );
    if (batch.length < 100) break;
    await sleep(800);
  }
  return out;
}

async function page(url: string): Promise<Profile | null> {
  const res = await fetchRetry(url);
  if (!res.ok) return null;
  return parseProfile(await res.text());
}

/**
 * `Eka Devidze` → `eka-devidze`, and never two people on one key.
 *
 * `taken` holds only the names seen in *this* run. It must not be seeded
 * with the ids already in the database: those are these same people, and
 * treating them as taken gave everybody a `-2` the second time the import
 * ran — 116 duplicate profiles, and every faculty link pointing at
 * `/staff/lali-mikeladze-2`. A person's key has to come out of their name
 * alone, so that running this again updates them instead of copying them.
 */
function keyFor(english: string, georgian: string, taken: Set<string>): string {
  const base =
    slugify(english || "", { lower: true, strict: true }) ||
    slugify(georgian || "", { lower: true, strict: true }) ||
    "lecturer";
  let key = base;
  for (let n = 2; taken.has(key); n += 1) key = `${base}-${n}`;
  taken.add(key);
  return key;
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Record = mongoose.model("ContentRecord", ContentRecordSchema);

  /**
   * Writes one profile.
   *
   * `order` is set only on insert: a row an editor has already moved in
   * the admin keeps where they put it, and re-running this does not
   * shuffle the directory back.
   */
  const save = async (data: Record<string, unknown>, order: number): Promise<void> => {
    const key = data.id as string;
    await Record.updateOne(
      { collectionName: "staffProfiles", key },
      {
        $set: { data, status: "published", publishedAt: new Date() },
        $setOnInsert: { collectionName: "staffProfiles", key, order },
      },
      { upsert: true },
    );
  };

  /**
   * Applying a file read elsewhere. No network, no parsing — the rows are
   * already what the scrape decided, so this says the same thing twice in
   * two environments.
   */
  if (from) {
    const rows = JSON.parse(fs.readFileSync(from, "utf8")) as Record<string, unknown>[];
    if (!Array.isArray(rows) || rows.some((row) => typeof row.id !== "string")) {
      throw new Error(`${from} is not a list of profiles with ids.`);
    }
    console.log(`applying ${rows.length} profiles from ${from}`);
    for (const [i, data] of rows.entries()) await save(data, 100 + i);
    const total = await Record.countDocuments({ collectionName: "staffProfiles" });
    console.log(`staffProfiles now holds ${total} records`);
    await mongoose.disconnect();
    return;
  }

  /**
   * The roster the earlier migration left behind, to read a rank off.
   * The profile pages do not state one; the lists do.
   */
  const roster = await Record.find({ collectionName: "schoolFacultyRoster" }).lean().exec();
  const rankByName = new Map<string, { rank: string; note?: Record<string, string> }>();
  for (const row of roster) {
    const data = row.data as {
      name?: Record<string, string>;
      rank?: string;
      note?: Record<string, string>;
    };
    for (const locale of ["ka", "en"]) {
      const name = data.name?.[locale];
      if (name && data.rank) {
        rankByName.set(norm(name), { rank: data.rank, note: data.note });
      }
    }
  }

  // Names seen in this run only — see `keyFor`.
  const taken = new Set<string>();

  const chosen = SCHOOLS.filter((s) => !only || s.school === only);
  let written = 0;
  let matched = 0;
  const rows: Record<string, unknown>[] = [];

  for (const { school, parent, label } of chosen) {
    const list = (await children(parent)).slice(0, limit);
    console.log(`\n${label} (${school}): ${list.length} lecturer pages`);

    const parsed: { child: Child; ka: Profile | null; en: Profile | null }[] = [];
    await pool(list, 4, async (child, i) => {
      const [ka, en] = await Promise.all([page(child.link), page(englishUrl(child.link))]);
      parsed[i] = { child, ka, en };
      process.stdout.write(`\r  fetched ${parsed.filter(Boolean).length}/${list.length}   `);
      await sleep(400); // the old site is a shared host; do not lean on it
    });
    process.stdout.write("\n");

    for (const { child, ka, en } of parsed) {
      if (!ka && !en) {
        console.log(`  ! no profile block: ${child.link}`);
        continue;
      }
      const nameKa = ka?.name || child.title;
      const nameEn = en?.name || nameKa;
      const known = rankByName.get(norm(nameEn)) ?? rankByName.get(norm(nameKa));
      if (known) matched += 1;

      const id = keyFor(nameEn, nameKa, taken);
      const email = ka?.email ?? en?.email;
      /**
       * The field names are the content model's, not this tool's — see
       * `staffProfiles` in src/content-model/catalogue.ts. `schoolKey`
       * rather than `school`, which the model holds a display name in, and
       * the address inside `contact`, which the model already declares. A
       * field the model does not know is dropped the first time somebody
       * saves the record in the admin.
       */
      const data: Record<string, unknown> = {
        id,
        schoolKey: school,
        name: nameEn,
        nameka: nameKa,
        /** `head`, `professor`, … off the roster; absent when unmatched */
        ...(known?.rank ? { rank: known.rank } : {}),
        ...(known?.note ? { role: known.note.en ?? "", roleka: known.note.ka ?? "" } : {}),
        ...(email ? { contact: { email } } : {}),
        bio: pair(en?.bio ?? [], ka?.bio ?? []),
        pubs: pubs(en?.publications ?? [], ka?.publications ?? []),
        teaching: teaching(en?.courses ?? [], ka?.courses ?? []),
        current: pair(en?.current ?? [], ka?.current ?? []),
        extra: pair(en?.extra ?? [], ka?.extra ?? []),
        source: child.link,
      };
      rows.push(data);

      // `--out` collects the rows for another environment to apply; it is
      // a read of the old site, so it writes nothing here.
      if (!dry && !out) {
        await save(data, 100 + written);
      }
      written += 1;
    }
  }

  if (out) {
    fs.writeFileSync(out, `${JSON.stringify(rows, null, 1)}\n`);
    console.log(`\nwrote ${rows.length} profiles to ${out} — apply it with --in=${out}`);
  }

  console.log(
    `\n${dry || out ? "read" : "wrote"} ${written} profiles; ` +
      `${matched} matched a roster rank`,
  );
  for (const { school, label } of WITHOUT_PROFILES) {
    console.log(`  (${label} / ${school}: the old site has no lecturer pages — roster only)`);
  }

  if (dry) {
    console.log("\n--- first profile, as it would be stored ---");
    console.log(JSON.stringify(rows[0], null, 1));
    const empty = rows.filter((r) => (r.bio as unknown[]).length === 0);
    console.log(`\n--- ${empty.length} with no bio; the first few, to check against the source ---`);
    for (const row of empty.slice(0, 8)) console.log(`  ${row.id as string}  ${row.source as string}`);
    const missing = empty.length;
    const noEmail = rows.filter((r) => !(r.contact as { email?: string } | undefined)?.email).length;
    console.log(
      `\n${rows.length} parsed · ${missing} with no bio · ${noEmail} with no email · ` +
        `${rows.filter((r) => (r.pubs as unknown[]).length > 0).length} with publications · ` +
        `${rows.filter((r) => (r.teaching as unknown[]).length > 0).length} with courses`,
    );
  }

  await mongoose.disconnect();
}

/** Two languages of the same list, lined up by position. */
function pair(en: string[], ka: string[]): { en: string; ka: string }[] {
  const n = Math.max(en.length, ka.length);
  return Array.from({ length: n }, (_, i) => ({ en: en[i] ?? ka[i] ?? "", ka: ka[i] ?? en[i] ?? "" }));
}

/** The catalogue in both languages, in the shape /staff/<id> reads. */
function teaching(
  en: { course: string; level: string }[],
  ka: { course: string; level: string }[],
): { c: string; cka: string; lvl: string; lvlka: string }[] {
  const n = Math.max(en.length, ka.length);
  return Array.from({ length: n }, (_, i) => {
    const e = en[i] ?? ka[i];
    const k = ka[i] ?? en[i];
    return {
      c: e?.course ?? "",
      cka: k?.course ?? e?.course ?? "",
      lvl: e?.level ?? "",
      lvlka: k?.level ?? e?.level ?? "",
    };
  });
}

function pubs(
  en: Profile["publications"],
  ka: Profile["publications"],
): { y: string; t: string; tka: string; url: string | null }[] {
  const n = Math.max(en.length, ka.length);
  return Array.from({ length: n }, (_, i) => {
    const e = en[i] ?? ka[i];
    const k = ka[i] ?? en[i];
    return {
      y: e?.year ?? k?.year ?? "",
      t: e?.title ?? "",
      tka: k?.title ?? e?.title ?? "",
      url: e?.link ?? k?.link ?? null,
    };
  });
}

/** Names differ by title, spacing and case between the lists and the pages. */
function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/(prof\.?|assoc\.?|assistant|dr\.?|ms\.?|mr\.?|პროფ\.?|ასოც\.?|დოქტ\.?)/g, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

void main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
