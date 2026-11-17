/**
 * Rescues the WordPress media - the ~4,525 images still referenced by their
 * live ibsu.edu.ge URL - into our own R2 bucket, so the site stops depending
 * on the old WordPress server and we actually own the files.
 *
 * For each media doc with source "wp":
 *   download from ibsu.edu.ge  ->  PUT to R2  ->  rewrite the doc
 *   (path -> the public r2.dev URL, key -> the object key, source -> "r2").
 *
 * Idempotent: a rescued doc becomes source "r2" and is skipped next time, so
 * the job resumes cleanly if interrupted. Reads MONGO_URI and the R2_* vars
 * from the environment - source the backend's .env before running:
 *
 *     set -a; source .env; set +a
 *     ./node_modules/.bin/tsx tools/rescue-wp-media.ts             # all
 *     ./node_modules/.bin/tsx tools/rescue-wp-media.ts --limit=50  # a trial
 */
import mongoose from "mongoose";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";

const args = process.argv.slice(2);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8)) || 0;
const CONCURRENCY = 8;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (source the backend .env first).`);
  return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Download with a few retries; ibsu.edu.ge occasionally throttles bulk pulls. */
async function download(url: string, tries = 5): Promise<{ body: Buffer; type: string } | null> {
  for (let i = 0; ; i += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.status === 404 || res.status === 410) return null; // gone on WP
      if (res.status === 429 || res.status === 403 || res.status >= 500) {
        if (i >= tries) return null;
        await sleep(Math.min(2000 * 2 ** i, 30000));
        continue;
      }
      if (!res.ok) return null;
      const body = Buffer.from(await res.arrayBuffer());
      return { body, type: res.headers.get("content-type") || "application/octet-stream" };
    } catch {
      if (i >= tries) return null;
      await sleep(Math.min(2000 * 2 ** i, 30000));
    }
  }
}

/** ibsu.edu.ge/wp-content/uploads/2026/11/x.webp -> wordpress/2026/11/x.webp */
function keyFor(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/^\/+/, "");
    return `wordpress/${p.replace(/^wp-content\/uploads\//, "")}`;
  } catch {
    return `wordpress/${url.split("/").pop() || "file"}`;
  }
}

async function main(): Promise<void> {
  await mongoose.connect(env("MONGO_URI"));
  const Media = mongoose.model("MediaAsset", MediaAssetSchema);
  const client = new S3Client({
    region: "auto",
    endpoint: env("R2_ENDPOINT"),
    credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  });
  const bucket = env("R2_BUCKET");
  const publicBase = env("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");

  const q = Media.find({ source: "wp" }).select("path mime");
  if (limit > 0) q.limit(limit);
  const docs = (await q.lean()) as { _id: unknown; path: string; mime?: string }[];
  console.log(`rescuing ${docs.length} WordPress images into R2 bucket "${bucket}"...`);

  let done = 0, failed = 0, idx = 0;
  const failures: string[] = [];

  async function worker(): Promise<void> {
    for (;;) {
      const i = idx++;
      if (i >= docs.length) return;
      const doc = docs[i];
      const url = doc.path;
      if (!url || !/^https?:\/\//.test(url)) continue;
      const dl = await download(url);
      if (!dl) { failed += 1; failures.push(url); continue; }
      const key = keyFor(url);
      const type = doc.mime || dl.type;
      try {
        await client.send(new PutObjectCommand({
          Bucket: bucket, Key: key, Body: dl.body, ContentType: type,
          CacheControl: "public, max-age=31536000, immutable",
        }));
        await Media.updateOne(
          { _id: doc._id },
          { $set: { path: `${publicBase}/${key}`, key, source: "r2", bytes: dl.body.length, mime: type } },
        );
        done += 1;
      } catch {
        failed += 1; failures.push(url);
      }
      if ((done + failed) % 250 === 0) {
        console.log(`  ${done} rescued, ${failed} failed, ${docs.length - done - failed} to go`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\nDONE: ${done} rescued, ${failed} failed of ${docs.length}.`);
  if (failures.length) console.log("first failures:\n" + failures.slice(0, 12).join("\n"));
  await mongoose.disconnect();
}

void main().catch((e: Error) => { console.error("\n" + e.message); process.exit(1); });
