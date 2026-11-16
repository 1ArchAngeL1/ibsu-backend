/**
 * The content model the API serves, and the one place to correct it.
 *
 * `collections.generated.ts` is written by a tool and overwritten whenever
 * the migration is re-run. Anything hand-decided goes here instead and is
 * merged over the top: a better label, a field the inference read as text
 * that is really a dropdown, a field editors should not see.
 *
 * Keep each patch next to a reason. A patch without one looks like damage
 * the next time somebody regenerates.
 */
import { GENERATED_COLLECTIONS } from "./collections.generated";
import type { CollectionDef, ContentModel, FieldDef } from "./types";
import { LOCALES, walkFields } from "./types";

interface CollectionPatch {
  label?: string;
  group?: string;
  description?: string;
  /** by field name, including nested ones; see `walkFields` */
  fields?: Record<string, Partial<FieldDef>>;
  /** fields the admin should not render at all */
  hide?: string[];
}

const PATCHES: Record<string, CollectionPatch> = {
  mediaStories: {
    description:
      "The newsroom's 310 stories. The title and excerpt sit under English and Georgian because that is how the prototype stored them — one group per language rather than one field per sentence.",
  },
  mediaBodies: {
    fields: {
      // A body is a list of blocks, each `{ t: "p" | "img", … }`. Only "p"
      // occurs in the migrated stories, so the inference saw a single
      // option; the renderer handles images too, and an editor should be
      // able to add one.
      t: {
        kind: "select",
        label: "Block",
        options: [
          { value: "p", label: "Paragraph" },
          { value: "img", label: "Image" },
          { value: "h", label: "Heading" },
          { value: "quote", label: "Quotation" },
        ],
      },
    },
  },
  staffProfiles: {
    description:
      "Profiles at /staff/<id>. The contact block (office, telephone, office hours) is carried here but the site does not render it yet.",
  },
  documentation: {
    fields: {
      locale: {
        label: "Language",
        help: "Each language has its own list. These are not translations of one another.",
      },
    },
  },
  programmes: {
    fields: {
      lvl: { label: "Degree level" },
      acc: {
        label: "Accreditation expiry",
        help: "ISO date. The expiring-accreditation warnings on the site read this.",
      },
      langs: { label: "Languages of instruction" },
    },
  },
  partners: {
    // The prototype's column names, one letter each.
    fields: {
      c: { label: "Country" },
      ka: { label: "Country (Georgian)" },
      fl: { label: "Flag" },
      r: { label: "Region" },
      u: { label: "Universities" },
    },
  },
  staffOrder: {
    description: "The order profiles appear in. Ids only — edit the profiles themselves above.",
  },
};

function patch(collection: CollectionDef): CollectionDef {
  const p = PATCHES[collection.name];
  if (!p) return collection;

  const fields = p.hide
    ? collection.fields.filter((f) => !p.hide!.includes(f.name))
    : collection.fields;

  if (p.fields) {
    walkFields(fields, (field) => {
      const override = p.fields![field.name];
      if (override) Object.assign(field, override);
    });
  }

  return {
    ...collection,
    label: p.label ?? collection.label,
    group: p.group ?? collection.group,
    description: p.description ?? collection.description,
    fields,
  };
}

/** The model, patched. Built once at import. */
export const COLLECTIONS: CollectionDef[] = GENERATED_COLLECTIONS.map(patch);

export const CONTENT_MODEL: ContentModel = {
  locales: LOCALES,
  collections: COLLECTIONS,
};

const BY_NAME = new Map(COLLECTIONS.map((c) => [c.name, c]));

export function findCollection(name: string): CollectionDef | undefined {
  return BY_NAME.get(name);
}

/** The sidebar: groups in the order they first appear, collections within. */
export function collectionGroups(): { group: string; collections: CollectionDef[] }[] {
  const groups: { group: string; collections: CollectionDef[] }[] = [];
  for (const collection of COLLECTIONS) {
    let group = groups.find((g) => g.group === collection.group);
    if (!group) {
      group = { group: collection.group, collections: [] };
      groups.push(group);
    }
    group.collections.push(collection);
  }
  return groups;
}
