/**
 * What every stage of the WordPress migration needs: how to talk to the old
 * site, and the one rule that decides where a file of its lands in our bucket.
 *
 * The whole migration hangs on `keyFor` being a pure function of the old URL.
 * Because it is, nothing has to remember a mapping: the rescuer computes the
 * key it uploads to, and months later the relinker computes the same key from
 * the same URL found in a post body and knows exactly where the file went.
 *
 * Encoding is the subtle part, and getting it wrong is silent. An object key
 * holds the *decoded* name — `wordpress/2026/02/გამოცდა-1.png`, real UTF-8 —
 * and the public URL percent-encodes it once, per segment. Storing the
 * encoded form as the key instead gives an object literally named `%E1%83%92`,
 * which the URL that looks right can never reach: the CDN decodes the request
 * path before matching, and finds nothing. That is why the first 342 files
 * mirrored out of WordPress 404ed, and why `legacyKeyFor` exists to find them.
 */
import { S3Client } from "@aws-sdk/client-s3";

export const WP_API = "https://ibsu.edu.ge/wp-json/wp/v2";

/** where WordPress keeps its uploads, and where we keep our copies of them */
const UPLOADS_PREFIX = "wp-content/uploads/";
export const R2_FOLDER = "wordpress";

/**
 * Every ibsu.edu.ge upload URL in a blob of HTML.
 *
 * Commas are excluded deliberately: a `srcset` is one attribute holding
 * several comma-separated URLs, and a greedier class would swallow the lot as
 * a single match.
 */
export const WP_UPLOAD_URL_RE =
  /https?:\/\/(?:www\.)?ibsu\.edu\.ge\/wp-content\/uploads\/[^\s"'<>()[\]\\,]+/gi;

/** `.../uploads/2026/11/x.webp` -> `wordpress/2026/11/x.webp`, decoded. */
export function keyFor(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname; // also drops any ?ver= query
  } catch {
    return null;
  }
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // a filename with a stray `%` in it is not valid encoding; take it as-is
  }
  const relative = decoded.replace(/^\/+/, "");
  if (!relative.startsWith(UPLOADS_PREFIX)) return null;
  const rest = relative.slice(UPLOADS_PREFIX.length);
  return rest ? `${R2_FOLDER}/${rest}` : null;
}

/** The key the first rescue run wrote: the encoded pathname, taken literally. */
export function legacyKeyFor(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const relative = pathname.replace(/^\/+/, "");
  if (!relative.startsWith(UPLOADS_PREFIX)) return null;
  return `${R2_FOLDER}/${relative.slice(UPLOADS_PREFIX.length)}`;
}

/** The inverse of `keyFor`: where WordPress still serves this object from. */
export function wpUrlFor(key: string): string | null {
  if (!key.startsWith(`${R2_FOLDER}/`)) return null;
  return `https://ibsu.edu.ge/${UPLOADS_PREFIX}${key.slice(R2_FOLDER.length + 1)}`;
}

/** The URL a browser fetches an object by: the key, encoded once per segment. */
export function publicUrl(base: string, key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/+$/, "")}/${path}`;
}

/** `wordpress/x-768x512.webp` -> the full-size key it was cut down from. */
export function parseSized(
  key: string,
): { parentKey: string; width: number; height: number } | null {
  const m = /^(.*)-(\d+)x(\d+)(\.[A-Za-z0-9]+)$/.exec(key);
  if (!m) return null;
  return { parentKey: `${m[1]}${m[4]}`, width: Number(m[2]), height: Number(m[3]) };
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** HTML entities out, so a title reads as a title. */
export function decode(s: string): string {
  return (s || "")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
}

/** Tags out too: for a caption that has to sit in a one-line field. */
export function plain(html: string): string {
  return decode((html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (source the backend .env first).`);
  return value;
}

export function r2(): { client: S3Client; bucket: string; publicBase: string } {
  return {
    client: new S3Client({
      region: "auto",
      endpoint: env("R2_ENDPOINT"),
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
    }),
    bucket: env("R2_BUCKET"),
    publicBase: env("R2_PUBLIC_BASE_URL").replace(/\/+$/, ""),
  };
}

/**
 * Fetch with backoff. ibsu.edu.ge answers a bulk crawl with 429, and then
 * with 403 if you keep going, so every stage has to be willing to wait.
 */
