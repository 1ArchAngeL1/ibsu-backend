/**
 * The content model: what an editor is allowed to change, and how the admin
 * renders a form for it.
 *
 * This is the one description of the site's content shape, and it is served
 * to the admin over the API (`GET /content-model`) rather than imported by
 * it. The admin is a generic form renderer; it knows nothing about
 * announcements or conferences in particular. Add a collection here and the
 * admin grows a screen for it without a line of UI code.
 *
 * Most of this file's companion `collections.generated.ts` was inferred from
 * the data that used to live in `src/data/*.ts` — see
 * `tools/infer-content-model.ts`. `catalogue.ts` then patches the parts a
 * machine cannot know: what a collection is called in the sidebar, which
 * field is its title, which pages it appears on.
 */

/** The locales the site publishes. Mirrors the website's `routing.locales`. */
export const LOCALES = ["ka", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** A value an editor types once per language. */
export type LocalizedValue = Record<Locale, string>;

export type FieldKind =
  /** one line, per language when `localized` */
  | "text"
  /** several lines of plain text */
  | "textarea"
  /** a body with inline marks — stored as the markdown subset `rich.tsx` renders */
  | "richtext"
  | "number"
  | "boolean"
  /** ISO `YYYY-MM-DD`; the site formats it for the active locale */
  | "date"
  /** one of `options` */
  | "select"
  /** any number of `options` */
  | "multiselect"
  /** a hex colour; the admin shows a swatch */
  | "color"
  /** a path into the media library, e.g. `/photos/hero-building.webp` */
  | "image"
  /** a document in the media library, e.g. a PDF */
  | "file"
  | "url"
  | "email"
  | "tel"
  /** a fixed group of `fields` */
  | "object"
  /** a repeater: any number of `fields` (or of `of`, for scalars) */
  | "array"
  /**
   * The escape hatch. Content whose shape the model does not describe stays
   * editable as raw JSON rather than becoming uneditable. Every field the
   * inference could not place lands here, which is what makes the promise
   * "everything is editable" true rather than aspirational.
   */
  | "json";

export interface FieldOption {
  value: string;
  /** shown in the admin; the site labels these from its own message files */
  label: string;
}

/**
 * Which key holds which language, when a field is localized.
 *
 * The content arrived from four different places and each spelled this its
 * own way. Rather than rewrite 13 MB of content into one convention — and
 * with it every accessor in `src/data` that reads the old spelling — the
 * model records the spelling and the admin renders all four as the same
 * pair of inputs.
 *
 *   { ka, en }          most data modules
 *   { ge, en }          the newsroom rows
 *   name_ge / name_en   the prototype's club register
 *   nameka / name       the prototype's staff profiles
 *
 * The first two are keys *inside* the field's own object value, described
 * by `localeKeys`. The last two are *sibling* keys next to each other in
 * the record, described by `siblings` — there is no `name` key at all, so
 * the field is a fiction the admin maintains and the backend takes apart
 * again on save.
 */
export type LocaleKeyMap = Record<Locale, string>;

export interface FieldDef {
  /** the key inside the record's `data` */
  name: string;
  label: string;
  kind: FieldKind;
  /** the value carries one string per language */
  localized?: boolean;
  /**
   * Localized, and the value is an object — these are the keys inside it.
   * Absent means the plain `{ ka, en }`.
   */
  localeKeys?: LocaleKeyMap;
  /**
   * Localized, and the languages live in two sibling keys of the record
   * rather than in one object. `name` itself is never stored.
   */
  siblings?: LocaleKeyMap;
  /** saving fails without it */
  required?: boolean;
  /** `null` is a meaningful value for this field (an absent unit, no photo) */
  nullable?: boolean;
  /** one line under the input, for whatever the field name does not say */
  help?: string;
  /** `select` / `multiselect` */
  options?: FieldOption[];
  /** `object`, and `array` whose items are objects */
  fields?: FieldDef[];
  /** `array` whose items are scalars */
  of?: FieldDef;
  /** show this field as a column in the collection's list screen */
  listColumn?: boolean;
  /** the admin's textarea starts this tall */
  rows?: number;
}

export type CollectionKind =
  /** many records the editor can add to, reorder and remove */
  | "list"
  /** exactly one record: a page's configuration, a set of constants */
  | "singleton";

export interface CollectionDef {
  /** url segment and `records.collection` value, e.g. `announcements` */
  name: string;
  label: string;
  /** the admin sidebar group this sits under */
  group: string;
  kind: CollectionKind;
  /** one line in the admin explaining what this feeds */
  description?: string;
  /**
   * The field holding the record's human name, for list screens and
   * revision summaries. Localized fields are read in the admin's language.
   */
  titleField: string;
  /**
   * The field carrying the record's stable public identity — the `id` or
   * `slug` the website's URLs are built from. Changing one breaks links, so
   * the admin warns before it allows it.
   */
  keyField?: string;
  /** editors drag records into order; otherwise `sortField` decides */
  sortable?: boolean;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  /**
   * Cache tags to invalidate on the website when a record here is
   * published. `publish` posts these to Next's revalidation hook.
   */
  tags: string[];
  /** the `src/data` module whose content this collection took over */
  legacyModule?: string;
  /** the site routes this feeds, for the admin's "where does this show?" line */
  routes?: string[];
  fields: FieldDef[];
}

export interface ContentModel {
  locales: readonly Locale[];
  collections: CollectionDef[];
}

/** Every `FieldDef` in a collection, nested ones included, depth first. */
export function walkFields(
  fields: FieldDef[],
  visit: (field: FieldDef, path: string[]) => void,
  trail: string[] = [],
): void {
  for (const field of fields) {
    const here = [...trail, field.name];
    visit(field, here);
    if (field.fields) walkFields(field.fields, visit, here);
    if (field.of) walkFields([field.of], visit, here);
  }
}
