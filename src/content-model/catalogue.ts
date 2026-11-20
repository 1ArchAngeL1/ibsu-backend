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
  /**
   * Fields the inference never saw, because nothing in the migrated
   * content had them. Content imported later does.
   *
   * Keyed by the field they belong inside — `""` for the top level.
   *
   * This one is not cosmetic like the patches above. A field the model
   * does not declare is dropped the moment a record is saved (see
   * `coerceFields`), so an editor who opened a record and pressed save
   * would silently delete it. Anything written into a collection from
   * outside the admin has to be declared here.
   */
  add?: Record<string, FieldDef[]>;
  /**
   * Field names to bring to the top of the form, in this order.
   *
   * The inference orders a collection's fields the way the migrated JSON
   * happened to list them, which is the prototype's order and not an
   * editor's. Anything not named here keeps its place behind those that
   * are — so this says what comes first, and never has to list the rest.
   */
  order?: string[];
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
    /**
     * Named for what an editor comes here looking for. "Staff profiles"
     * sent people to the academy's `lecturers` collection in Applicants,
     * which is a different thing entirely — these are the 125 people behind
     * /staff/<id> and the names on each school's faculty list.
     */
    label: "Lecturer profiles",
    /**
     * What somebody filling a lecturer in needs first, in the order they
     * would ask for it. The prototype's fields — a role, a field of study,
     * a lede, a photograph — are empty on all but three of the 125 and
     * were meeting the editor before the name did.
     */
    order: [
      "id",
      "name",
      "schoolKey",
      "rank",
      "contact",
      "bio",
      "teaching",
      "current",
      "pubs",
      "extra",
    ],
    description:
      "One page per lecturer, at /staff/<id>, linked from each school's faculty list. Three came from the prototype and are complete; 122 were read off the old site's lecturer pages, and most of those hold a name, a rank and an address because the rest of the page was empty there too. The site shows only the sections that have something in them, so filling one in here is what makes it appear. Add, edit and remove them like any other collection.",
    fields: {
      // The inference named these from the prototype's abbreviated keys, so
      // an editor was being asked to fill in "Y", "T" and "V".
      y: { label: "Year" },
      t: { label: "Title" },
      v: { label: "Journal or publisher", help: "Blank on the migrated ones; they carry a link instead." },
      c: { label: "Course" },
      lvl: { label: "Degree", help: "Bachelor's, master's, doctoral — as the course list grouped it." },
      n: { label: "Figure" },
      l: { label: "Caption" },
      d: { label: "Description" },
      bio: {
        label: "Biography",
        // 86 of the 122 migrated profiles have none; the page omits the
        // section rather than showing an empty heading.
        required: false,
        help: "One entry per paragraph.",
      },
      pubs: { label: "Publications", required: false },
      stats: { label: "Figures", required: false },
      research: { label: "Research interests", required: false },
      teaching: { label: "Course catalogue", required: false },
      /**
       * The list shows the first five columns a collection asks for, so
       * asking for a column is choosing what somebody scanning 125 rows
       * sees. Role, Field and the legacy School name are empty on 122 of
       * them — they belonged to the prototype's three — and the id is
       * already under the name in the first cell.
       */
      rank: { listColumn: true },
      id: { listColumn: false },
      role: { listColumn: false },
      field: { listColumn: false },
      /**
       * None of these can be demanded of a new lecturer. The inference
       * marked them required because all three prototype rows had them,
       * but the old site gave us no photographs at all, `schoolHref` is
       * superseded by the School dropdown, and a lecturer who publishes no
       * address has no contact block.
       */
      portrait: {
        required: false,
        nullable: true,
        help: "Optional. Without one the page shows the person's initials, as the faculty cards do.",
      },
      contact: { required: false },
      /**
       * Inside that block, everything is optional too. The prototype's
       * three rows filled all five in, so the inference marked them
       * required and the form put a red asterisk beside a telephone number
       * that 122 lecturers do not publish. Saving never actually enforced
       * it — the asterisk was simply untrue.
       */
      email: { required: false },
      phone: { required: false },
      ext: { required: false, label: "Extension" },
      office: { required: false },
      hours: { required: false, label: "Office hours" },
      // Kept because the prototype's three rows use them, and a field that
      // disappears from the model is a field dropped on save.
      school: {
        label: "School name (legacy)",
        listColumn: false,
        help: "The prototype wrote the school's name here. Use the School dropdown below instead — it is what the page reads.",
      },
      schoolHref: {
        label: "School page (legacy)",
        required: false,
        help: "The prototype's link to a school page. Superseded by the School dropdown; leave it empty.",
      },
    },
    add: {
      // Written by the lecturer import. Declared so the admin can edit
      // them and, more to the point, so saving a record does not drop them.
      "": [
        {
          name: "schoolKey",
          label: "School",
          kind: "select",
          help: "Which school's faculty list this person belongs to, and the page the profile links back to.",
          options: [
            { value: "business", label: "School of Business" },
            { value: "law", label: "Law School" },
            { value: "eduhum", label: "Education & Humanities" },
            { value: "computing", label: "Computer Science" },
            { value: "medicine", label: "Medical School" },
          ],
          listColumn: true,
        },
        {
          name: "rank",
          label: "Rank",
          kind: "select",
          help: "Taken from the school's own lecturer list. The profile page shows it where no role is written.",
          options: [
            { value: "head", label: "Programme head" },
            { value: "professor", label: "Professor" },
            { value: "associate", label: "Associate professor" },
            { value: "assistant", label: "Assistant professor" },
            { value: "affiliatedProfessor", label: "Affiliated professor" },
            { value: "affiliatedAssociate", label: "Affiliated associate professor" },
          ],
        },
        {
          name: "current",
          label: "Teaching this year",
          kind: "array",
          help: "What they are teaching now, in prose. The old pages wrote it as a paragraph per degree rather than a list.",
          of: { name: "item", label: "Paragraph", kind: "textarea", localized: true },
        },
        {
          name: "extra",
          label: "Additional information",
          kind: "array",
          help: "The old profile's last tab. Empty for almost everybody — it held a placeholder there.",
          of: { name: "item", label: "Paragraph", kind: "textarea", localized: true },
        },
        {
          name: "source",
          label: "Imported from",
          kind: "text",
          help: "The page on ibsu.edu.ge this profile was read from. For checking against the original; nothing renders it.",
        },
      ],
      // A migrated publication names no journal but carries a link to the
      // book, which is what the page shows in the venue's place.
      pubs: [
        {
          name: "url",
          label: "Link",
          kind: "text",
          nullable: true,
          help: "Where the publication can be read or bought.",
        },
        {
          /**
           * `g` / `gka`, the sibling pair the rest of this collection
           * spells its languages in (see `t` / `tka` above).
           */
          name: "g",
          label: "Heading",
          kind: "text",
          localized: true,
          siblings: { ka: "gka", en: "g" },
          required: false,
          help: 'The group this one is filed under, as the old profile headed it — "Books", "Articles". Blank for most, and then the page lists them straight through.',
        },
      ],
    },
  },
  events: {
    /**
     * The university's events — 153 of them, read off ibsu.edu.ge
     * (tools/import-events.ts). The collection used to hold the
     * prototype's three invented rows and the fields they needed: a bare
     * day, a month spelled per language, and nothing to say what the
     * event was.
     */
    description:
      "Every event the old site published, each its own record. The date tile's day and month come from the date, in the reader's language, so there is nothing to spell twice.",
    order: ["id", "title", "date", "time", "endTime", "place", "body", "cover", "source"],
    // The prototype wrote the date out as a day and a month-per-language
    // beside the time. The date field says both, and says them in the
    // reader's language rather than in the one an editor typed.
    hide: ["day", "month"],
    fields: {
      time: { required: false, help: "24-hour, Tbilisi time — 15:00." },
      place: { required: false, help: "Where it is held. The old site named one for 23 of the 153; the rest say nothing." },
      title: { listColumn: true },
    },
    add: {
      "": [
        {
          name: "date",
          label: "Date",
          kind: "date",
          required: true,
          listColumn: true,
          help: "The day it falls on, in Tbilisi.",
        },
        {
          name: "endTime",
          label: "Ends",
          kind: "text",
          required: false,
          help: "24-hour, and only where it is known. Left empty for an event that runs past midnight.",
        },
        {
          name: "body",
          label: "Text",
          kind: "textarea",
          localized: true,
          required: false,
          help: "What the event is, as the old site wrote it. A blank line starts a new paragraph.",
        },
        {
          name: "cover",
          label: "Image",
          kind: "image",
          nullable: true,
          required: false,
          help: "The poster. 74 of the migrated events carry one.",
        },
        {
          name: "source",
          label: "Imported from",
          kind: "text",
          required: false,
          help: "The page on ibsu.edu.ge this was read from. For checking against the original; nothing renders it.",
        },
      ],
    },
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

  /**
   * The two feeds the old site's own post types belong to.
   *
   * Each held a dozen prototype samples and a note in the website's
   * accessor saying the real ones were still on WordPress. They are here
   * now, and they brought a body with them — the notices are short, the
   * competitions are not — which neither feed had a field for, because
   * the samples were summaries that linked nowhere.
   */
  announcements: {
    description:
      "The notices on /news/announcements. Carried over from the old site's განცხადებები, which is where the category, the date and the text come from; the finer label and the unit are ours to add.",
    add: {
      "": [
        {
          name: "body",
          label: "Full text",
          kind: "richtext",
          localized: true,
          help: "The notice as the old site published it. The feed shows the summary; this is the whole of it.",
        },
        {
          name: "cover",
          label: "Image",
          kind: "image",
          nullable: true,
        },
        {
          name: "source",
          label: "Imported from",
          kind: "text",
          help: "The page on ibsu.edu.ge this came from. Nothing renders it.",
        },
      ],
    },
    fields: {
      kind: {
        required: false,
        help: "A finer label than the category — \"Exchange · open\". Empty on the imported notices; the chip is left off when it is.",
      },
      unit: { required: false, help: "The school or office this concerns, if any." },
      excerpt: { label: "Summary", help: "What the feed shows under the headline." },
    },
    order: ["id", "category", "date", "title", "excerpt", "body", "kind", "unit", "cover"],
  },

  departments: {
    // The five schools' rows feed a second page now: each school page
    // prints its office's email, extension and room in the sidebar card
    // (the website's src/app/[locale]/schools/[school]/page.tsx). An
    // editor changing an extension here changes it in both places, and
    // the generated description named only /contact.
    description:
      "The contact directory on /contact. The rows whose id is a school key — business, eduhum, computing, law, medicine — are also the contact lines in the sidebar of that school's own page.",
    fields: {
      room: {
        help: "Shown as “Room A309”. Two rooms are written “A312; A314”, the way the old site wrote them.",
      },
    },
  },

  vacancies: {
    description:
      "The positions on /vacancies. Carried over from the old site's ვაკანსიები. An imported competition arrives as one long text in Full text; the summary, requirements and documents beside it are what the page shows when somebody has split it up.",
    add: {
      "": [
        {
          name: "body",
          label: "Full text",
          kind: "richtext",
          localized: true,
          help: "The competition as the old site published it. Shown on the page whenever the summary below is empty.",
        },
        {
          name: "cover",
          label: "Image",
          kind: "image",
          nullable: true,
        },
        {
          name: "source",
          label: "Imported from",
          kind: "text",
          help: "The page on ibsu.edu.ge this came from. Nothing renders it.",
        },
      ],
    },
    fields: {
      deadline: {
        required: false,
        help: "Left empty on the imported ones: 35 of the 36 name a date somewhere in the text, but not reliably the closing one.",
      },
      text: { label: "Structured text", required: false },
    },
    order: ["id", "status", "category", "deadline", "body", "text", "cover"],
  },
};

