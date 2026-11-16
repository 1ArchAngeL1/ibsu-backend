/**
 * Turns the extracted content into two things:
 *
 *   seed/records/<collection>.json          the records, ready to seed
 *   src/content-model/collections.generated.ts   the form schema per field
 *
 * The schema is inferred from the content itself rather than from the
 * TypeScript interfaces above it. The content is the better witness: it
 * knows that `img` always holds a path under /photos (so the admin should
 * open the media library), that `category` only ever takes one of five
 * values (so it should be a dropdown), and that `excerpt` runs to three
 * hundred characters (so it needs a textarea, not a single line).
 *
 * Anything the inference cannot place becomes a `json` field rather than
 * disappearing. That is the whole reason the "everything is editable"
 * promise holds: a field the model misreads is still a field an editor can
 * open and fix.
 *
 *     cd backend && npm run extract && tsx tools/infer-content-model.ts
 */
import fs from "node:fs";
import path from "node:path";
import { MIGRATION, type MigrationEntry } from "./migration-map";
import type {
  CollectionDef,
  FieldDef,
  FieldKind,
  FieldOption,
  LocaleKeyMap,
} from "../src/content-model/types";

const BACKEND = path.resolve(__dirname, "..");
const LEGACY = path.join(BACKEND, "seed", "legacy");
const RECORDS_OUT = path.join(BACKEND, "seed", "records");
const MODEL_OUT = path.join(BACKEND, "src", "content-model", "collections.generated.ts");

type Json = unknown;
type Row = Record<string, Json>;

/** A record on its way into Mongo. */
interface SeedRecord {
  key: string;
  order: number;
  data: Row;
}

/* ------------------------------------------------------------ loading */

function readLegacy(file: string): Record<string, Json> {
  const full = path.join(LEGACY, `${file}.json`);
  if (!fs.existsSync(full)) throw new Error(`no extract at ${full}`);
  return JSON.parse(fs.readFileSync(full, "utf8")) as Record<string, Json>;
}

function sourceValue(entry: MigrationEntry): Json {
  if (entry.fromSource) {
    const json = readLegacy(path.join("sources", entry.fromSource));
    return entry.sourcePath ? (json as Row)[entry.sourcePath] : json;
  }
  const module = readLegacy(entry.module);
  if (entry.shape.kind === "constants") {
    const gathered: Row = {};
    for (const name of entry.shape.names) gathered[name] = module[name];
    return gathered;
  }
  if (!entry.constName) throw new Error(`${entry.collection}: no constName`);
  if (!(entry.constName in module)) {
    throw new Error(`${entry.collection}: ${entry.module}.${entry.constName} not extracted`);
  }
  const value = module[entry.constName];
  if (!entry.constPath) return value;
  const inner = (value as Row)[entry.constPath];
  if (inner === undefined) {
    throw new Error(
      `${entry.collection}: ${entry.constName}.${entry.constPath} is not there`,
    );
  }
  return inner;
}

/* ----------------------------------------------------------- shaping */

/** Reduce whatever the module held to a flat list of records. */
function toRecords(entry: MigrationEntry, value: Json): SeedRecord[] {
  const shape = entry.shape;
  const keyOf = (row: Row, fallback: number): string => {
    const candidates = [entry.keyField, "id", "slug", "key"].filter(Boolean) as string[];
    for (const field of candidates) {
      const v = row[field];
      if (typeof v === "string" && v.length > 0) return v;
      if (typeof v === "number") return String(v);
    }
    return String(fallback);
  };

  switch (shape.kind) {
    case "array": {
      if (!Array.isArray(value)) throw new Error(`${entry.collection}: expected an array`);
      return value.map((row, i) => ({
        key: keyOf(row as Row, i),
        order: i,
        data: row as Row,
      }));
    }
    case "object":
    case "constants": {
      return [{ key: "default", order: 0, data: (value ?? {}) as Row }];
    }
    case "byKey": {
      const out: SeedRecord[] = [];
      let order = 0;
      for (const [groupKey, rows] of Object.entries(value as Record<string, Json>)) {
        if (!Array.isArray(rows)) continue;
        rows.forEach((row, i) => {
          const data = shape.wrapField
            ? { [shape.keyField]: groupKey, index: i, [shape.wrapField]: row }
            : { [shape.keyField]: groupKey, ...(row as Row) };
          out.push({
            key: shape.wrapField ? `${groupKey}:${i}` : `${groupKey}:${keyOf(data, order)}`,
            order: order++,
            data,
          });
        });
      }
      return out;
    }
    case "objectMap": {
      let order = 0;
      return Object.entries(value as Record<string, Json>).map(([key, row]) => ({
        key,
        order: order++,
        data: shape.wrapField
          ? { [shape.keyField]: key, [shape.wrapField]: row }
          : { [shape.keyField]: key, ...(row as Row) },
      }));
    }
    case "nestedMap": {
      const out: SeedRecord[] = [];
      let order = 0;
      for (const [outer, inner] of Object.entries(value as Record<string, Json>)) {
        for (const [key, row] of Object.entries(inner as Record<string, Json>)) {
          const data: Row =
            row !== null && typeof row === "object" && !Array.isArray(row)
              ? { [shape.outerField]: outer, [shape.keyField]: key, ...(row as Row) }
              : { [shape.outerField]: outer, [shape.keyField]: key, value: row };
          out.push({ key: `${outer}:${key}`, order: order++, data });
        }
      }
      return out;
    }
    case "byLocale": {
      const out: SeedRecord[] = [];
      let order = 0;
      for (const [locale, rows] of Object.entries(value as Record<string, Json>)) {
        if (!Array.isArray(rows)) continue;
        rows.forEach((row, i) => {
          const data = { locale, ...(row as Row) };
          out.push({ key: `${locale}:${keyOf(data, i)}`, order: order++, data });
        });
      }
      return out;
    }
  }
}

