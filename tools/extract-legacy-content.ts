/**
 * One-time migration: lift the content out of `src/data/*.ts` and write it
 * to `backend/seed/legacy/*.json`, verbatim and in both languages.
 *
 * Why not read the accessors? Because they localize: `getAnnouncements("ka")`
 * returns Georgian strings and throws the English away. The bilingual rows
 * are the module-private `const`s above them (`ANNOUNCEMENTS`, `VACANCIES`,
 * …), so that is what this reads.
 *
 * How: for each module, parse it, find every top-level `const` that holds
 * data rather than a function, then write a copy of the module into the same
 * directory with one line appended —
 *
 *     export const __EXTRACTED__ = { ANNOUNCEMENTS, KIND };
 *
 * — import that copy, and delete it. The copy has to sit next to the
 * original or its relative imports (`./sources/media.json`, `./index`) would
 * not resolve. Nothing in `src/data` is modified; the copies are removed in
 * a `finally`, including when a module throws on import.
 *
 * Run from the *website's* root so `tsx` picks up its tsconfig and with it
 * the `@/*` path alias:
 *
 *     cd ../ibsu && ../ibsu-backend/node_modules/.bin/tsx \
 *       --tsconfig tsconfig.json ../ibsu-backend/tools/extract-legacy-content.ts
 *
 * Idempotent. Re-run it and it overwrites the JSON.
 */
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BACKEND = path.resolve(__dirname, "..");
/**
 * The website. A sibling directory, not the parent — the backend was moved
 * out of it so the two are separate projects. SITE_DIR overrides it.
 */
const REPO = path.resolve(process.env.SITE_DIR ?? path.join(BACKEND, "..", "ibsu"));
const DATA_DIR = path.join(REPO, "src", "data");
const OUT_DIR = path.join(BACKEND, "seed", "legacy");

/** `const x = () => …` and friends are code, not content. */
function holdsData(decl: ts.VariableDeclaration): boolean {
  const init = decl.initializer;
  if (!init) return false;
  return !(
    ts.isArrowFunction(init) ||
    ts.isFunctionExpression(init) ||
    ts.isClassExpression(init)
  );
}

/** Every top-level `const` name in the file that holds data. */
function dataConstNames(source: ts.SourceFile): string[] {
  const names: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue; // destructuring: skip
      if (!holdsData(decl)) continue;
      names.push(decl.name.text);
    }
  }
  return names;
}

/**
 * JSON cannot hold `undefined`, a function or a `Map`, and silently drops
 * the key instead of telling you. Report what was dropped rather than
 * discovering a hole in the seed data later.
 */
function describeLoss(value: unknown, trail: string[], losses: string[]): void {
  if (typeof value === "function") {
    losses.push(`${trail.join(".")} is a function`);
    return;
  }
  if (value === undefined) {
    losses.push(`${trail.join(".")} is undefined`);
    return;
  }
  if (value instanceof Map || value instanceof Set) {
    losses.push(`${trail.join(".")} is a ${value.constructor.name}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => describeLoss(item, [...trail, String(i)], losses));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      describeLoss(item, [...trail, key], losses);
    }
  }
}

async function extractModule(file: string): Promise<{
  module: string;
  consts: Record<string, unknown>;
  losses: string[];
}> {
  const moduleName = path.basename(file, ".ts");
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const names = dataConstNames(source);

  // A unique name, so a crashed earlier run cannot collide with this one.
  const tempPath = path.join(DATA_DIR, `__extract_${moduleName}_${process.pid}.ts`);
  const reexport =
    names.length > 0
      ? `\n\nexport const __EXTRACTED__ = { ${names.join(", ")} };\n`
      : `\n\nexport const __EXTRACTED__ = {};\n`;

  fs.writeFileSync(tempPath, text + reexport);
  try {
    const loaded = (await import(pathToFileURL(tempPath).href)) as {
      __EXTRACTED__: Record<string, unknown>;
    };
    const consts = loaded.__EXTRACTED__;
    const losses: string[] = [];
    for (const [key, value] of Object.entries(consts)) {
      describeLoss(value, [key], losses);
    }
    return { module: moduleName, consts, losses };
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(DATA_DIR, f))
    .sort();

  const report: {
    module: string;
    consts: { name: string; kind: string; count: number }[];
    losses: string[];
  }[] = [];
  const failed: { module: string; error: string }[] = [];

  for (const file of files) {
    const moduleName = path.basename(file, ".ts");
    try {
      const { consts, losses } = await extractModule(file);
      fs.writeFileSync(
        path.join(OUT_DIR, `${moduleName}.json`),
        JSON.stringify(consts, null, 2) + "\n",
      );
      report.push({
        module: moduleName,
        consts: Object.entries(consts).map(([name, value]) => ({
          name,
          kind: Array.isArray(value) ? "array" : typeof value,
          count: Array.isArray(value)
            ? value.length
            : value && typeof value === "object"
              ? Object.keys(value).length
              : 1,
        })),
        losses,
      });
      const biggest = Object.entries(consts)
        .filter(([, v]) => Array.isArray(v))
        .sort((a, b) => (b[1] as unknown[]).length - (a[1] as unknown[]).length)[0];
      const note = biggest
        ? `${biggest[0]}[${(biggest[1] as unknown[]).length}]`
        : `${Object.keys(consts).length} consts`;
      console.log(`  ok    ${moduleName.padEnd(20)} ${note}`);
      for (const loss of losses) console.log(`        dropped: ${loss}`);
    } catch (error) {
      failed.push({ module: moduleName, error: (error as Error).message });
      console.log(`  FAIL  ${moduleName.padEnd(20)} ${(error as Error).message}`);
    }
  }

  // The JSON under src/data/sources is content too — `programmes.json`,
  // `staff.json`, `quiz.json` and the newsroom's rows are imported straight
  // into their modules rather than declared as consts, so the pass above
  // never sees them. They move over as they are.
  const sourcesDir = path.join(DATA_DIR, "sources");
  if (fs.existsSync(sourcesDir)) {
    const outSources = path.join(OUT_DIR, "sources");
    fs.mkdirSync(outSources, { recursive: true });
    for (const file of fs.readdirSync(sourcesDir).filter((f) => f.endsWith(".json"))) {
      fs.copyFileSync(path.join(sourcesDir, file), path.join(outSources, file));
      console.log(`  ok    sources/${file}`);
    }
  }

  // The message files move over untouched: they are already JSON, already
  // one tree per language, and the copy module reads them key by key. They
  // go to seed/copy rather than seed/legacy because the seeder needs them
  // on every run, where the rest of seed/legacy is a one-time intermediate.
  const copyDir = path.join(BACKEND, "seed", "copy");
  fs.mkdirSync(copyDir, { recursive: true });
  for (const locale of ["ka", "en"]) {
    const from = path.join(REPO, "src", "i18n", "messages", `${locale}.json`);
    if (!fs.existsSync(from)) continue;
    fs.copyFileSync(from, path.join(copyDir, `messages.${locale}.json`));
    console.log(`  ok    messages.${locale}`);
  }

  fs.writeFileSync(
    path.join(BACKEND, "seed", "extract-report.json"),
    JSON.stringify({ extracted: report, failed }, null, 2) + "\n",
  );

  console.log(
    `\n${report.length} modules extracted, ${failed.length} failed -> backend/seed/legacy/`,
  );
  if (failed.length > 0) process.exitCode = 1;
}

void main();
