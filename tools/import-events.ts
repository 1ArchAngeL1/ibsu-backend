/**
 * The old site's events — 153 of them, into the `events` collection.
 *
 *     set -a; source .env; set +a
 *     tsx tools/import-events.ts --dry --limit=3
 *     tsx tools/import-events.ts
 *     tsx tools/import-events.ts --out=events.json   # where the old site answers
 *     tsx tools/import-events.ts --in=events.json    # where the database lives
 *
 * These were missed by every earlier migration, and for a reason worth
 * writing down: `event` is the one post type ibsu.edu.ge does not expose
 * over the REST API (`show_in_rest` is false), so a tool that enumerates
 * `/wp-json/wp/v2/types` — which is how the other six were found — sees
 * nothing at all. Meanwhile the site's own `events` collection held the
 * prototype's three invented rows, so nothing looked missing.
 *
 * Two public things do list them, and this uses both: the Yoast sitemap at
 * /event-sitemap.xml names every one, and the Events Manager plugin serves
 * each as an iCalendar file at <event-url>/ical/. The calendar is far
 * better than the rendered page — it gives the title, the start and end as
 * real timestamps, the description and the image as named fields, where
 * the page gives WPBakery markup to be guessed at.
 *
 * Both languages come in one string, in the qTranslate markers the old
 * site writes them in: `[:ge]…[:en]…[:]`. 108 of the 153 carry an English
 * half; the rest are Georgian only, and the English falls back to it.
 *
 * The three prototype rows are left alone — they are ordinary records and
 * an editor can delete them. Nothing here overwrites a record it did not
 * write: the key carries the old site's own id (`wp-172`).
 */
import fs from "node:fs";
import mongoose from "mongoose";
import { ContentRecordSchema } from "../src/schemas/content-record.schema";
import { MediaAssetSchema } from "../src/schemas/media-asset.schema";
import { fetchRetry, keyFor, pool, publicUrl, sleep } from "./wp-common";

const SITEMAP = "https://ibsu.edu.ge/event-sitemap.xml";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice("--limit=".length)) || Infinity;
const out = args.find((a) => a.startsWith("--out="))?.slice("--out=".length);
const from = args.find((a) => a.startsWith("--in="))?.slice("--in=".length);

interface Row {
  key: string;
  data: Record<string, unknown>;
}

/**
 * One VEVENT's fields, by name.
 *
 * Takes the bytes, not a string, because of where iCalendar puts its line
 * breaks: it folds at 75 **octets** and marks the continuation with a
 * space, and 75 octets lands wherever it lands — including halfway
 * through a Georgian letter, which is three bytes wide. Decoding first
 * turns each half into a replacement character and the join can never
 * undo it. That cost 14 of the 74 event posters their filenames
 * (19.11): the fold fell inside the first letter of
 * `სამეცნიერო-ლიტერატურა.jpg`, and the URL 404'd ever after.
 */
export function parseCalendar(input: Uint8Array | string): Record<string, string> | null {
  const body = (typeof input === "string" ? input.replace(/\r?\n[ \t]/g, "") : unfold(input))
    .replace(/\r\n/g, "\n");
  if (!body.includes("BEGIN:VEVENT")) return null;
  const unfolded = body;
  const fields: Record<string, string> = {};
  let inside = false;
  for (const line of unfolded.split("\n")) {
    if (line.startsWith("BEGIN:VEVENT")) inside = true;
    else if (line.startsWith("END:VEVENT")) break;
    else if (inside && line.includes(":")) {
      const at = line.indexOf(":");
      // `DTSTART;TZID=…` — the parameters are not part of the name
      fields[line.slice(0, at).split(";")[0]] = line.slice(at + 1);
    }
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

/** Joins the folded lines while they are still bytes, then decodes once. */
function unfold(bytes: Uint8Array): string {
  const out = new Uint8Array(bytes.length);
  let n = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    const isFold = (at: number) => bytes[at] === 0x20 || bytes[at] === 0x09;
    if (bytes[i] === 0x0d && bytes[i + 1] === 0x0a && isFold(i + 2)) {
      i += 2;
      continue;
    }
    if (bytes[i] === 0x0a && isFold(i + 1)) {
      i += 1;
      continue;
    }
    out[n] = bytes[i];
    n += 1;
  }
  return new TextDecoder("utf-8").decode(out.subarray(0, n));
}

/** iCalendar escapes a comma, a semicolon and a newline inside a value. */
function unescape(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\([,;\\])/g, "$1")
    .replace(/ /g, " ")
    .trim();
}

