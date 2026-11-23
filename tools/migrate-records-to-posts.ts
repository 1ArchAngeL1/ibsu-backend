/**
 * Brings every record in the `records` collections into `posts`, so all of
 * the site's content is visible and editable in the one WordPress-style
 * screen.
 *
 *     tsx tools/migrate-records-to-posts.ts [--dry]
 *     tsx tools/migrate-records-to-posts.ts --undo [--dry]
 *
 * It is a COPY, not a move: the original `records` are left exactly as they
 * are, and each new post keeps the whole original document in `source.data`,
 * so nothing is lost in the flattening and the mapping can be re-run or
 * undone. Re-running updates the same posts (matched on source), it does not
 * duplicate them.
 *
 * Title and body are derived from the collection's own fields — the title
 * field for the name, the rich-text and textarea fields for the body — in
 * both languages where the field carries both. Everything else the post
 * model has no column for still lives, untouched, in `source.data`.
 */
import mongoose from "mongoose";
import slugify from "slugify";
import { COLLECTIONS } from "../src/content-model/catalogue";
import type { CollectionDef, FieldDef } from "../src/content-model/types";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";
import { PostSchema } from "../src/schemas/post.schema";

type Row = Record<string, unknown>;
type Localized = { ka: string; en: string };

const dry = process.argv.includes("--dry");
const undo = process.argv.includes("--undo");

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

/** A field's value in both languages, across the four spellings the model knows. */
function localized(data: Row, field: FieldDef): Localized {
  if (field.siblings) {
    return { ka: str(data[field.siblings.ka]), en: str(data[field.siblings.en]) };
  }
  const raw = data[field.name];
  if (field.localized && raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Row;
    const keys = field.localeKeys ?? { ka: "ka", en: "en" };
    return {
      ka: str(obj[keys.ka]) || str(obj.ge) || str(obj.ka),
      en: str(obj[keys.en]) || str(obj.en),
    };
  }
  // A plain, unlocalized string: treat it as Georgian, the default language.
  return { ka: str(raw), en: "" };
}

function titleOf(data: Row, collection: CollectionDef, key: string): Localized {
  const field = collection.fields.find((f) => f.name === collection.titleField);
  const t = field ? localized(data, field) : { ka: str(data[collection.titleField]), en: "" };
  if (!t.ka && !t.en) return { ka: key, en: "" };
  return t;
}

/** The body: every rich-text and textarea field, joined, per language. */
function bodyOf(data: Row, collection: CollectionDef): Localized {
  const parts: Localized[] = [];
  for (const field of collection.fields) {
    if (field.kind !== "richtext" && field.kind !== "textarea") continue;
    const value = localized(data, field);
    if (value.ka || value.en) parts.push(value);
  }
  return {
    ka: parts.map((p) => p.ka).filter(Boolean).join("\n\n"),
    en: parts.map((p) => p.en).filter(Boolean).join("\n\n"),
  };
}

function excerptOf(data: Row, collection: CollectionDef): Localized {
  const field = collection.fields.find(
    (f) => f.kind === "textarea" && f.name !== collection.titleField,
  );
  return field ? localized(data, field) : { ka: "", en: "" };
}

function coverOf(data: Row, collection: CollectionDef): string | null {
  const field = collection.fields.find((f) => f.kind === "image");
  const value = field ? data[field.name] : undefined;
  return typeof value === "string" && value ? value : null;
}

