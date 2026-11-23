# The old site, as it answered

A harvest of ibsu.edu.ge's public WordPress API, read in November 2026 and
committed rather than re-fetched. `tools/import-wp-pages.ts` reads this
directory; `--fetch` goes to the old site instead.

| file                   | rows | what it is                                        |
| ---------------------- | ---- | ------------------------------------------------- |
| `pages.json`           | 358  | the Pages screen — 359 published, see below        |
| `interc.json`          | 9    | the `interc` post type, the INTERC conference      |
| `iro.json`             | 9    | the `iro` post type, the International Relations Office |
| `categories.json`      | 17   | the post categories                               |
| `tags.json`            | 5    | the post tags, every one of them unused           |
| `navigator_tag.json`   | 34   | the navigator's own taxonomy                      |
| `navigator-tagged.json`| 59   | which navigator entry carries which of those      |

Each row keeps only the fields the importer reads — `_links`, `class_list`,
`guid` and `meta` are dropped — and is sorted by id, so a re-harvest years
from now produces a diff that can be read.

## Why this is committed and `seed/legacy` is not

The legacy extraction is ignored because it is reproducible: check out a
commit from before the migration and run `npm run extract`. This is not.
ibsu.edu.ge answers a bulk read of its REST API with a **200 and an HTML
block page** — not a 429, so a reader that trusts the status code parses
`<!DOCTYPE` as JSON and dies — and it blocks per URL, so waiting does not
clear it. Collecting all 358 pages took reading the list from both ends
(`order=asc` for the oldest, the default descending order for the newest)
and then naming the remainder one slug at a time out of `page-sitemap1.xml`
and `page-sitemap2.xml`. It cannot be asked for again in one go, and one day
there will be nothing to ask.

`/quiz/` is the one published page missing: it never came back, through every
shape of request. The site has its own quiz behind /applicants/quiz, built
from the `quizQuestions` and `quizSchools` collections, so nothing is waiting
on it. Re-running the importer will pick it up if the old site ever answers.

## What is not here, and cannot be

Four things in the old wp-admin need a login, which the public API does not
give out, so they were never migrated:

- **Appearance → Menus** (`/wp/v2/menus`, 401) — the old site's navigation.
  The new site's nav is its own, in the page copy.
- **Contact Form 7** (403) and **Fluent Forms** definitions — 29 pages had a
  form rendered into the body. The forms are stripped on import and counted;
  the fields behind them are not here.
- **Events Manager's** own endpoint (401). The events themselves *are*
  migrated — all 153, by `tools/import-events.ts`, out of the sitemap and
  each event's iCalendar file.