/**
 * The two languages out of one string.
 *
 * The old site keeps them together in qTranslate's markers — `[:ge]…[:en]…[:]`
 * — and also writes `[:ge]` alone where only Georgian exists. A half that
 * is missing falls back to the other, because an event with no English
 * title should read in Georgian rather than show nothing.
 */
export function split(value: string): { ka: string; en: string } {
  const text = unescape(value);
  if (!text.includes("[:")) return { ka: text, en: text };
  const halves: Record<string, string> = {};
  const marks = [...text.matchAll(/\[:([a-z]{0,2})\]/gi)];
  for (const [i, mark] of marks.entries()) {
    const start = (mark.index as number) + mark[0].length;
    const stop = i + 1 < marks.length ? (marks[i + 1].index as number) : text.length;
    const part = text.slice(start, stop).trim();
    if (mark[1]) halves[mark[1].toLowerCase()] = part;
  }
  const ka = halves.ge ?? halves.ka ?? "";
  const en = halves.en ?? "";
  return { ka: ka || en, en: en || ka };
}

/**
 * The venue named in an event's own text.
 *
 * Read from one language's half, never from the whole string — the two
 * run together there, and the Georgian venue would end up carrying the
 * opening of the English sentence after it.
 */
export function placeIn(body: string): string {
  const line = /^[^\S\n]*(?:ლოკაცია|მისამართი|ადგილი|location|venue)\s*:\s*(.+)$/im.exec(body);
  return line ? line[1].trim().replace(/[;.,\s]+$/, "") : "";
}

/**
 * `20261124T110000Z` → the day and the time it is held, in Tbilisi.
 *
 * The calendar states an instant in UTC and the university states a wall
 * clock: this event is "3:00 pm" on its own page, which is 11:00 UTC. So
 * the stored day and time are the local ones — the same figures the old
 * site printed, and the ones an editor would type.
 *
 * Fixed at UTC+4 rather than asked of a timezone database, because that is
 * Georgia's offset the whole year round: the country has kept no daylight
 * saving since 2005.
 */
const TBILISI_OFFSET_MINUTES = 4 * 60;