/* --------------------------------------------------------- inference */

const LOCALE_OBJECT_SHAPES: { keys: string[]; map: LocaleKeyMap }[] = [
  { keys: ["en", "ka"], map: { ka: "ka", en: "en" } },
  { keys: ["en", "ge"], map: { ka: "ge", en: "en" } },
];

/** `{ ka: "…", en: "…" }` or the newsroom's `{ ge, en }`. */
function localeObjectKeys(value: Json): LocaleKeyMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort();
  for (const shape of LOCALE_OBJECT_SHAPES) {
    if (keys.length === shape.keys.length && keys.every((k, i) => k === shape.keys[i])) {
      if (Object.values(value).every((v) => typeof v === "string")) return shape.map;
    }
  }
  return null;
}

/**
 * Sibling keys holding the two languages: `name_en`/`name_ge`, or the
 * staff profiles' `name`/`nameka`. Returns the virtual field name and
 * which sibling is which language.
 */
function siblingPair(keys: Set<string>, key: string): { field: string; map: LocaleKeyMap } | null {
  const suffixed = /^(.+)_(en|ge|ka)$/.exec(key);
  if (suffixed) {
    const [, stem, lang] = suffixed;
    if (lang === "en") {
      for (const ka of [`${stem}_ka`, `${stem}_ge`]) {
        if (keys.has(ka)) return { field: stem, map: { ka, en: key } };
      }
    }
    return null; // handled from the `_en` side
  }
  // `nameka` next to `name`
  for (const suffix of ["ka", "ge"]) {
    if (keys.has(key + suffix)) return { field: key, map: { ka: key + suffix, en: key } };
  }
  return null;
}

const IMAGE_RE = /^(\/(photos|journals|logos)\/|assets\/photos\/)/;
const DOC_RE = /^\/docs\/|\.pdf$/i;
const URL_RE = /^https?:\/\//;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const COLOR_RE = /^#[0-9a-f]{3,8}$/i;
const TEL_RE = /^\+?[\d\s()-]{7,}$/;

/** camelCase, snake_case and SHOUTING all become "Title Case". */
const WORD_FIXES: Record<string, string> = {
  id: "ID",
  url: "URL",
  href: "Link",
  img: "Image",
  src: "Image",
  iro: "IRO",
  clj: "CLJ",
  issn: "ISSN",
  eissn: "eISSN",
  doi: "DOI",
  cats: "Categories",
  lede: "Lede",
  lvl: "Level",
  acc: "Accreditation expiry",
  freq: "Frequency",
  tel: "Telephone",
  gpa: "GPA",
  pubs: "Publications",
  sched: "Schedule",
  ka: "Georgian",
  ge: "Georgian",
  en: "English",
};

function humanize(name: string): string {
  if (WORD_FIXES[name]) return WORD_FIXES[name];
  const words = name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => WORD_FIXES[w] ?? w);
  const joined = words.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** Every sample of one key across the records, nulls kept apart. */
interface Samples {
  values: Json[];
  nulls: number;
  missing: number;
}

function collectSamples(rows: Row[], key: string): Samples {
  const values: Json[] = [];
  let nulls = 0;
  let missing = 0;
  for (const row of rows) {
    if (!(key in row)) {
      missing++;
      continue;
    }
    const v = row[key];
    if (v === null || v === undefined) nulls++;
    else values.push(v);
  }
  return { values, nulls, missing };
}

