/**
 * Turning an old ibsu.edu.ge URL into ours, wherever one is written down.
 *
 * Mirroring the files was only half of it. A post whose body still says
 * `src="https://ibsu.edu.ge/wp-content/uploads/2026/11/IMG_8334-300x200.webp"`
 * is still a post served by the old WordPress box, however many copies of
 * that file we own — so every reference has to be rewritten too, and the
 * relation between post and picture comes over with it.
 *
 * One rule governs it: a URL is rewritten only if the object it maps to is
 * *actually in the bucket*. `mirroredKeys` is that proof, read back out of
 * the media library (full sizes under `key`, WordPress's derivatives under
 * `variants[].key`). Anything not mirrored — a file WordPress itself has
 * since lost — is left pointing where it points and reported, because a URL
 * that still works beats a tidy one that 404s.
 */
import type { Model } from "mongoose";
import { WP_UPLOAD_URL_RE, keyFor, publicUrl } from "./wp-common";

/** Every object we have proved is in the bucket, by key. */
export async function mirroredKeys(Media: Model<unknown>): Promise<Set<string>> {
  const keys = new Set<string>();
  const docs = (await Media.find(
    { $or: [{ key: { $exists: true } }, { "variants.0": { $exists: true } }] },
    { key: 1, "variants.key": 1, source: 1 },
  ).lean()) as { key?: string; source?: string; variants?: { key?: string }[] }[];
  for (const doc of docs) {
    // A row's own key proves nothing until the file has moved: a row still
    // sourced "wp" names where the object *will* go, not where it is.
    if (doc.key && (doc.source === "r2" || doc.source === "upload")) keys.add(doc.key);
    // A variant, on the other hand, is only ever recorded after its upload
    // has come back clean — so it is proof whatever the parent's state is.
    for (const v of doc.variants ?? []) if (v.key) keys.add(v.key);
  }
  return keys;
}

export interface RelinkResult {
  text: string;
  replaced: number;
  /** URLs left alone: we hold no copy of them */
  missed: string[];
}

/** Rewrite every mirrored WordPress URL in a string; leave the rest. */
export function relinkText(text: string, keys: Set<string>, publicBase: string): RelinkResult {
  if (!text || !text.includes("ibsu.edu.ge/wp-content")) {
    return { text, replaced: 0, missed: [] };
  }
  let replaced = 0;
  const missed: string[] = [];
  const next = text.replace(WP_UPLOAD_URL_RE, (match) => {
    // A URL at the end of a sentence picks up the full stop; a filename
    // cannot end in one, so it is punctuation and belongs back in the text.
    const trailing = /[.;:!?]+$/.exec(match)?.[0] ?? "";
    const url = trailing ? match.slice(0, -trailing.length) : match;
    const key = keyFor(url);
    if (!key || !keys.has(key)) {
      missed.push(url);
      return match;
    }
    replaced += 1;
    return publicUrl(publicBase, key) + trailing;
  });
  return { text: next, replaced, missed };
}

/**
 * The same, through a tree of unknown shape — a record's `data`, a post's
 * localized `body`. Returns a new tree; the original is not touched.
 */
export function relinkDeep(
  value: unknown,
  keys: Set<string>,
  publicBase: string,
  stats: { replaced: number; missed: string[] },
): unknown {
  if (typeof value === "string") {
    const result = relinkText(value, keys, publicBase);
    stats.replaced += result.replaced;
    stats.missed.push(...result.missed);
    return result.text;
  }
  if (Array.isArray(value)) {
    return value.map((item) => relinkDeep(item, keys, publicBase, stats));
  }
  if (value && typeof value === "object" && (value as object).constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = relinkDeep(v, keys, publicBase, stats);
    }
    return out;
  }
  return value; // Date, ObjectId, number, null — nothing to rewrite
}