export function tbilisi(stamp: string): { date: string; time: string } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z?)$/.exec(stamp.trim());
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", zulu] = m;
  const at = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  if (Number.isNaN(at)) return null;
  // A stamp with no Z is already local; only a UTC one is shifted.
  const local = new Date(zulu ? at + TBILISI_OFFSET_MINUTES * 60_000 : at);
  const two = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${local.getUTCFullYear()}-${two(local.getUTCMonth() + 1)}-${two(local.getUTCDate())}`,
    time: `${two(local.getUTCHours())}:${two(local.getUTCMinutes())}`,
  };
}

async function urls(): Promise<string[]> {
  const res = await fetchRetry(SITEMAP);
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function rowFor(fields: Record<string, string>, url: string): Row | null {
  const start = tbilisi(fields.DTSTART ?? "");
  if (!start) return null;
  const end = tbilisi(fields.DTEND ?? "");
  // `172@ibsu.edu.ge` — the post id the old admin knows it by
  const id = (fields.UID ?? "").split("@")[0].trim();
  const key = `wp-${id || url.replace(/\/$/, "").split("/").pop()}`;
  const title = split(fields.SUMMARY ?? "");
  const body = split(fields.DESCRIPTION ?? "");
  return {
    key,
    data: {
      id: key,
      title,
      /**
       * The day it falls on and the clock either side of it, which is
       * what an editor reads and writes. The site works the rest out:
       * the date tile's day and month come from `date`, in the reader's
       * language.
       */
      date: start.date,
      time: start.time,
      endTime: end && end.date === start.date ? end.time : "",
      body,
      /**
       * Where it is held, which the old site states in the text rather
       * than in a field: the Events Manager venue is unused on all 153,
       * and 26 of the descriptions write a "ლოკაცია:" or "Location:" line
       * instead. That line is lifted here, because the row and the page
       * both have a place to show it; the rest are empty, for an editor
       * to fill rather than for this tool to invent.
       */
      place: { ka: placeIn(body.ka), en: placeIn(body.en) },
      cover: fields.ATTACH ?? null,
      source: fields.URL ?? url,
    },
  };
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Record = mongoose.model("ContentRecord", ContentRecordSchema);
  const Media = mongoose.model("MediaAsset", MediaAssetSchema);
  const base = process.env.R2_PUBLIC_BASE_URL;

  /** A cover on the bucket where one was mirrored; see import-wp-types. */
  const relink = async (cover: unknown): Promise<string | null> => {
    if (typeof cover !== "string" || !cover) return null;
    if (!base) return cover;
    const key = keyFor(cover);
    if (!key) return cover;
    const mirrored = publicUrl(base, key);
    return (await Media.exists({ path: mirrored })) ? mirrored : cover;
  };

  const apply = async (rows: Row[]): Promise<void> => {
    let made = 0;
    let changed = 0;
    for (const [i, row] of rows.entries()) {
      row.data.cover = await relink(row.data.cover);
      const existing = await Record.findOne({ collectionName: "events", key: row.key }).exec();
      if (existing) {
        existing.set({ data: row.data, status: "published", publishedAt: new Date() });
        await existing.save();
        changed += 1;
      } else {
        await Record.create({
          collectionName: "events",
          key: row.key,
          data: row.data,
          status: "published",
          publishedAt: new Date(),
          order: 1000 + i,
        });
        made += 1;
      }
    }
    const total = await Record.countDocuments({ collectionName: "events" });
    console.log(`\nwrote ${rows.length} events: ${made} new, ${changed} updated; the collection now holds ${total}`);
  };

  if (from) {
    await apply(JSON.parse(fs.readFileSync(from, "utf8")) as Row[]);
    await mongoose.disconnect();
    return;
  }

  const list = (await urls()).slice(0, limit);
  console.log(`${list.length} events in the sitemap`);
  const found: (Row | null)[] = [];
  await pool(list, 4, async (url, i) => {
    const res = await fetchRetry(`${url.replace(/\/$/, "")}/ical/`);
    const fields = res.ok ? parseCalendar(new Uint8Array(await res.arrayBuffer())) : null;
    found[i] = fields ? rowFor(fields, url) : null;
    process.stdout.write(`\r  read ${found.filter(Boolean).length}/${list.length}   `);
    await sleep(300);
  });
  process.stdout.write("\n");

  const rows = found.filter((row): row is Row => row !== null);
  const missed = list.length - rows.length;
  if (missed > 0) console.log(`  ! ${missed} gave no calendar entry`);

  if (out) {
    fs.writeFileSync(out, `${JSON.stringify(rows, null, 1)}\n`);
    console.log(`wrote ${rows.length} events to ${out} — apply it with --in=${out}`);
  }

  if (dry) {
    console.log("\n--- first event, as it would be stored ---");
    console.log(JSON.stringify(rows[0], null, 1));
    const withImage = rows.filter((r) => (r.data as { cover?: string }).cover).length;
    const bilingual = rows.filter((r) => {
      const t = (r.data as { title: { ka: string; en: string } }).title;
      return t.ka !== t.en;
    }).length;
    console.log(`\n${rows.length} events · ${withImage} with an image · ${bilingual} written in both languages`);
  } else if (!out) {
    await apply(rows);
  }

  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
