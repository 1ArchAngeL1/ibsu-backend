/**
 * Rescues the WordPress files themselves into our R2 bucket, so the site
 * stops depending on the old WordPress server and we actually own them.
 *
 * For every media row still sourced "wp":
 *   download from ibsu.edu.ge  ->  PUT to R2  ->  rewrite the row
 *   (path -> the public bucket URL, key -> the object key, source -> "r2").
 *
 *     set -a; source .env; set +a
 *     tsx tools/rescue-wp-media.ts                # everything outstanding
 *     tsx tools/rescue-wp-media.ts --limit=50     # a trial
 *     tsx tools/rescue-wp-media.ts --fix-keys     # only the repair below
 *
 * Idempotent and resumable: a rescued row becomes source "r2" and is skipped
 * next time, so an interrupted run simply carries on.
 *
 * `--fix-keys`, which runs first unless `--no-fix-keys` is given, repairs the
 * rows the first version of this tool got wrong. It keyed objects by the
 * *encoded* URL path, so a Georgian filename became an object literally named
 * `wordpress/2026/11/%E1%83%92.webp` — which the matching public URL can
 * never fetch, because the CDN decodes the request path before looking the
 * key up. 342 files were unreachable that way. The repair copies each to its
 * decoded key inside the bucket (no second download), rewrites the row, and
 * deletes the unreachable original.
 */
import mongoose from "mongoose";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import { download, env, keyFor, pool, publicUrl, r2 } from "./wp-common";

const args = process.argv.slice(2);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8)) || 0;
const CONCURRENCY = 8;

type Media = mongoose.Model<unknown>;
type Bucket = ReturnType<typeof r2>;

/** The 342 objects stored under a literally-percent-encoded key. */
async function fixKeys(Media: Media, { client, bucket, publicBase }: Bucket): Promise<void> {
  const broken = (await Media.find({ source: "r2", key: /%/ }, { key: 1, path: 1 }).lean()) as {
    _id: unknown;
    key: string;
  }[];
  if (!broken.length) {
    console.log("fix-keys: nothing mis-keyed.");
    return;
  }
  console.log(`fix-keys: ${broken.length} objects under an unreachable key…`);
  let moved = 0;
  let failed = 0;

  await pool(broken, 6, async (doc) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(doc.key);
    } catch {
      failed += 1; // a real `%` in the filename; leave it alone
      return;
    }
    if (decoded === doc.key) return;
    try {
      // CopySource is a URL path and has to be encoded; the key it lands on
      // is the decoded name, which is the whole point of the repair.
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: decoded,
          CopySource: `/${bucket}/${doc.key.split("/").map(encodeURIComponent).join("/")}`,
        }),
      );
      await Media.updateOne(
        { _id: doc._id },
        { $set: { key: decoded, path: publicUrl(publicBase, decoded) } },
      );
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: doc.key }));
      moved += 1;
    } catch (error) {
      failed += 1;
      if (failed <= 3) console.log(`  ${doc.key}: ${(error as Error).message}`);
    }
  });
  console.log(`fix-keys: ${moved} re-keyed, ${failed} failed.`);
}

/** Everything still living on ibsu.edu.ge. */
async function rescue(Media: Media, { client, bucket, publicBase }: Bucket): Promise<void> {
  const query = Media.find({ source: "wp" }, { path: 1, mime: 1, wp: 1 });
  if (limit > 0) query.limit(limit);
  const docs = (await query.lean()) as {
    _id: unknown;
    path: string;
    mime?: string;
    wp?: { filesize?: number | null };
  }[];
  if (!docs.length) {
    console.log("rescue: every file is already in the bucket.");
    return;
  }
  console.log(`rescue: ${docs.length} files to bring into "${bucket}"…`);

  let done = 0;
  let failed = 0;
  let alreadyThere = 0;
  const failures: string[] = [];

  await pool(docs, CONCURRENCY, async (doc) => {
    const url = doc.path;
    const key = url ? keyFor(url) : null;
    if (!key) {
      failed += 1;
      failures.push(`${url} (not an uploads URL)`);
      return;
    }

    // A previous run may have uploaded the object and died before writing the
    // row. Ask the bucket first; it is far cheaper than a second download.
    let bytes = 0;
    let type = doc.mime;
    let have = false;
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      bytes = head.ContentLength ?? 0;
      type = head.ContentType ?? type;
      have = true;
      alreadyThere += 1;
    } catch {
      // not in the bucket yet, which is the normal case
    }

    if (!have) {
      const file = await download(url);
      if (!file) {
        failed += 1;
        failures.push(url);
        return;
      }
      bytes = file.body.length;
      type = doc.mime || file.type;
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: file.body,
            ContentType: type,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
      } catch (error) {
        failed += 1;
        failures.push(`${url} (${(error as Error).message})`);
        return;
      }
    }

    await Media.updateOne(
      { _id: doc._id },
      {
        $set: {
          path: publicUrl(publicBase, key),
          key,
          source: "r2",
          bytes: bytes || doc.wp?.filesize || 0,
          mime: type,
        },
      },
    );
    done += 1;
    if ((done + failed) % 250 === 0) {
      console.log(`  ${done} rescued, ${failed} failed, ${docs.length - done - failed} to go`);
    }
  });

  console.log(
    `rescue: ${done} rescued of ${docs.length}` +
      (alreadyThere ? ` (${alreadyThere} were already in the bucket)` : "") +
      `, ${failed} failed.`,
  );
  if (failures.length) {
    console.log("  WordPress no longer serves these:");
    failures.slice(0, 12).forEach((f) => console.log(`    ${f}`));
    if (failures.length > 12) console.log(`    …and ${failures.length - 12} more`);
  }
}

async function main(): Promise<void> {
  await mongoose.connect(env("MONGO_URI"));
  const Media = mongoose.model("MediaAsset", MediaAssetSchema) as unknown as Media;
  const bucket = r2();

  if (!args.includes("--no-fix-keys")) await fixKeys(Media, bucket);
  if (!args.includes("--fix-keys")) await rescue(Media, bucket);

  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
