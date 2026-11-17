/**
 * Mirrors the *sized* copies the old posts actually ask for.
 *
 * Rescuing the media library brings over one file per attachment — the full
 * size. But a WordPress gallery does not render the full size; it renders
 *
 *     src="…/IMG_8334-300x200.webp"
 *     srcset="…-300x200.webp 300w, …-768x512.webp 768w, …-1536x1024.webp 1536w, …"
 *
 * and none of those derivatives is an attachment of its own, so none of them
 * came across. 11,842 of them are referenced by the content in this database.
 * Without them a relinked post has to fall back on the full size for a 300px
 * thumbnail — so they are mirrored too, under the key their URL maps to, and
 * recorded as `variants` of the attachment they were cut from. A migrated
 * `srcset` then keeps every width it was written with.
 *
 *     set -a; source .env; set +a
 *     tsx tools/mirror-wp-derivatives.ts                  # everything referenced
 *     tsx tools/mirror-wp-derivatives.ts --limit=100       # a trial
 *     tsx tools/mirror-wp-derivatives.ts --dry-run         # just say what is missing
 *
 * Resumable: a derivative already recorded as a variant is skipped, and the
 * bucket is asked before anything is downloaded twice.
 */
import mongoose from "mongoose";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import {
  WP_UPLOAD_URL_RE,
  download,
  env,
  keyFor,
  parseSized,
  pool,
  publicUrl,
  r2,
  wpUrlFor,
} from "./wp-common";

const args = process.argv.slice(2);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8)) || 0;
const dryRun = args.includes("--dry-run");
const CONCURRENCY = 8;

/** Where content may hide a URL. `media` is excluded: its own rows are the map. */
const COLLECTIONS = ["posts", "records", "categories", "copy"];

const MIME_BY_EXT: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  heic: "image/heic",
  pdf: "application/pdf",
};

function mimeFor(key: string): string {
  const ext = (/\.([A-Za-z0-9]+)$/.exec(key)?.[1] ?? "").toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/**
 * Every WordPress upload URL the content refers to, as key -> the URL it was
 * found as. Read with a cursor: the posts collection is the biggest thing in
 * the database and there is no reason to hold all of it at once.
 */
async function referencedKeys(db: mongoose.mongo.Db): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const name of COLLECTIONS) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) continue;
    let docs = 0;
    const before = found.size;
    const cursor = db.collection(name).find({}, { projection: { _id: 0 } });
    for await (const doc of cursor) {
      const text = JSON.stringify(doc);
      if (!text.includes("ibsu.edu.ge/wp-content")) continue;
      docs += 1;
      for (const url of text.match(WP_UPLOAD_URL_RE) ?? []) {
        const clean = url.replace(/[.;:!?]+$/, "");
        const key = keyFor(clean);
        if (key && !found.has(key)) found.set(key, clean);
      }
    }
    if (docs) console.log(`  ${name}: ${docs} docs, ${found.size - before} new URLs`);
  }
  return found;
}

type Media = mongoose.Model<unknown>;

interface Job {
  key: string;
  url: string;
  sized: { parentKey: string; width: number; height: number } | null;
}