function stringKind(values: string[], name: string): FieldKind {
  const all = (re: RegExp) => values.length > 0 && values.every((v) => re.test(v));
  if (all(IMAGE_RE)) return "image";
  if (all(DOC_RE)) return "file";
  if (all(URL_RE)) return "url";
  if (all(EMAIL_RE)) return "email";
  if (all(DATE_RE)) return "date";
  if (all(COLOR_RE)) return "color";
  if (/^(tel|phone)$/i.test(name) && all(TEL_RE)) return "tel";
  const longest = values.reduce((n, v) => Math.max(n, v.length), 0);
  const multiline = values.some((v) => v.includes("\n"));
  const marked = values.some((v) => /\*\*|\[.+\]\(|^- /m.test(v));
  if (marked || (multiline && longest > 400)) return "richtext";
  if (multiline || longest > 120) return "textarea";
  return "text";
}

/**
 * Field names that name a *kind* of thing. A value here has to be one the
 * components know how to draw — `icon: "debate"` picks a line drawing, and
 * a typo picks nothing — so these are dropdowns even when every record
 * happens to hold a different value and the repetition test below would
 * not fire.
 */
const ENUM_NAMES =
  /^(icon|format|category|cat|kind|status|level|lvl|tone|template|variant|type|desk|rank|school|region|field|term|group|accent)$/i;

/** A repeating small vocabulary is a dropdown, not a free text box. */
function selectOptions(values: string[], name: string): FieldOption[] | null {
  const distinct = [...new Set(values)];
  // One option is not a choice, it is a trap: the editor could never enter
  // anything else. Those stay free text.
  if (distinct.length < 2) return null;
  if (distinct.some((v) => v.length > 40 || /\s{2,}/.test(v))) return null;
  if (ENUM_NAMES.test(name)) return distinct.length <= 16 ? asOptions(distinct) : null;
  if (values.length < 4) return null;
  if (distinct.length > 12) return null;
  if (values.length < distinct.length * 2) return null;
  return asOptions(distinct);
}

function asOptions(distinct: string[]): FieldOption[] {
  return distinct.sort().map((value) => ({ value, label: humanize(value) }));
}

function inferField(name: string, samples: Samples, rowCount: number, depth: number): FieldDef {
  const { values, nulls, missing } = samples;
  const base = {
    name,
    label: humanize(name),
    required: missing === 0 && nulls === 0 && values.length > 0,
    nullable: nulls > 0 || missing > 0 ? true : undefined,
  };

  if (values.length === 0) {
    // Only ever null, or absent everywhere. Keep it, typed loosely.
    return { ...base, kind: "text", required: false, nullable: true };
  }

  // A localized object value, in either spelling.
  const localeKeys = localeObjectKeys(values[0]);
  if (localeKeys && values.every((v) => localeObjectKeys(v))) {
    const strings = values.flatMap((v) =>
      Object.values(v as Record<string, string>),
    );
    const kind = stringKind(strings, name);
    return {
      ...base,
      kind: kind === "image" || kind === "file" || kind === "url" ? "text" : kind,
      localized: true,
      localeKeys: localeKeys.ka === "ka" ? undefined : localeKeys,
      rows: kind === "richtext" ? 8 : kind === "textarea" ? 3 : undefined,
    };
  }

  if (values.every((v) => typeof v === "boolean")) return { ...base, kind: "boolean" };
  if (values.every((v) => typeof v === "number")) return { ...base, kind: "number" };

  if (values.every((v) => typeof v === "string")) {
    const strings = values as string[];
    const kind = stringKind(strings, name);
    if (kind === "text") {
      const options = selectOptions(strings, name);
      if (options) return { ...base, kind: "select", options };
    }
    return {
      ...base,
      kind,
      rows: kind === "richtext" ? 8 : kind === "textarea" ? 3 : undefined,
    };
  }

  if (values.every((v) => Array.isArray(v))) {
    const items = (values as Json[][]).flat();
    if (items.length === 0) return { ...base, kind: "array", of: { name: "item", label: "Item", kind: "text" } };
    if (depth >= 4) return { ...base, kind: "json" };
    // an array of localized objects behaves like an array of text
    const itemLocale = localeObjectKeys(items[0]);
    if (itemLocale && items.every((i) => localeObjectKeys(i))) {
      return {
        ...base,
        kind: "array",
        of: {
          name: "item",
          label: "Item",
          kind: "text",
          localized: true,
          localeKeys: itemLocale.ka === "ka" ? undefined : itemLocale,
        },
      };
    }
    if (items.every((i) => i !== null && typeof i === "object" && !Array.isArray(i))) {
      return { ...base, kind: "array", fields: inferFields(items as Row[], depth + 1) };
    }
    if (items.every((i) => typeof i === "string")) {
      const kind = stringKind(items as string[], name);
      return { ...base, kind: "array", of: { name: "item", label: "Item", kind } };
    }
    return { ...base, kind: "json" };
  }

  if (values.every((v) => v !== null && typeof v === "object" && !Array.isArray(v))) {
    if (depth >= 4) return { ...base, kind: "json" };
    const keys = new Set((values as Row[]).flatMap((v) => Object.keys(v)));
    // A map keyed by something open-ended (a story id, a programme key) is
    // not a fixed group of fields; leave it as JSON rather than invent 300.
    if (keys.size > 24) return { ...base, kind: "json" };
    return { ...base, kind: "object", fields: inferFields(values as Row[], depth + 1) };
  }

  return { ...base, kind: "json" };
}

function inferFields(rows: Row[], depth = 0): FieldDef[] {
  const keys = new Set(rows.flatMap((r) => Object.keys(r)));
  const consumed = new Set<string>();
  const fields: FieldDef[] = [];

  for (const key of keys) {
    if (consumed.has(key)) continue;
    const pair = siblingPair(keys, key);
    if (pair) {
      consumed.add(pair.map.ka);
      consumed.add(pair.map.en);
      const strings = rows.flatMap((r) =>
        [r[pair.map.ka], r[pair.map.en]].filter((v): v is string => typeof v === "string"),
      );
      const kind = stringKind(strings, pair.field);
      fields.push({
        name: pair.field,
        label: humanize(pair.field),
        kind: kind === "image" || kind === "file" || kind === "url" ? "text" : kind,
        localized: true,
        siblings: pair.map,
        rows: kind === "richtext" ? 8 : kind === "textarea" ? 3 : undefined,
      });
      continue;
    }
    consumed.add(key);
    fields.push(inferField(key, collectSamples(rows, key), rows.length, depth));
  }

  return fields;
}

/* ----------------------------------------------------------- emitting */

/** Which fields earn a column in the admin's list screen. */
function markListColumns(entry: MigrationEntry, fields: FieldDef[]): void {
  const wanted = new Set(
    [entry.titleField, entry.keyField, entry.sortField].filter(Boolean) as string[],
  );
  let extra = 0;
  for (const field of fields) {
    const scalar = ["text", "select", "date", "number", "boolean"].includes(field.kind);
    if (wanted.has(field.name) || (scalar && extra < 3 && !wanted.has(field.name))) {
      field.listColumn = true;
      if (!wanted.has(field.name)) extra++;
    }
  }
}

function literal(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\n");
}

function main(): void {
  fs.mkdirSync(RECORDS_OUT, { recursive: true });
  const collections: CollectionDef[] = [];
  const summary: string[] = [];
  const problems: string[] = [];

  for (const entry of MIGRATION) {
    let records: SeedRecord[];
    try {
      records = toRecords(entry, sourceValue(entry));
    } catch (error) {
      problems.push(`${entry.collection}: ${(error as Error).message}`);
      continue;
    }

    const fields = inferFields(records.map((r) => r.data));
    markListColumns(entry, fields);

    const def: CollectionDef = {
      name: entry.collection,
      label: entry.label,
      group: entry.group,
      kind: entry.kind,
      description: entry.description,
      titleField: entry.titleField,
      keyField: entry.keyField,
      sortable: entry.sortable,
      sortField: entry.sortField,
      sortDirection: entry.sortDirection,
      tags: entry.tags,
      legacyModule: entry.fromSource
        ? `src/data/sources/${entry.fromSource}.json`
        : `src/data/${entry.module}.ts`,
      routes: entry.routes,
      fields,
    };
    collections.push(def);

    fs.writeFileSync(
      path.join(RECORDS_OUT, `${entry.collection}.json`),
      JSON.stringify(records, null, 2) + "\n",
    );

    const jsonFields = fields.filter((f) => f.kind === "json").map((f) => f.name);
    summary.push(
      `${entry.collection.padEnd(24)} ${String(records.length).padStart(4)} records  ` +
        `${String(fields.length).padStart(2)} fields` +
        (jsonFields.length ? `  (json: ${jsonFields.join(", ")})` : ""),
    );
  }

  const banner = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`tools/infer-content-model.ts\` from the content that used to
 * live in \`src/data\`. Re-run it after re-extracting; to change a label, a
 * field kind or an ordering, patch it in \`catalogue.ts\` instead, which is
 * applied on top of this and is not generated.
 *
 * ${collections.length} collections, ${collections.reduce((n, c) => n + c.fields.length, 0)} top-level fields.
 */
import type { CollectionDef } from "./types";

export const GENERATED_COLLECTIONS: CollectionDef[] = `;

  fs.writeFileSync(MODEL_OUT, `${banner}${literal(collections)};\n`);

  console.log(summary.join("\n"));
  console.log(
    `\n${collections.length} collections -> seed/records/ and src/content-model/collections.generated.ts`,
  );
  if (problems.length) {
    console.log(`\n${problems.length} problems:`);
    for (const p of problems) console.log(`  ${p}`);
    process.exitCode = 1;
  }
}

main();
