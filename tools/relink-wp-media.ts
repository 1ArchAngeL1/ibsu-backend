/**
 * Points the content at our own copies of the pictures.
 *
 * The last stage, and the one that actually saves the posts: every
 * ibsu.edu.ge upload URL written anywhere in the database is rewritten to the
 * bucket URL its file was mirrored to. A post keeps its pictures — the same
 * pictures, in the same places, at the same widths — and stops fetching a
 * single byte from the old WordPress server.
 *
 *     set -a; source .env; set +a
 *     tsx tools/relink-wp-media.ts --dry-run    # count what would change
 *     tsx tools/relink-wp-media.ts              # do it
 *
 * Only URLs whose file is provably in the bucket are rewritten; anything
 * WordPress has itself lost is left pointing where it points, and listed at
 * the end. Idempotent: a relinked URL is no longer a WordPress URL, so a
 * second run finds nothing to do.
 *
 * A post's `source.data` is never touched. That is the record of where the
 * post came from, and it should go on saying ibsu.edu.ge.
 */
import mongoose from "mongoose";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import { env, r2 } from "./wp-common";
import { mirroredKeys, relinkDeep, relinkText } from "./wp-relink";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

/** Which fields of which collection may hold a URL, and what to leave alone. */
const TARGETS: { collection: string; fields: string[] }[] = [
  { collection: "posts", fields: ["cover", "title", "excerpt", "body"] },
  { collection: "records", fields: ["data", "draft"] },
  { collection: "categories", fields: ["title", "description", "cover", "image", "data"] },
  { collection: "copy", fields: ["value", "draft", "values"] },
];

async function main(): Promise<void> {
  await mongoose.connect(env("MONGO_URI"));
  const Media = mongoose.model("MediaAsset", MediaAssetSchema);
  const { publicBase } = r2();

  const keys = await mirroredKeys(Media as unknown as mongoose.Model<unknown>);
  console.log(`${keys.size} mirrored files to relink against.${dryRun ? " (dry run)" : ""}\n`);

  const db = mongoose.connection.db as mongoose.mongo.Db;
  const missed = new Map<string, number>();
  let changedDocs = 0;
  let changedUrls = 0;

  for (const target of TARGETS) {
    if (!(await db.listCollections({ name: target.collection }).hasNext())) continue;
    const collection = db.collection(target.collection);
    let docs = 0;
    let urls = 0;

    const cursor = collection.find(
      { $or: target.fields.map((f) => ({ [f]: { $exists: true } })) },
      { projection: Object.fromEntries(target.fields.map((f) => [f, 1])) },
    );
    for await (const doc of cursor) {
      const set: Record<string, unknown> = {};
      const stats = { replaced: 0, missed: [] as string[] };
      for (const field of target.fields) {
        const value = (doc as Record<string, unknown>)[field];
        if (value === undefined || value === null) continue;
        const before = stats.replaced;
        const next =
          typeof value === "string"
            ? (() => {
                const r = relinkText(value, keys, publicBase);
                stats.replaced += r.replaced;
                stats.missed.push(...r.missed);
                return r.text;
              })()
            : relinkDeep(value, keys, publicBase, stats);
        if (stats.replaced > before) set[field] = next;
      }
      for (const url of stats.missed) missed.set(url, (missed.get(url) ?? 0) + 1);
      if (!stats.replaced) continue;
      docs += 1;
      urls += stats.replaced;
      if (!dryRun) await collection.updateOne({ _id: doc._id }, { $set: set });
    }

    if (docs) console.log(`  ${target.collection}: ${docs} docs, ${urls} URLs relinked`);
    changedDocs += docs;
    changedUrls += urls;
  }

  console.log(
    `\n${dryRun ? "WOULD RELINK" : "RELINKED"}: ${changedUrls} URLs across ${changedDocs} documents.`,
  );
  if (missed.size) {
    const total = [...missed.values()].reduce((a, b) => a + b, 0);
    console.log(
      `\n${missed.size} URLs left on ibsu.edu.ge (${total} references): no copy of the file.`,
    );
    [...missed.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([url, n]) => console.log(`  ${n}×  ${url}`));
  }

  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