async function main(): Promise<void> {
  await mongoose.connect(env("MONGO_URI"));
  const Media = mongoose.model("MediaAsset", MediaAssetSchema) as unknown as Media;
  const { client, bucket, publicBase } = r2();
  const db = mongoose.connection.db as mongoose.mongo.Db;

  console.log("reading every WordPress URL the content refers to…");
  const referenced = await referencedKeys(db);

  // What we already hold: a row's key (once its file has moved) and every
  // variant key, which is only ever written after a clean upload.
  const rows = (await Media.find(
    { $or: [{ key: { $exists: true } }, { "variants.0": { $exists: true } }] },
    { key: 1, source: 1, "variants.key": 1 },
  ).lean()) as { _id: unknown; key?: string; source?: string; variants?: { key?: string }[] }[];

  const rowByKey = new Map<string, { _id: unknown; source?: string }>();
  const have = new Set<string>();
  for (const row of rows) {
    if (row.key) {
      rowByKey.set(row.key, { _id: row._id, source: row.source });
      if (row.source === "r2" || row.source === "upload") have.add(row.key);
    }
    for (const v of row.variants ?? []) if (v.key) have.add(v.key);
  }

  const outstanding = [...referenced.entries()]
    .filter(([key]) => !have.has(key))
    .map(([key, url]): Job => ({ key, url, sized: parseSized(key) }));

  // A derivative whose attachment never came across needs its full size
  // fetched too, so the thumbnail still belongs to something.
  const parentsNeeded = new Set<string>();
  for (const job of outstanding) {
    if (job.sized && !rowByKey.has(job.sized.parentKey) && !have.has(job.sized.parentKey)) {
      parentsNeeded.add(job.sized.parentKey);
    }
  }

  const originals = outstanding.filter((j) => !j.sized);
  for (const key of parentsNeeded) {
    if (originals.some((j) => j.key === key)) continue;
    const url = wpUrlFor(key);
    if (url) originals.push({ key, url, sized: null });
  }
  const derivatives = outstanding.filter((j) => j.sized);

  console.log(
    `\n${referenced.size} URLs referenced, ${have.size} already mirrored.` +
      `\n  ${originals.length} full-size files missing (${parentsNeeded.size} of them only as a thumbnail's parent)` +
      `\n  ${derivatives.length} sized derivatives missing`,
  );
  if (dryRun) {
    [...originals, ...derivatives].slice(0, 15).forEach((j) => console.log(`  would mirror ${j.key}`));
    await mongoose.disconnect();
    return;
  }

  let done = 0;
  let skipped = 0;
  let gone = 0;
  const failures: string[] = [];

  /** Put the bytes in the bucket, unless they are already there. */
  async function ensureObject(
    job: Job,
  ): Promise<{ bytes: number; mime: string } | null> {
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: job.key }));
      return { bytes: head.ContentLength ?? 0, mime: head.ContentType ?? mimeFor(job.key) };
    } catch {
      // not there yet
    }
    const file = await download(job.url);
    if (!file) return null;
    const mime = mimeFor(job.key) === "application/octet-stream" ? file.type : mimeFor(job.key);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: job.key,
        Body: file.body,
        ContentType: mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { bytes: file.body.length, mime };
  }

  // ── pass one: the full sizes, so every thumbnail has a parent to hang on
  if (originals.length) {
    console.log(`\nmirroring ${originals.length} full-size files…`);
    const work = limit > 0 ? originals.slice(0, limit) : originals;
    let pass1 = 0;
    await pool(work, CONCURRENCY, async (job) => {
      const stored = await ensureObject(job).catch(() => null);
      if (!stored) {
        gone += 1;
        failures.push(job.url);
        return;
      }
      const existing = rowByKey.get(job.key);
      if (existing) {
        await Media.updateOne(
          { _id: existing._id },
          {
            $set: {
              path: publicUrl(publicBase, job.key),
              key: job.key,
              source: "r2",
              bytes: stored.bytes,
              mime: stored.mime,
            },
          },
        );
      } else {
        // Referenced by the content but not in the WordPress media library:
        // an attachment deleted from the library whose file is still served.
        await Media.updateOne(
          { key: job.key },
          {
            $set: {
              path: publicUrl(publicBase, job.key),
              key: job.key,
              source: "r2",
              bytes: stored.bytes,
              mime: stored.mime,
            },
            $setOnInsert: {
              originalName: job.key.split("/").pop(),
              alt: { ka: "", en: "" },
              caption: { ka: "", en: "" },
              folder: "wordpress",
              tags: ["unlisted-in-wp"],
              variants: [],
              wp: { id: 0, url: job.url, file: job.key.split("/").pop() },
            },
          },
          { upsert: true },
        );
      }
      have.add(job.key);
      done += 1;
      pass1 += 1;
      if (pass1 % 100 === 0) {
        console.log(`  ${pass1} of ${work.length} done, ${gone} gone from WordPress`);
      }
    });
  }

  // Re-read the rows the first pass may have created, so pass two can find
  // the parent of every derivative it is about to mirror.
  const parentIds = new Map<string, unknown>();
  const parentKeys = [...new Set(derivatives.map((j) => j.sized?.parentKey).filter(Boolean))] as string[];
  for (let i = 0; i < parentKeys.length; i += 1000) {
    const batch = parentKeys.slice(i, i + 1000);
    const found = (await Media.find({ key: { $in: batch } }, { key: 1 }).lean()) as {
      _id: unknown;
      key: string;
    }[];
    for (const row of found) parentIds.set(row.key, row._id);
  }

  // ── pass two: the derivatives, recorded as variants of their attachment
  if (derivatives.length) {
    console.log(`\nmirroring ${derivatives.length} sized derivatives…`);
    const work = limit > 0 ? derivatives.slice(0, limit) : derivatives;
    let orphans = 0;
    let pass2 = 0;
    await pool(work, CONCURRENCY, async (job) => {
      const sized = job.sized!;
      const parentId = parentIds.get(sized.parentKey);
      const stored = await ensureObject(job).catch(() => null);
      if (!stored) {
        gone += 1;
        failures.push(job.url);
        return;
      }
      const variant = {
        width: sized.width,
        height: sized.height,
        path: publicUrl(publicBase, job.key),
        bytes: stored.bytes,
        key: job.key,
      };
      if (parentId) {
        // $addToSet would compare whole subdocuments; match on the key so a
        // re-run with a different byte count cannot double the entry.
        const added = await Media.updateOne(
          { _id: parentId, "variants.key": { $ne: job.key } },
          { $push: { variants: variant } },
        );
        if (!added.modifiedCount) skipped += 1;
      } else {
        // Its full size is gone from WordPress, so there is nothing to be a
        // variant of; keep it as a row of its own so the reference still works.
        orphans += 1;
        await Media.updateOne(
          { key: job.key },
          {
            $set: {
              path: variant.path,
              key: job.key,
              source: "r2",
              bytes: stored.bytes,
              mime: stored.mime,
              width: sized.width,
              height: sized.height,
            },
            $setOnInsert: {
              originalName: job.key.split("/").pop(),
              alt: { ka: "", en: "" },
              caption: { ka: "", en: "" },
              folder: "wordpress",
              tags: ["orphan-derivative"],
              variants: [],
              wp: { id: 0, url: job.url, file: job.key.split("/").pop() },
            },
          },
          { upsert: true },
        );
      }
      done += 1;
      pass2 += 1;
      if (pass2 % 250 === 0) {
        console.log(`  ${pass2} of ${work.length} mirrored, ${gone} gone from WordPress`);
      }
    });
    if (orphans) console.log(`  ${orphans} derivatives kept as rows of their own (full size gone)`);
  }

  console.log(
    `\nDONE: ${done} files mirrored, ${skipped} already recorded, ${gone} no longer on WordPress.`,
  );
  if (failures.length) {
    failures.slice(0, 10).forEach((f) => console.log(`  gone: ${f}`));
    if (failures.length > 10) console.log(`  …and ${failures.length - 10} more`);
  }
  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