function tagsOf(data: Row, collection: CollectionDef): string[] {
  const tags = new Set<string>([collection.label]);
  const raw = data.tags;
  if (Array.isArray(raw)) for (const t of raw) if (typeof t === "string") tags.add(t);
  else if (typeof raw === "string") tags.add(raw);
  return [...tags];
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Record = mongoose.model("ContentRecord", ContentRecordSchema);
  const Post = mongoose.model("Post", PostSchema);

  const byName = new Map(COLLECTIONS.map((c) => [c.name, c]));

  /*
   * `--undo`: take the copies back out again.
   *
   * The header has always said this mapping could be undone; this is that,
   * and it is wanted now because the copies turned out to be a trap. The
   * website reads this content from `records` — never from `posts` — so a
   * copy here renders nowhere, and an editor who finds one in Posts, edits
   * it and saves has changed nothing and been told nothing. Every one of
   * these collections now has its own entry in the admin sidebar, which is
   * where that editing belongs.
   *
   * Only rows this tool wrote are touched: a post whose `source.collection`
   * names a collection in the content model. A native post (`source: null`)
   * and anything imported from WordPress (`wp:post`) are matched by neither
   * and cannot be caught by this, which is the point of filtering on the
   * model rather than on "not wp:post".
   *
   * Nothing is lost. The records themselves are untouched — they are what
   * the site has been reading all along — and running this tool again
   * without `--undo` puts the copies back.
   */
  if (undo) {
    const names = [...byName.keys()];
    const filter = { "source.collection": { $in: names } };
    const doomed = await Post.find(filter).select("source.collection").lean();

    const byCollection = new Map<string, number>();
    for (const post of doomed) {
      const name = (post as unknown as { source: { collection: string } }).source.collection;
      byCollection.set(name, (byCollection.get(name) ?? 0) + 1);
    }
    for (const [name, n] of [...byCollection].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(5)}  ${name}`);
    }

    const total = doomed.length;
    const others = await Post.countDocuments({ "source.collection": { $nin: names } });
    if (dry) {
      console.log(`[dry] would remove ${total} copied posts; ${others} others untouched`);
    } else {
      const { deletedCount } = await Post.deleteMany(filter);
      console.log(
        `removed ${deletedCount} copied posts; ${others} others untouched. ` +
          `The records they were copied from are unchanged — re-run without --undo to restore.`,
      );
    }
    await mongoose.disconnect();
    return;
  }

  // Slugs already taken, so migrated posts never collide with each other or
  // with native posts. Seeded from what exists.
  const taken = new Set<string>(
    (await Post.find().select("slug").lean()).map((p) => (p as { slug: string }).slug),
  );
  const uniqueSlug = (base: string, keep?: string): string => {
    const root = slugify(base || "item", { lower: true, strict: true }) || "item";
    if (keep && root === keep) return root;
    let slug = root;
    for (let n = 2; taken.has(slug); n += 1) slug = `${root}-${n}`;
    taken.add(slug);
    return slug;
  };

  const records = await Record.find().lean();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const r = record as unknown as {
      collectionName: string;
      key: string;
      data: Row | null;
      draft: Row | null;
      status: string;
      publishedAt?: Date;
    };
    const collection = byName.get(r.collectionName);
    if (!collection) {
      skipped += 1;
      continue;
    }
    const data = r.data ?? r.draft ?? {};
    const status: "draft" | "published" = r.status === "published" ? "published" : "draft";

    const fields = {
      title: titleOf(data, collection, r.key),
      excerpt: excerptOf(data, collection),
      body: bodyOf(data, collection),
      cover: coverOf(data, collection),
      categories: [] as string[],
      tags: tagsOf(data, collection),
      status,
      publishedAt: status === "published" ? (r.publishedAt ?? new Date()) : null,
      authorName: "Migrated",
      source: {
        collection: r.collectionName,
        key: r.key,
        label: collection.label,
        data,
      },
    };

    const existing = await Post.findOne({
      "source.collection": r.collectionName,
      "source.key": r.key,
    });

    if (dry) {
      console.log(`${existing ? "update" : "create"}  ${r.collectionName}/${r.key}  ${fields.title.ka || fields.title.en}`);
      existing ? (updated += 1) : (created += 1);
      continue;
    }

    if (existing) {
      // Keep the slug and anything an editor has since changed in categories;
      // refresh the derived fields and the preserved source data.
      existing.set({ ...fields, slug: existing.get("slug"), categories: existing.get("categories") });
      await existing.save();
      updated += 1;
    } else {
      const slug = uniqueSlug(`${collection.name}-${r.key}`);
      await Post.create({ ...fields, slug });
      created += 1;
    }
  }

  console.log(
    `${dry ? "[dry] " : ""}records -> posts: ${created} created, ${updated} updated, ${skipped} skipped (unknown collection), ${records.length} seen`,
  );
  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