/**
 * Collections the inference never saw, because the content they hold was
 * never in the website's own `src/data` — it was only ever on the old
 * WordPress site.
 *
 * Declared by hand here rather than regenerated, for the reason the file
 * header gives: `collections.generated.ts` is overwritten whenever the
 * migration runs, and this is a hand-decided thing.
 */
const EXTRA_COLLECTIONS: CollectionDef[] = [
  {
    name: "navigator",
    label: "Programme navigator",
    group: "Applicants",
    kind: "list",
    description:
      "IBSU ნავიგატორი — one entry per programme answering why somebody should choose it. Carried over from the old site; nothing on the new site renders these yet.",
    titleField: "title",
    keyField: "id",
    sortField: "date",
    sortDirection: "desc",
    tags: ["navigator"],
    fields: [
      { name: "id", label: "ID", kind: "text", required: true },
      { name: "title", label: "Title", kind: "text", localized: true, listColumn: true },
      { name: "date", label: "Date", kind: "date", listColumn: true },
      { name: "excerpt", label: "Summary", kind: "textarea", localized: true },
      { name: "body", label: "Full text", kind: "richtext", localized: true },
      { name: "cover", label: "Image", kind: "image", nullable: true },
      {
        name: "source",
        label: "Imported from",
        kind: "text",
        help: "The page on ibsu.edu.ge this came from.",
      },
    ],
  },
];

