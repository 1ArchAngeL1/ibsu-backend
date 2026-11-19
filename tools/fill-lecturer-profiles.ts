/**
 * A profile for every lecturer a school lists, including the ones the old
 * site never wrote a page for.
 *
 *     set -a; source .env; set +a
 *     tsx tools/fill-lecturer-profiles.ts --dry
 *     tsx tools/fill-lecturer-profiles.ts
 *     tsx tools/fill-lecturer-profiles.ts --out=new-profiles.json
 *     tsx tools/fill-lecturer-profiles.ts --in=new-profiles.json
 *
 * The lecturer migration (tools/import-lecturers.ts) could only bring back
 * what ibsu.edu.ge published, and it published lecturer pages for three of
 * the five schools: Computer Science and the Medical School have none at
 * all, and a handful of names elsewhere have none either. 73 of the 149
 * listed people therefore had nothing behind their name — not an empty
 * profile, no profile — so there was nothing for the site to open and
 * nothing in the admin to fill in.
 *
 * This writes the empty profile: the name in both languages, the school,
 * and the rank off the school's own list. Everything else is left blank
 * for somebody to write (19.11, client: open the modal anyway, the
 * information comes later).
 *
 * It never touches a profile that exists. Re-running it is a no-op once
 * every name has one.
 */
import fs from "node:fs";
import mongoose from "mongoose";
import slugify from "slugify";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const out = args.find((a) => a.startsWith("--out="))?.slice("--out=".length);
const from = args.find((a) => a.startsWith("--in="))?.slice("--in=".length);

interface Row {
  key: string;
  data: Record<string, unknown>;
}

/**
 * A name as a key, the way the website compares the two lists
 * (src/data/faculty.ts) and the way the lecturer import wrote them.
 */
function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/(prof\.?|assoc\.?|assist(ant)?\.?|dr\.?|ms\.?|mr\.?|პროფ\.?|ასოც\.?|დოქტ\.?)/g, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Four letters of the given name and the surname; see the website's `shortened`. */
function shortened(name: string): string | null {
  const words = norm(name).split(" ").filter(Boolean);
  if (words.length < 2 || words[0].length < 4) return null;
  return `${words[words.length - 1]} ${words[0].slice(0, 4)}`;
}

/** The monogram the cards show, Latin where the name gives one. */
function initials(en: string, ka: string): string {
  const from = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
  return from(en) || from(ka);
}

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu");
  const Record = mongoose.model("ContentRecord", ContentRecordSchema);

  const write = async (rows: Row[]): Promise<void> => {
    let made = 0;
    for (const [i, row] of rows.entries()) {
      const result = await Record.updateOne(
        { collectionName: "staffProfiles", key: row.key },
        { $setOnInsert: { collectionName: "staffProfiles", key: row.key, data: row.data, status: "published", publishedAt: new Date(), order: 2000 + i } },
        { upsert: true },
      );
      if (result.upsertedCount > 0) made += 1;
    }
    const total = await Record.countDocuments({ collectionName: "staffProfiles" });
    console.log(`wrote ${made} new profiles (${rows.length - made} already existed); the collection now holds ${total}`);
  };

  if (from) {
    await write(JSON.parse(fs.readFileSync(from, "utf8")) as Row[]);
    await mongoose.disconnect();
    return;
  }

  const profiles = await Record.find({ collectionName: "staffProfiles" }).lean().exec();
  const taken = new Set<string>();
  const byName = new Map<string, string>();
  const byShort = new Map<string, string>();
  for (const row of profiles) {
    const data = row.data as { id?: string; name?: string; nameka?: string; schoolKey?: string };
    if (data.id) taken.add(data.id);
    for (const name of [data.name, data.nameka]) {
      if (!name) continue;
      byName.set(`${data.schoolKey}|${norm(name)}`, data.id ?? "");
      const short = shortened(name);
      if (short) byShort.set(`${data.schoolKey}|${short}`, data.id ?? "");
    }
  }

  const roster = await Record.find({ collectionName: "schoolFacultyRoster" }).lean().exec();
  const rows: Row[] = [];
  const perSchool: Record<string, number> = {};

  for (const entry of roster) {
    const person = entry.data as {
      school?: string;
      rank?: string;
      name?: Record<string, string>;
      note?: Record<string, string>;
    };
    const school = person.school ?? "";
    const nameEn = person.name?.en ?? "";
    const nameKa = person.name?.ka ?? "";
    const found = [nameEn, nameKa].some((name) => {
      if (!name) return false;
      const short = shortened(name);
      return byName.has(`${school}|${norm(name)}`) || (short ? byShort.has(`${school}|${short}`) : false);
    });
    // Somebody listed by two schools keeps the one profile they have.
    const elsewhere = [nameEn, nameKa].some((name) =>
      name ? [...byName.keys()].some((k) => k.endsWith(`|${norm(name)}`)) : false,
    );
    if (found || elsewhere) continue;

    const base =
      slugify(nameEn || "", { lower: true, strict: true }) ||
      slugify(nameKa || "", { lower: true, strict: true }) ||
      "lecturer";
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
    taken.add(id);

    perSchool[school] = (perSchool[school] ?? 0) + 1;
    rows.push({
      key: id,
      data: {
        id,
        schoolKey: school,
        name: nameEn || nameKa,
        nameka: nameKa || nameEn,
        initials: initials(nameEn, nameKa),
        ...(person.rank ? { rank: person.rank } : {}),
        ...(person.note ? { role: person.note.en ?? "", roleka: person.note.ka ?? "" } : {}),
        // Empty, and meant to be: this is the page an editor fills in.
        bio: [],
        pubs: [],
        teaching: [],
        current: [],
        extra: [],
      },
    });
  }

  console.log(
    `${roster.length} listed names · ${rows.length} have no profile yet ` +
      `(${Object.entries(perSchool).map(([s, n]) => `${s} ${n}`).join(", ")})`,
  );

  if (out) {
    fs.writeFileSync(out, `${JSON.stringify(rows, null, 1)}\n`);
    console.log(`wrote ${rows.length} to ${out} — apply it with --in=${out}`);
  } else if (dry) {
    console.log(JSON.stringify(rows.slice(0, 2), null, 1));
  } else {
    await write(rows);
  }
  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
