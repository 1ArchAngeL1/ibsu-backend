/**
 * Puts the school pages' contact lines into a database that already has
 * content in it.
 *
 *     npx tsx tools/apply-school-contact.ts [--dry]
 *
 * Against the database in `MONGO_URI`, or the one the API's own `.env`
 * names — not whatever is on the default port, which on a shared box is
 * somebody else's.
 *
 * Each school page now prints its office's email, extension, address and
 * room in the sidebar card, from this directory's own row for the school.
 * That needs two things in the database the website builds against: six
 * new copy keys, and the room (and Law's extension) on the five school
 * rows — see seed/copy/messages.*.json and seed/records/departments.json,
 * which this reads rather than spelling the values a second time.
 *
 * `npm run seed` would do it, and would also overwrite every other key and
 * record with whatever the repo last committed; on a database editors have
 * been working in that is the wrong trade. This writes the six paths and
 * the four fields and nothing else, and says what it changed. Running it
 * twice changes nothing the second time.
 *
 * Afterwards restart the API — the assembled message tree is cached in
 * memory (see CopyService) and a write that goes round the service does
 * not drop it.
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const BACKEND = path.resolve(__dirname, "..");
const LOCALES = ["ka", "en"] as const;
const dry = process.argv.slice(2).includes("--dry");

/** The copy the school page's contact block asks for, all of it. */
const COPY_PREFIX = "pages.schoolPages.contact";

/** The directory rows the school pages read, and the fields they gained. */
const FIELDS = ["room", "ext"] as const;
const SCHOOLS = ["business", "eduhum", "law", "computing", "medicine"];

type Tree = { [key: string]: string | Tree };

function at(tree: Tree, trail: string[]): Tree | undefined {
  let here: Tree | string | undefined = tree;
  for (const step of trail) {
    if (typeof here !== "object" || here === null) return undefined;
    here = here[step];
  }
  return typeof here === "object" ? here : undefined;
}

function readJson<T>(...where: string[]): T {
  return JSON.parse(fs.readFileSync(path.join(BACKEND, ...where), "utf8")) as T;
}

/**
 * Where the database is: `MONGO_URI`, or the API's own `.env` beside this.
 *
 * The other tools here are run next to a development database on the
 * default port. This one is run against a deployment's, which is the one
 * place its port and name are already written down — on the tester VM the
 * API's Mongo is not on 27017, and a tool that quietly wrote to whatever
 * answers there would be writing to somebody else's database.
 */
function setting(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const env = path.join(BACKEND, ".env");
  if (!fs.existsSync(env)) return undefined;
  for (const line of fs.readFileSync(env, "utf8").split("\n")) {
    const match = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`).exec(line);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

function mongoUri(): string {
  return setting("MONGO_URI") ?? "mongodb://127.0.0.1:27017/ibsu";
}

/**
 * Tells the website that what it has cached is out of date.
 *
 * Everything the admin saves goes through PublishService, which posts the
 * collection's cache tags to the site; a tool that writes to Mongo behind
 * it does not, and the site goes on serving what it built. Worse, it is
 * not only the running server: a deploy reuses the cached fetches too, so
 * a fresh build can prerender yesterday's content and look like a bad
 * deploy rather than a missing revalidation. Ask for `cms:copy` and
 * `cms:departments` — the same two tags publishing these would.
 *
 * Logged and not thrown, as PublishService does it: the content is
 * written either way, and a site that cannot be reached from here is for
 * whoever runs this to sort out.
 */
async function revalidate(): Promise<void> {
  const url = setting("SITE_REVALIDATE_URL") ?? "http://localhost:3000/api/revalidate";
  const secret = setting("REVALIDATE_SECRET");
  const tags = ["cms:copy", "cms:departments"];
  if (!secret) {
    console.log(`\nno REVALIDATE_SECRET here; ask the site for ${tags.join(", ")} yourself.`);
    return;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    });
    console.log(
      response.ok
        ? `\nrevalidated ${tags.join(", ")}`
        : `\nthe site refused the revalidation (${response.status}); ask it for ${tags.join(", ")} yourself.`,
    );
  } catch (error) {
    console.log(
      `\ncould not reach ${url} to revalidate: ${(error as Error).message}` +
        `\nask the site for ${tags.join(", ")} yourself.`,
    );
  }
}

/**
 * The URI with its password taken out, for printing.
 *
 * A deployment's `.env` holds a user and password, and this prints where
 * it connected so the operator can see it is the right database. Those
 * two things together would put the password in a terminal log.
 */
function safe(uri: string): string {
  return uri.replace(/\/\/([^/@]*)@/, (_match, credentials: string) => {
    const user = credentials.split(":")[0];
    return `//${user}:***@`;
  });
}

