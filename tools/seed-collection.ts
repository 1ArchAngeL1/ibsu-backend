/**
 * Loads one collection's seed file into a database that already has
 * content in it.
 *
 *     npx tsx tools/seed-collection.ts <collection> [--dry]
 *
 * Against the database in `MONGO_URI`, or the one the API's own `.env`
 * names — not whatever is on the default port, which on a shared box is
 * somebody else's.
 *
 * `npm run seed --only=records` does this for all 75 collections at once,
 * and would overwrite every one of them with whatever the repo last
 * committed. That is right the first time and wrong once editors have
 * been working: shipping a new collection should not cost somebody else
 * their afternoon's edits to a different one. This touches the one named
 * and says what it changed. Running it twice changes nothing the second
 * time.
 *
 * It asks the website to drop that collection's cache afterwards, which
 * is what publishing in the admin would have done — without it the site
 * serves what it has, and the next deploy reuses its cached fetches and
 * prerenders the old content too.
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { COLLECTIONS } from "../src/content-model/catalogue";

const BACKEND = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const name = args.find((arg) => !arg.startsWith("--"));

interface SeedRecord {
  key: string;
  order: number;
  data: Record<string, unknown>;
}

function setting(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  const env = path.join(BACKEND, ".env");
  if (!fs.existsSync(env)) return undefined;
  for (const line of fs.readFileSync(env, "utf8").split("\n")) {
    const match = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`).exec(line);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

/** The URI with its password taken out, for printing. */
function safe(uri: string): string {
  return uri.replace(/\/\/([^/@]*)@/, (_match, credentials: string) => {
    return `//${credentials.split(":")[0]}:***@`;
  });
}

/**
 * Tells the website that what it has cached is out of date — the
 * collection's own tag and the ones the content model lists beside it,
 * exactly as PublishService does on a publish.
 */
async function revalidate(collection: string, tags: string[]): Promise<void> {
  const url = setting("SITE_REVALIDATE_URL") ?? "http://localhost:3000/api/revalidate";
  const secret = setting("REVALIDATE_SECRET");
  const all = [`cms:${collection}`, ...tags.map((tag) => `cms:${tag}`)];
  if (!secret) {
    console.log(`\nno REVALIDATE_SECRET here; ask the site for ${all.join(", ")} yourself.`);
    return;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags: all }),
      signal: AbortSignal.timeout(5000),
    });
    console.log(
      response.ok
        ? `\nrevalidated ${all.join(", ")}`
        : `\nthe site refused the revalidation (${response.status}); ask it for ${all.join(", ")} yourself.`,
    );
  } catch (error) {
    console.log(
      `\ncould not reach ${url} to revalidate: ${(error as Error).message}` +
        `\nask the site for ${all.join(", ")} yourself.`,
    );
  }
}

async function main(): Promise<void> {
  if (!name) {
    console.error("usage: tsx tools/seed-collection.ts <collection> [--dry]");
    process.exit(2);
  }
  const declared = COLLECTIONS.find((collection) => collection.name === name);
  if (!declared) {
    console.error(
      `the content model has no collection called '${name}'. ` +
        `Declare it before seeding it, or the admin cannot edit what this writes.`,
    );
    process.exit(2);
  }
  const file = path.join(BACKEND, "seed", "records", `${name}.json`);
  if (!fs.existsSync(file)) {
    console.error(`no seed file at seed/records/${name}.json`);
    process.exit(2);
  }
  const seeded = JSON.parse(fs.readFileSync(file, "utf8")) as SeedRecord[];

  const uri = setting("MONGO_URI") ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  console.log(`connected to ${safe(uri)}${dry ? "  (dry run; nothing written)" : ""}\n`);

  const records = mongoose.connection.collection("records");
  const now = new Date();
  let written = 0;

  for (const record of seeded) {
    const live = await records.findOne({ collectionName: name, key: record.key });
    const same = live && JSON.stringify(live.data) === JSON.stringify(record.data);
    console.log(`${name}  ${record.key.padEnd(28)} ${same ? "already there" : live ? "updated" : "added"}`);
    if (dry || same) continue;
    written += 1;
    await records.updateOne(
      { collectionName: name, key: record.key },
      {
        $set: {
          collectionName: name,
          key: record.key,
          order: record.order,
          data: record.data,
          status: "published",
          publishedAt: now,
          updatedAt: now,
        },
        // Never clobber an editor's unpublished work on a re-run.
        $setOnInsert: { draft: null, createdAt: now },
      },
      { upsert: true },
    );
  }

  await mongoose.disconnect();
  if (dry) {
    console.log("\ndry run; nothing written.");
    return;
  }
  if (written > 0) await revalidate(name, declared.tags);
  else console.log("\nnothing changed, so nothing to revalidate.");
}

void main().catch((error: Error) => {
  console.error(`seed-collection failed: ${error.message}`);
  process.exit(1);
});
