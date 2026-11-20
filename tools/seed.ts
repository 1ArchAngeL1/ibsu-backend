/**
 * Loads the extracted content into Mongo.
 *
 * Run after `npm run extract` and the inference step:
 *
 *     npm run extract && tsx tools/infer-content-model.ts && npm run seed
 *
 * Everything is upserted by its natural key, so running it twice does no
 * harm. What it will do on a second run is overwrite content in Mongo with
 * what came out of the repo — which is right the first time and wrong once
 * editors have been working. Pass `--only=copy` or `--only=records` to
 * narrow it, and `--dry` to see what it would touch.
 *
 * Records land published. This is a migration of content that is already
 * live on the site; staging it as drafts would take 112 pages down until
 * somebody clicked publish 71 times.
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";
import { CopyEntrySchema } from "../src/schemas/copy-entry.schema";
import { MIGRATION } from "./migration-map";

const BACKEND = path.resolve(__dirname, "..");
const RECORDS_DIR = path.join(BACKEND, "seed", "records");
const COPY_DIR = path.join(BACKEND, "seed", "copy");

const LOCALES = ["ka", "en"] as const;
type Locale = (typeof LOCALES)[number];

interface SeedRecord {
  key: string;
  order: number;
  data: Record<string, unknown>;
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);

/* ------------------------------------------------------------------ copy */

type MessageTree = { [key: string]: string | MessageTree };

/** `pages.aboutMission.values.intro` and the string at the end of it. */
function flatten(tree: MessageTree, trail: string[] = []): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const here = [...trail, key];
    if (typeof value === "string") out.set(here.join("."), value);
    else for (const [k, v] of flatten(value, here)) out.set(k, v);
  }
  return out;
}

/**
 * Which screen in the admin a key belongs on.
 *
 * Page copy is already filed under `pages.<pageKey>`, which is one screen
 * per page and exactly what an editor wants. Everything else — the menu,
 * the footer, the shared bands — groups under its first segment.
 */
function namespaceOf(path: string): string {
  const parts = path.split(".");
  if (parts[0] === "pages" && parts.length > 1) return `pages.${parts[1]}`;
  return parts[0];
}

/** `{count}` and `{name}`, which every translation has to keep. */
function placeholdersIn(value: string): string[] {
  return [...new Set([...value.matchAll(/\{(\w+)[^}]*\}/g)].map((m) => m[1]))];
}

async function seedCopy(): Promise<void> {
  const CopyEntry = mongoose.model("CopyEntry", CopyEntrySchema);

  const trees = new Map<Locale, Map<string, string>>();
  for (const locale of LOCALES) {
    const file = path.join(COPY_DIR, `messages.${locale}.json`);
    if (!fs.existsSync(file)) throw new Error(`no extracted messages at ${file}`);
    trees.set(locale, flatten(JSON.parse(fs.readFileSync(file, "utf8")) as MessageTree));
  }

  const paths = new Set<string>();
  for (const tree of trees.values()) for (const key of tree.keys()) paths.add(key);

  const operations = [];
  let onlyKa = 0;
  let onlyEn = 0;

  for (const messagePath of [...paths].sort()) {
    const values: Record<string, string> = {};
    for (const locale of LOCALES) {
      const value = trees.get(locale)!.get(messagePath);
      if (value !== undefined) values[locale] = value;
    }
    if (values.ka === undefined) onlyEn += 1;
    if (values.en === undefined) onlyKa += 1;

    const sample = values.ka ?? values.en ?? "";
    operations.push({
      updateOne: {
        filter: { path: messagePath },
        update: {
          $set: {
            path: messagePath,
            namespace: namespaceOf(messagePath),
            values,
            placeholders: placeholdersIn(sample),
            multiline: sample.includes("\n") || sample.length > 120,
          },
          $setOnInsert: { draft: null },
        },
        upsert: true,
      },
    });
  }

  console.log(
    `copy: ${operations.length} keys  (${onlyKa} Georgian only, ${onlyEn} English only)`,
  );
  if (dry) return;
  for (let i = 0; i < operations.length; i += 500) {
    await CopyEntry.bulkWrite(operations.slice(i, i + 500));
  }
}

/* --------------------------------------------------------------- records */

async function seedRecords(): Promise<void> {
  const ContentRecord = mongoose.model("ContentRecord", ContentRecordSchema);
  const now = new Date();
  let total = 0;

  /**
   * The migration's collections, and any seed file beside them that the
   * migration never produced.
   *
   * `MIGRATION` describes where each collection came *from* in the old
   * `src/data`, so a collection declared by hand — EXTRA_COLLECTIONS in
   * the content model, whose content was never in a module — has no entry
   * there and would never be loaded. The seed file is the only record of
   * it, so the directory is what decides, not the map.
   */
  const extra = fs
    .readdirSync(RECORDS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length))
    .filter((collection) => !MIGRATION.some((entry) => entry.collection === collection))
    .map((collection) => ({ collection }));

  for (const entry of [...MIGRATION, ...extra]) {
    const file = path.join(RECORDS_DIR, `${entry.collection}.json`);
    if (!fs.existsSync(file)) {
      console.log(`  --    ${entry.collection.padEnd(24)} no seed file; skipped`);
      continue;
    }
    const records = JSON.parse(fs.readFileSync(file, "utf8")) as SeedRecord[];
    total += records.length;
    console.log(`  ok    ${entry.collection.padEnd(24)} ${records.length}`);
    if (dry) continue;

    await ContentRecord.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { collectionName: entry.collection, key: record.key },
          update: {
            $set: {
              collectionName: entry.collection,
              key: record.key,
              order: record.order,
              data: record.data,
              status: "published",
              publishedAt: now,
            },
            // Never clobber an editor's unpublished work on a re-run.
            $setOnInsert: { draft: null },
          },
          upsert: true,
        },
      })),
    );
  }
  console.log(`records: ${total} rows across ${MIGRATION.length + extra.length} collections`);
}

/* ------------------------------------------------------------------ main */

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  console.log(`connected to ${uri}${dry ? "  (dry run; nothing will be written)" : ""}\n`);

  try {
    if (!only || only === "copy") await seedCopy();
    if (!only || only === "records") await seedRecords();
  } finally {
    await mongoose.disconnect();
  }
  console.log("\ndone.");
}

void main().catch((error: Error) => {
  console.error(`seed failed: ${error.message}`);
  process.exit(1);
});