async function main(): Promise<void> {
  const uri = mongoUri();
  await mongoose.connect(uri);
  console.log(`connected to ${safe(uri)}${dry ? "  (dry run; nothing written)" : ""}\n`);

  /* ----------------------------------------------------------- the copy */

  const leaves = new Map<string, Record<string, string>>();
  for (const locale of LOCALES) {
    const tree = readJson<Tree>("seed", "copy", `messages.${locale}.json`);
    const block = at(tree, COPY_PREFIX.split("."));
    if (!block) throw new Error(`no ${COPY_PREFIX} in messages.${locale}.json`);
    for (const [leaf, value] of Object.entries(block)) {
      if (typeof value !== "string") continue;
      const values = leaves.get(leaf) ?? {};
      values[locale] = value;
      leaves.set(leaf, values);
    }
  }

  const copy = mongoose.connection.collection("copy");
  for (const [leaf, values] of [...leaves].sort()) {
    const docPath = `${COPY_PREFIX}.${leaf}`;
    const existing = await copy.findOne({ path: docPath });
    const already =
      existing && LOCALES.every((l) => (existing.values as Record<string, string>)?.[l] === values[l]);
    console.log(`copy    ${docPath.padEnd(40)} ${already ? "already there" : existing ? "updated" : "added"}`);
    if (dry || already) continue;
    await copy.updateOne(
      { path: docPath },
      {
        $set: {
          path: docPath,
          namespace: "pages.schoolPages",
          values,
          placeholders: [],
          multiline: false,
          updatedAt: new Date(),
        },
        $setOnInsert: { draft: null, createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  /* -------------------------------------------------------- the offices */

  type SeedRecord = { key: string; data: Record<string, unknown> };
  const seeded = readJson<SeedRecord[]>("seed", "records", "departments.json");
  const records = mongoose.connection.collection("records");

  console.log();
  for (const school of SCHOOLS) {
    const row = seeded.find((r) => r.data.id === school);
    if (!row) {
      console.log(`office  ${school.padEnd(40)} not in the seed file; skipped`);
      continue;
    }
    const live = await records.findOne({ collectionName: "departments", key: row.key });
    if (!live) {
      console.log(`office  ${school.padEnd(40)} no row in this database; skipped`);
      continue;
    }

    const set: Record<string, unknown> = {};
    for (const field of FIELDS) {
      const value = row.data[field];
      const current = (live.data as Record<string, unknown>)?.[field];
      if (typeof value === "string" && current !== value) set[`data.${field}`] = value;
    }
    const changed = Object.keys(set);
    console.log(
      `office  ${school.padEnd(40)} ${
        changed.length === 0
          ? "already there"
          : changed.map((k) => `${k.slice(5)}=${String(set[k])}`).join(", ")
      }`,
    );
    if (dry || changed.length === 0) continue;
    await records.updateOne({ _id: live._id }, { $set: { ...set, updatedAt: new Date() } });
  }

  await mongoose.disconnect();
  if (dry) {
    console.log("\ndry run; nothing written.");
    return;
  }
  await revalidate();
  console.log("\ndone — restart the API so it rebuilds its cached message tree.");
}

void main().catch((error: Error) => {
  console.error(`apply-school-contact failed: ${error.message}`);
  process.exit(1);
});
