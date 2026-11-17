# IBSU content backend

The API the website reads from, and the one the admin is edited through.
NestJS 12, TypeScript, MongoDB.

```bash
npm install
cp .env.example .env     # fill in the three secrets; see below
npm run dev              # http://localhost:4000/api
```

The website is a **separate project in a sibling directory** (`../ibsu`) and
talks to this over HTTP. They deploy separately and share nothing but the
shape of the JSON between them:

```
ibsu-plain/
  ibsu/            the Next.js website, and the admin at /admin
  ibsu-backend/    this
```

Where the website is can be overridden with `SITE_DIR` (the migration tools)
and `SITE_PUBLIC_DIR` (the media library).

---

## What it holds

| | |
|---|---|
| **Copy** | 3,082 message keys × 2 languages — every heading, label and paragraph on 112 routes |
| **Content** | 72 collections, 1,941 records — news, programmes, staff, journals, prices, the newsroom |
| **Media** | 864 files indexed from the website's `public/`, 5,358 mirrored out of the old WordPress library with their derivatives, plus whatever is uploaded here |

All of it came out of `src/data/*.ts` and `src/i18n/messages/*.json` in the
website, in one automated migration. See [Migration](#migration).

### Running it next to the website

```bash
npm run mongo &     # a local MongoDB in ./.mongo-data
npm run seed        # load the committed content
npm run create-admin you@ibsu.edu.ge "Your Name"
npm run dev         # the API on :4000

cd ../ibsu && npm run dev   # the website on :3000, admin at /admin
```

---

## The shape of it

```
src/
  content-model/   what an editor may change, and how the admin draws a form for it
  schemas/         the Mongoose documents
  auth/            sign-in, JWT, roles
  users/           accounts
  copy/            the message tree: read, edit, publish
  content/         one generic CRUD for all 72 collections
  media/           uploads, sharp variants, the library
  revisions/       what a record looked like before, and who changed it
  publish/         tells the website which cache tags to drop
  site/            the three routes the website reads
tools/             the migration: extract, infer, seed
seed/              what the migration produced; the restore path
```

### The content model is the whole trick

There is no module per content type. `content-model/` describes every
collection and every field — `announcements.title` is a bilingual text,
`staffProfiles.portrait` is a path into the media library,
`conferences.sections` is a repeater three levels deep — and:

* the **API** validates writes against it, so a caller cannot invent a
  collection or put a string where a number belongs;
* the **admin** fetches it from `GET /content-model` and renders forms from
  it, which is why 72 collections and some 600 fields share one screen's
  worth of UI code.

Add a collection to the model and the admin grows a screen for it without a
line of UI being written.

`collections.generated.ts` was inferred from the content itself (see below)
and is overwritten whenever the migration re-runs. Hand corrections go in
`catalogue.ts`, which is merged over the top and is not generated.

### Four ways to say the same thing

The content arrived from four places and each spelled "this field has two
languages" differently:

```
{ ka, en }          most data modules
{ ge, en }          the newsroom rows
name_ge / name_en   the prototype's club register
nameka / name       the prototype's staff profiles
```

Rewriting 13 MB of content into one convention would have meant rewriting
every accessor in the website that reads the old spelling. Instead the model
records the spelling (`localeKeys`, `siblings`) and the admin renders all
four as the same pair of inputs. Storage stays faithful to what the website
expects; normalisation happens for human eyes only.

---

## Draft and published

Every record carries `data` (live) and `draft` (pending). Saving writes the
draft; publishing copies it across and tells the website to drop the
affected cache tags.

```
data: null,  draft: {…}   never published; the site does not see it
data: {…},   draft: null  published, nothing pending
data: {…},   draft: {…}   published, with edits waiting
```

This is what lets a translator work weeks ahead of a release without any of
it showing. Roles follow the same line: **editors** publish, **translators**
save but never publish, **viewers** change nothing, **admins** do everything
including accounts.

Nothing is deleted. Archiving takes a record off the site and keeps it; every
save writes a revision first.

---

## How the website stays fast

The site is 1,100 prerendered pages. Publishing has to tell it what changed:

1. Publishing a record collects the collection's cache tags.
2. `PublishService` posts them to the website's `/api/revalidate`.
3. The website calls `revalidateTag`, and only the pages reading that
   collection rebuild — in the background, while visitors keep getting the
   page that is already there.

The tag is `cms:<collection>`. **It has to match `tagFor` in the website's
`src/cms/client.ts` exactly** — a tag posted under any other name is
accepted, invalidates nothing, and reports success. That is the one string
in the system spelled in two places, and `PublishService.tagFor` is the
reason it is only spelled once on this side.

Because `revalidateTag` is stale-while-revalidate, the first request after
publishing still gets the old page and the one after it gets the new one.
That is deliberate: nobody is waiting on it, and a blank page while Next
rebuilds would be worse than a few seconds of yesterday's text.

---

## Routes

**The website reads three** (open, because everything on them is already on
a public page):

```
GET /api/site/copy/:locale             the message tree for one language
GET /api/site/records/:collection      a collection's published records
GET /api/site/singleton/:collection    a singleton's content
```

`?skip=&limit=` pages the records. The website always pages: Next refuses to
cache a single fetch response over 2 MB and the newsroom's 310 stories are
four times that.

`?preview=1` with the `x-preview-secret` header serves drafts instead. That
is how the admin's Preview button shows unpublished work on the real page.

**The admin uses the rest** — all of it behind a token:

```
POST /api/auth/sign-in | refresh | sign-out      GET /api/auth/me
GET  /api/content-model | /groups | /:name
GET  /api/content/:collection                    list, search, filter
PUT  /api/content/:collection/record/:key        save a draft
POST /api/content/:collection/record/:key/publish | unpublish | restore
POST /api/content/:collection/reorder | publish-all
GET  /api/copy/namespaces | /namespace/:ns | /search | /untranslated/:locale
PUT  /api/copy/entry/:path                       POST /api/copy/publish
GET  /api/media | /folders | /stats              POST /api/media/upload
POST /api/media/index-site-public                re-read the website's public/
GET  /api/revisions/... | /api/audit             GET/POST/PATCH /api/users
```

---

## Migration

One-time, automated, and repeatable. Nothing was transcribed by hand.

```bash
npm run extract                      # src/data/*.ts  -> seed/legacy + seed/copy
npx tsx tools/infer-content-model.ts # seed/legacy    -> seed/records + the model
npm run seed                         # seed/records + seed/copy -> Mongo
npm run create-admin you@ibsu.edu.ge "Your Name"
```

**`extract`** reads the content out of the website's data modules. Not
through their accessors — those localise, and return Georgian while throwing
the English away — but out of the module-private arrays above them. For each
module it parses the file, finds every top-level `const` holding data, writes
a copy of the module next to the original with one line appended
(`export const __EXTRACTED__ = { … }`), imports that, and deletes it. Nothing
in `src/data` is modified.

**`infer`** turns those values into records *and* into the field schema. The
schema is inferred from the content rather than from the TypeScript
interfaces above it, because the content is the better witness: it knows that
`img` always holds a path under `/photos` (so the admin should open the media
library), that `category` only ever takes one of five values (so it should be
a dropdown), and that `excerpt` runs to three hundred characters (so it needs
a textarea). Anything it cannot place becomes a raw-JSON field rather than
disappearing — which is what makes "everything is editable" true rather than
aspirational.

**`seed`** upserts by natural key, so it is safe to re-run. It will overwrite
Mongo with what came out of the repo, which is right the first time and wrong
once editors have been working — `--only=copy`, `--only=records` and `--dry`
narrow it.

`seed/records` and `seed/copy` are committed on purpose: together they are
the only copy of the content outside Mongo, and the path back if a restore is
ever needed. `seed/legacy` — the raw per-module extract, 23 MB of it — is
not: it is reproducible by checking out a commit from before the migration
and running `npm run extract` again.

### Out of the old WordPress site

The records migration above moved the *website*. The old WordPress site at
ibsu.edu.ge is a second source, and a larger one: 2,761 posts and a media
library of 5,358 files that no `src/data` module ever knew about.

```bash
set -a; source .env; set +a   # every stage reads MONGO_URI and R2_*
npm run migrate-wp            # all five stages, in order
```

Or one at a time, which is how a long run is resumed:

| | |
|---|---|
| `npm run import-wp -- media` | the library and everything WordPress knew about it |
| `npm run rescue-wp` | the files themselves, into the R2 bucket |
| `npm run mirror-wp` | the sized copies the old posts ask for |
| `npm run import-wp -- posts` | the posts, relinked as they are written |
| `npm run relink-wp` | every WordPress URL left anywhere in the database |
| `npm run verify-wp` | counts, leftovers, and a sample of URLs actually fetched |

Every stage is idempotent and resumable, and the order is the dependency
order: nothing can be relinked before the file it points at has been
mirrored.

**The one rule.** `keyFor` in `tools/wp-common.ts` maps an old URL to the
object key our copy lives under, and it is a pure function —
`…/uploads/2026/11/x.webp` is always `wordpress/2026/11/x.webp`. Because it
is, no stage has to remember what another did: the rescuer computes the key
it uploads to, and the relinker computes the same key from a URL it finds in
a post body months later and knows where the file went. It is also why
`import-wp posts` can relink as it writes rather than undoing the previous
run's work.

Keys hold the *decoded* name and public URLs percent-encode it once, per
segment. The reverse — storing the encoded form as the key — gives an object
literally named `%E1%83%92.webp`, which the obvious URL can never reach,
because the CDN decodes a request path before matching it. 342 Georgian
filenames were silently unreachable that way; `rescue-wp --fix-keys` is the
repair, and it runs by default.

**Derivatives.** A WordPress gallery does not render the full size. It
renders `src="…/IMG_8334-300x200.webp"` with a `srcset` of four more widths,
and none of those derivatives is an attachment of its own, so none of them
comes over with the library. 11,842 of them are referenced by this content.
`mirror-wp` fetches exactly the ones referenced and records them as
`variants` of the attachment they were cut from, so a migrated `srcset`
keeps every width it was written with.

**What is left pointing at ibsu.edu.ge** is a deliberate outcome, not a
missed one: a URL is rewritten only when the file is provably in the bucket,
so the handful WordPress itself has lost keep a URL that still works rather
than a tidy one that 404s. `verify-wp` lists them.

### What did not move

Content moved. Identity did not.

The key lists that drive routes, colours and message lookups — `SCHOOL_KEYS`,
`MEDIA_DESKS`, `CONFERENCE_SLUGS`, `FACULTY_RANKS`, `REGION_KEYS`,
`DESK_FILTERS` — are union types that 144 components are typed against. An
editor removing a school key would not edit the site, it would fail the
build. Those are still TypeScript, in `src/data/keys.ts` on the website side.

`sources/navigator.json` and `sources/clubs.json` were left behind
deliberately: nothing in the website imported them.

---

## Configuration

`.env`, from `.env.example`. Three secrets have no default and the API
refuses to boot without them:

| | |
|---|---|
| `JWT_SECRET` | signs sessions; 32 characters or more. `openssl rand -base64 48` |
| `REVALIDATE_SECRET` | shared with the website; it rejects revalidation calls without it |
| `PREVIEW_SECRET` | lets the website ask for drafts. Never sent to a browser |

`SITE_PUBLIC_DIR` points at the website's `public/` folder, which
`POST /api/media/index-site-public` walks to fill the media library.
Uploads land in `UPLOADS_DIR` and are served at `/media/...`.

---

## Running it

```bash
npm run dev         # watch mode
npm run build       # compile to dist/
npm run start:prod  # node dist/main.js
npm run typecheck   # the API and the tools, which are separate projects
```

MongoDB has to be reachable at `MONGO_URI`. For a local one:

```bash
mongod --dbpath ./.mongo-data
```

**The API must be up for the website to build.** The content lives here now,
so `next build` fetching 72 collections is not optional. That is the cost of
the single source of truth; the alternative was keeping a copy of everything
in the repo, which is what this replaced.