function patch(collection: CollectionDef): CollectionDef {
  const p = PATCHES[collection.name];
  if (!p) return collection;

  // A copy, so adding to it cannot append twice if this ever runs again.
  const fields = p.hide
    ? collection.fields.filter((f) => !p.hide!.includes(f.name))
    : [...collection.fields];

  if (p.add) {
    for (const [parent, added] of Object.entries(p.add)) {
      if (parent === "") {
        fields.push(...added.map((field) => ({ ...field })));
        continue;
      }
      let placed = false;
      walkFields(fields, (field) => {
        if (field.name !== parent) return;
        field.fields = [...(field.fields ?? []), ...added.map((f) => ({ ...f }))];
        placed = true;
      });
      if (!placed) {
        throw new Error(
          `catalogue: ${collection.name} has no field "${parent}" to add ${added
            .map((f) => f.name)
            .join(", ")} to.`,
        );
      }
    }
  }

  if (p.order) {
    const named = p.order
      .map((name) => fields.find((field) => field.name === name))
      .filter((field): field is FieldDef => field !== undefined);
    const rest = fields.filter((field) => !named.includes(field));
    fields.length = 0;
    fields.push(...named, ...rest);
  }

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

/** The model, patched, with the hand-declared collections after it. */
export const COLLECTIONS: CollectionDef[] = [
  ...GENERATED_COLLECTIONS,
  ...EXTRA_COLLECTIONS,
].map(patch);

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