export async function fetchRetry(url: string, tries = 8): Promise<Response> {
  const href = new URL(url).href; // encodes a Georgian filename for the wire
  for (let i = 0; ; i += 1) {
    let res: Response;
    try {
      res = await fetch(href, { headers: { "User-Agent": "Mozilla/5.0 (IBSU migration)" } });
    } catch (error) {
      if (i >= tries) throw new Error(`${url}: ${(error as Error).message}`);
      await sleep(Math.min(5000 * 2 ** i, 90000));
      continue;
    }
    if (res.status === 429 || res.status === 403 || res.status >= 500) {
      if (i >= tries) return res;
      const after = Number(res.headers.get("retry-after")) * 1000;
      await sleep(after || Math.min(5000 * 2 ** i, 90000));
      continue;
    }
    return res;
  }
}

/**
 * One page of a REST collection, or the news that there are no more.
 *
 * `fetchRetry` is not enough on its own here, and the reason cost us four
 * posts. ibsu.edu.ge does not refuse a crawl with 429 forever — past some
 * point it answers **200 with an HTML block page**. `fetchRetry` sees a 200
 * and hands it straight back, `res.json()` then throws on `<!DOCTYPE`, and
 * the import dies partway through with whatever it had already written
 * still in the database. That is how `posts` ended up holding 2,761 of the
 * old site's 2,765 published posts while looking like a clean run.
 *
 * So the content type is checked, and a page that is not JSON is treated as
 * the block it is: waited out and asked for again.
 */
async function fetchJsonPage(url: string, tries = 6): Promise<Response | "past-the-end"> {
  for (let i = 0; ; i += 1) {
    const res = await fetchRetry(url);
    // WordPress's way of saying you asked past the last page.
    if (res.status === 400) return "past-the-end";
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);

    const type = res.headers.get("content-type") ?? "";
    if (type.includes("json")) return res;

    await res.text().catch(() => undefined); // drain it; we are retrying
    if (i >= tries) {
      throw new Error(
        `${url}: answered 200 with ${type.split(";")[0] || "no content type"} rather than JSON ` +
          `after ${tries + 1} tries — the old site is blocking this URL. ` +
          `See seed/wp/README.md for what gets past it.`,
      );
    }
    await sleep(Math.min(8000 * 2 ** i, 120000));
  }
}

/** Download a file. `null` means WordPress no longer has it. */
export async function download(
  url: string,
  tries = 5,
): Promise<{ body: Buffer; type: string } | null> {
  let res: Response;
  try {
    res = await fetchRetry(url, tries);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  return {
    body: Buffer.from(await res.arrayBuffer()),
    type: res.headers.get("content-type")?.split(";")[0] || "application/octet-stream",
  };
}

/** Page through a WordPress collection, yielding every item, politely. */
export async function* wpAll(
  path: string,
  options: { fields?: string; embed?: boolean; perPage?: number; limit?: number } = {},
): AsyncGenerator<Record<string, unknown>> {
  const per = options.perPage ?? (options.embed ? 40 : 100);
  const limit = options.limit ?? Infinity;
  let page = 1;
  let yielded = 0;
  /** what the old site says it holds, from `X-WP-Total` on the first page */
  let expected = 0;
  for (;;) {
    const query = [
      `per_page=${per}`,
      `page=${page}`,
      options.embed ? "_embed=wp:featuredmedia" : "",
      options.fields ? `_fields=${options.fields}` : "",
    ]
      .filter(Boolean)
      .join("&");
    const res = await fetchJsonPage(`${WP_API}/${path}?${query}`);
    if (res === "past-the-end") break;
    if (!expected) expected = Number(res.headers.get("X-WP-Total") || "0");
    const batch = (await res.json()) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const item of batch) {
      yield item;
      yielded += 1;
      if (yielded >= limit) {
        process.stdout.write("\n");
        return;
      }
    }
    const totalPages = Number(res.headers.get("X-WP-TotalPages") || "0");
    process.stdout.write(`\r  ${path}: ${yielded} fetched (page ${page}/${totalPages})   `);
    if (totalPages && page >= totalPages) break;
    page += 1;
    await sleep(1200); // stay under the rate limit
  }
  process.stdout.write("\n");

  /*
   * Stopping early is not the same as finishing, and until now they looked
   * identical from the outside: a crawl that lost its last page simply
   * returned fewer items and every caller carried on as if that were all
   * there was. An import is not allowed to quietly cover less than it was
   * asked for, so a short read is an error — unless the caller asked for a
   * short read with `limit`.
   */
  if (limit === Infinity && expected && yielded < expected) {
    throw new Error(
      `${path}: read ${yielded} of the ${expected} the old site reports. ` +
        `Nothing has been lost, but this run is incomplete — re-run it; ` +
        `the importers match on the old id and update rather than duplicate.`,
    );
  }
}

/** Run `work` over `items`, `n` at a time, in the order they were given. */
export async function pool<T>(
  items: T[],
  n: number,
  work: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      await work(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
}
