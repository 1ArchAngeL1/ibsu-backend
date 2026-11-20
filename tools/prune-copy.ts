/**
 * Deletes copy keys the site has stopped asking for.
 *
 *     npx tsx tools/prune-copy.ts <path> [<path>…] [--dry]
 *
 * Against the database in `MONGO_URI`, or the one the API's own `.env`
 * names — not whatever is on the default port, which on a shared box is
 * somebody else's.
 *
 * Keys arrive by seeding and never leave: the seed upserts, so a block a
 * page no longer reads stays in the admin for an editor to find, change,
 * and watch change nothing. That is worse than clutter — it is a form
 * that lies about what it does.
 *
 * Exact paths only, never a prefix. A prefix is one typo away from
 * emptying a page, and nothing here puts the words back; what it deletes
 * it prints first, so the value is in the terminal and in the seed files'
 * history if somebody wants it again.
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const BACKEND = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const paths = args.filter((arg) => !arg.startsWith("--"));

function setting(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  const env = path.join(BACKEND, ".env");
  if (!fs.existsSync(env)) return undefined;
  for (const line of fs.readFileSync(env, "utf8").split("\n")) {
    const match = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`).exec(line);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

/** The URI with its password taken out, for printing. */
function safe(uri: string): string {
  return uri.replace(/\/\/([^/@]*)@/, (_m, credentials: string) => {
    return `//${credentials.split(":")[0]}:***@`;
  });
}

/** Tells the website the message tree has changed, as publishing does. */
async function revalidate(): Promise<void> {
  const url = setting("SITE_REVALIDATE_URL") ?? "http://localhost:3000/api/revalidate";
  const secret = setting("REVALIDATE_SECRET");
  if (!secret) {
    console.log("\nno REVALIDATE_SECRET here; ask the site for cms:copy yourself.");
    return;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags: ["cms:copy"] }),
      signal: AbortSignal.timeout(5000),
    });
    console.log(response.ok ? "\nrevalidated cms:copy" : `\nthe site refused the revalidation (${response.status}).`);
  } catch (error) {
    console.log(`\ncould not reach ${url} to revalidate: ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  if (paths.length === 0) {
    console.error("usage: tsx tools/prune-copy.ts <path> [<path>…] [--dry]");
    process.exit(2);
  }

  const uri = setting("MONGO_URI") ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  console.log(`connected to ${safe(uri)}${dry ? "  (dry run; nothing written)" : ""}\n`);

  const copy = mongoose.connection.collection("copy");
  let deleted = 0;

  for (const docPath of paths) {
    const entry = await copy.findOne({ path: docPath });
    if (!entry) {
      console.log(`${docPath.padEnd(48)} not here`);
      continue;
    }
    const values = entry.values as Record<string, string>;
    const shown = Object.entries(values ?? {})
      .map(([locale, value]) => `${locale}: ${JSON.stringify(value)}`)
      .join("  ");
    console.log(`${docPath.padEnd(48)} ${dry ? "would delete" : "deleted"}  ${shown}`);
    if (dry) continue;
    await copy.deleteOne({ _id: entry._id });
    deleted += 1;
  }

  await mongoose.disconnect();
  if (dry) {
    console.log("\ndry run; nothing written.");
    return;
  }
  if (deleted > 0) await revalidate();
  else console.log("\nnothing deleted, so nothing to revalidate.");
}

void main().catch((error: Error) => {
  console.error(`prune-copy failed: ${error.message}`);
  process.exit(1);
});
