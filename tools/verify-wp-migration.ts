/**
 * Checks that the WordPress migration actually landed.
 *
 *     set -a; source .env; set +a
 *     tsx tools/verify-wp-migration.ts
 *     tsx tools/verify-wp-migration.ts --sample=200   # how many URLs to fetch
 *
 * Counting rows proves nothing — a path in the database is a claim, not a
 * file. So this also *fetches* a random sample of the URLs the content now
 * points at, including the covers and the inline ones out of post bodies, and
 * reports anything that does not come back 200. That is the only test that
 * distinguishes a migration from a hopeful set of strings.
 */
import mongoose from "mongoose";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import { PostSchema } from "../src/schemas/post.schema";
import { WP_UPLOAD_URL_RE, env, pool } from "./wp-common";

const args = process.argv.slice(2);
const sampleSize = Number(args.find((a) => a.startsWith("--sample="))?.slice(9)) || 120;

/** A literal string, safe to drop into a RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pick<T>(items: T[], n: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  // deterministic enough, and spread across the list rather than clustered
  const step = Math.max(1, Math.floor(copy.length / n));
  for (let i = 0; i < copy.length && out.length < n; i += step) out.push(copy[i]);
  return out;
}

async function main(): Promise<void> {
  await mongoose.connect(env("MONGO_URI"));
  const Media = mongoose.model("MediaAsset", MediaAssetSchema);
  const Post = mongoose.model("Post", PostSchema);
  const db = mongoose.connection.db as mongoose.mongo.Db;
  const publicBase = env("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");

  console.log("── the library ───────────────────────────────────────────");
  const [total, fromWp, bySource, variantRows, variantCount, noMeta] = await Promise.all([
    Media.countDocuments(),
    Media.countDocuments({ "wp.id": { $exists: true } }),
    Media.aggregate([{ $group: { _id: "$source", n: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Media.countDocuments({ "variants.0": { $exists: true } }),
    Media.aggregate([{ $group: { _id: null, n: { $sum: { $size: "$variants" } } } }]),
    Media.countDocuments({ "wp.id": { $exists: true }, width: { $exists: false } }),
  ]);
  console.log(`  ${total} files, ${fromWp} of them out of WordPress`);
  console.log(
    `  by source: ${(bySource as { _id: string; n: number }[]).map((r) => `${r.n} ${r._id}`).join(", ")}`,
  );
  console.log(
    `  ${(variantCount as { n: number }[])[0]?.n ?? 0} mirrored derivatives on ${variantRows} files`,
  );
  console.log(`  ${noMeta} WordPress files still without width/height`);

  console.log("\n── the content ───────────────────────────────────────────");
  const [posts, wpPosts, coverR2, coverWp, bodyWp] = await Promise.all([
    Post.countDocuments(),
    Post.countDocuments({ "source.collection": "wp:post" }),
    Post.countDocuments({ cover: new RegExp(escapeRe(publicBase)) }),
    Post.countDocuments({ cover: /ibsu\.edu\.ge/ }),
    Post.countDocuments({ "body.ka": /ibsu\.edu\.ge\/wp-content/ }),
  ]);
  console.log(`  ${posts} posts, ${wpPosts} of them from WordPress`);
  console.log(`  covers: ${coverR2} on our bucket, ${coverWp} still on ibsu.edu.ge`);
  console.log(`  bodies still referring to ibsu.edu.ge: ${bodyWp}`);

  // Anything left anywhere in the database, field by field.
  const leftovers = new Map<string, number>();
  for (const name of ["posts", "records", "categories", "copy", "media"]) {
    if (!(await db.listCollections({ name }).hasNext())) continue;
    const cursor = db.collection(name).find({}, { projection: { source: 0 } });
    let n = 0;
    for await (const doc of cursor) {
      const text = JSON.stringify(doc);
      if (!text.includes("ibsu.edu.ge/wp-content")) continue;
      n += (text.match(WP_UPLOAD_URL_RE) ?? []).length;
    }
    if (n) leftovers.set(name, n);
  }
  console.log(
    leftovers.size
      ? `  leftover WordPress URLs: ${[...leftovers].map(([c, n]) => `${n} in ${c}`).join(", ")}`
      : "  no WordPress URLs left anywhere in the database",
  );

  console.log("\n── do the files answer? ──────────────────────────────────");
  // Half the sample from the library, half from what posts actually render:
  // an in-body URL is the one a reader's browser will ask for.
  const libraryUrls = (
    (await Media.find({ source: "r2" }, { path: 1 }).lean()) as { path: string }[]
  ).map((m) => m.path);

  const ourUrl = new RegExp(`${escapeRe(publicBase)}/[^\\s"'<>()[\\],\\\\]+`, "g");
  const bodyUrls = new Set<string>();
  const cursor = db
    .collection("posts")
    .find({ "body.ka": new RegExp(escapeRe(publicBase)) }, { projection: { body: 1, cover: 1 } });
  for await (const doc of cursor) {
    for (const url of JSON.stringify(doc).match(ourUrl) ?? []) bodyUrls.add(url);
  }

  const half = Math.max(1, Math.floor(sampleSize / 2));
  const sample = [...pick(libraryUrls, half), ...pick([...bodyUrls], half)];
  console.log(
    `  fetching ${sample.length} of ${libraryUrls.length} library URLs and ${bodyUrls.size} in-body URLs…`,
  );

  let ok = 0;
  const bad: string[] = [];
  await pool(sample, 12, async (url) => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) ok += 1;
      else bad.push(`${res.status}  ${url}`);
    } catch (error) {
      bad.push(`ERR   ${url} (${(error as Error).message})`);
    }
  });
  console.log(`  ${ok}/${sample.length} answered 200`);
  if (bad.length) {
    console.log("  not reachable:");
    bad.slice(0, 15).forEach((b) => console.log(`    ${b}`));
    if (bad.length > 15) console.log(`    …and ${bad.length - 15} more`);
  }

  await mongoose.disconnect();
  if (bad.length) process.exitCode = 1;
}

void main().catch((error: Error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
