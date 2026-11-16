import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CopyEntry, type CopyEntryDocument } from "../schemas/copy-entry.schema";
import { LOCALES, type Locale } from "../content-model/types";
import { RevisionsService } from "../revisions/revisions.service";
import { AuditService } from "../revisions/audit.service";
import { PublishService } from "../publish/publish.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";

export type MessageTree = { [key: string]: string | MessageTree };

/**
 * The site's copy: every heading, label and paragraph on 112 routes.
 *
 * Stored flat, one document per key, and served to the website as the
 * nested tree next-intl expects. The tree is assembled here rather than on
 * the website so that the website's request config stays a single fetch.
 *
 * The assembled tree is cached in memory and dropped on any write. A page
 * render needs the whole tree, and rebuilding 3,000 documents into it on
 * every request would be the one slow thing in an otherwise static site.
 */
@Injectable()
export class CopyService {
  private cache = new Map<string, MessageTree>();

  constructor(
    @InjectModel(CopyEntry.name) private readonly copy: Model<CopyEntryDocument>,
    private readonly revisions: RevisionsService,
    private readonly audit: AuditService,
    private readonly publisher: PublishService,
  ) {}

  /* ------------------------------------------------------------- reading */

  /** The whole message tree for one language, as next-intl wants it. */
  async tree(locale: Locale, drafts = false): Promise<MessageTree> {
    const cacheKey = `${locale}:${drafts ? "draft" : "live"}`;
    const hit = this.cache.get(cacheKey);
    if (hit) return hit;

    const entries = await this.copy.find().select("path values draft").lean().exec();
    const tree: MessageTree = {};
    for (const entry of entries) {
      const source = drafts && entry.draft ? entry.draft : entry.values;
      const value = source?.[locale];
      if (typeof value !== "string") continue;
      setPath(tree, entry.path, value);
    }
    const restored = restoreArrays(tree) as MessageTree;
    this.cache.set(cacheKey, restored);
    return restored;
  }

  /** The admin's editor: one page's keys, both languages, flat. */
  async namespace(namespace: string): Promise<
    {
      path: string;
      /** the key within the namespace, e.g. `values.items.freedom.title` */
      leaf: string;
      values: Record<string, string>;
      draft: Record<string, string> | null;
      placeholders: string[];
      multiline: boolean;
    }[]
  > {
    const entries = await this.copy
      .find({ $or: [{ namespace }, { path: { $regex: `^${escapeRegex(namespace)}\\.` } }] })
      .sort({ path: 1 })
      .lean()
      .exec();
    return entries.map((entry) => ({
      path: entry.path,
      leaf: entry.path.startsWith(`${namespace}.`)
        ? entry.path.slice(namespace.length + 1)
        : entry.path,
      values: entry.values,
      draft: entry.draft ?? null,
      placeholders: entry.placeholders ?? [],
      multiline: entry.multiline ?? false,
    }));
  }

  /**
   * Every namespace, with how much is in it and what the page is called.
   *
   * The title comes along because the admin lists these as a tree of the
   * site, and "Mission & vision" is what an editor is looking for where
   * `pages.aboutMission` is what the code calls it.
   */
  async namespaces(): Promise<
    { namespace: string; keys: number; pending: number; title: Record<string, string> | null }[]
  > {
    const [rows, titles] = await Promise.all([
      this.copy.aggregate<{ _id: string; keys: number; pending: number }>([
        {
          $group: {
            _id: "$namespace",
            keys: { $sum: 1 },
            pending: { $sum: { $cond: [{ $ne: ["$draft", null] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // One query for every `<namespace>.title`, rather than one per group.
      this.copy
        .find({ path: { $regex: "\\.title$" } })
        .select("namespace path values")
        .lean()
        .exec(),
    ]);

    const titleFor = new Map<string, Record<string, string>>();
    for (const entry of titles) {
      // `pages.aboutMission.title` names the page; a deeper
      // `pages.about.sections.x.title` names something inside it.
      if (entry.path === `${entry.namespace}.title`) {
        titleFor.set(entry.namespace, entry.values);
      }
    }

    return rows.map((r) => ({
      namespace: r._id,
      keys: r.keys,
      pending: r.pending,
      title: titleFor.get(r._id) ?? null,
    }));
  }

  async search(
    term: string,
    limit = 100,
  ): Promise<{ path: string; values: Record<string, string> }[]> {
    const escaped = escapeRegex(term);
    const entries = await this.copy
      .find({
        $or: [
          { path: { $regex: escaped, $options: "i" } },
          { "values.ka": { $regex: escaped, $options: "i" } },
          { "values.en": { $regex: escaped, $options: "i" } },
        ],
      })
      .limit(Math.min(limit, 300))
      .lean()
      .exec();
    return entries.map((e) => ({ path: e.path, values: e.values }));
  }

  /** Keys with no value in one language. The translators' work list. */
  async untranslated(locale: Locale): Promise<{ path: string; values: Record<string, string> }[]> {
    const entries = await this.copy
      .find({ $or: [{ [`values.${locale}`]: { $in: [null, ""] } }, { [`values.${locale}`]: { $exists: false } }] })
      .limit(500)
      .lean()
      .exec();
    return entries.map((e) => ({ path: e.path, values: e.values }));
  }

  /* ------------------------------------------------------------- writing */

  async saveDraft(
    path: string,
    values: Record<string, string>,
    actor?: AuthUser,
  ): Promise<CopyEntryDocument> {
    const entry = await this.copy.findOne({ path }).exec();
    if (!entry) throw new NotFoundException(`No copy at ${path}.`);

    const next: Record<string, string> = { ...entry.values, ...(entry.draft ?? {}) };
    for (const [locale, value] of Object.entries(values)) {
      if (!LOCALES.includes(locale as Locale)) {
        throw new BadRequestException(`${locale} is not one of the site's languages.`);
      }
      if (typeof value !== "string") throw new BadRequestException(`${path} has to be text.`);
      next[locale] = value;
    }

    /**
     * A message carrying `{count}` has to keep it in every language —
     * next-intl throws at render time otherwise, which would mean a blank
     * page rather than an awkward sentence.
     */
    for (const placeholder of entry.placeholders ?? []) {
      for (const [locale, value] of Object.entries(next)) {
        if (!value.includes(`{${placeholder}}`)) {
          throw new BadRequestException(
            `The ${locale} text has to keep {${placeholder}} — the page passes a value in there.`,
          );
        }
      }
    }

    await this.revisions.snapshot({
      subject: "copy",
      scope: entry.namespace,
      target: path,
      snapshot: entry.draft ?? entry.values,
      action: "save",
      actor,
    });

    entry.draft = next;
    entry.updatedBy = actor?.id;
    await entry.save();
    this.cache.clear();
    await this.audit.record(actor, "copy.save", path);
    return entry;
  }

  /** Publishes one key, or a whole namespace, or everything pending. */
  async publish(
    scope: { path?: string; namespace?: string },
    actor?: AuthUser,
  ): Promise<{ published: number }> {
    const filter: Record<string, unknown> = { draft: { $ne: null } };
    if (scope.path) filter.path = scope.path;
    else if (scope.namespace) {
      filter.$or = [
        { namespace: scope.namespace },
        { path: { $regex: `^${escapeRegex(scope.namespace)}\\.` } },
      ];
    }

    const pending = await this.copy.find(filter).exec();
    for (const entry of pending) {
      await this.revisions.snapshot({
        subject: "copy",
        scope: entry.namespace,
        target: entry.path,
        snapshot: entry.values,
        action: "publish",
        actor,
      });
      entry.values = { ...entry.values, ...entry.draft };
      entry.draft = null;
      await entry.save();
    }

    this.cache.clear();
    await this.audit.record(actor, "copy.publish", scope.path ?? scope.namespace ?? "all", {
      count: pending.length,
    });
    // Copy is on every page, so this is the one case for a blunt instrument.
    await this.publisher.revalidateCollection("copy");
    return { published: pending.length };
  }

  async discardDraft(path: string, actor?: AuthUser): Promise<void> {
    await this.copy.updateOne({ path }, { $set: { draft: null } }).exec();
    this.cache.clear();
    await this.audit.record(actor, "copy.discard", path);
  }

  async pendingCount(): Promise<number> {
    return this.copy.countDocuments({ draft: { $ne: null } }).exec();
  }

  /** Drops the assembled-tree cache. The seeder calls this after an import. */
  invalidate(): void {
    this.cache.clear();
  }
}

/* -------------------------------------------------------------- helpers */

function setPath(tree: MessageTree, path: string, value: string): void {
  const parts = path.split(".");
  let node = tree;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = node[part];
    if (typeof next === "string") return; // a leaf is already there; leave it
    node = next ?? (node[part] = {});
  }
  node[parts[parts.length - 1]] = value;
}

/**
 * Puts the arrays back.
 *
 * The copy is stored one document per key, so `body: ["…", "…"]` became
 * `body.0` and `body.1`. Reassembling by path alone gives `{ "0": …, "1": … }`
 * — an object, which the pages then call `.map` on and crash.
 *
 * A node whose keys are exactly 0..n-1 was an array. Nothing else in the
 * message files uses numeric keys, and the alternative — recording the
 * parent's kind on every document — would be a second source of truth for
 * something the keys already say.
 */
function restoreArrays(node: MessageTree): MessageTree | string[] {
  const keys = Object.keys(node);
  const dense =
    keys.length > 0 &&
    keys.every((key, index) => key === String(index));

  for (const key of keys) {
    const value = node[key];
    if (value !== null && typeof value === "object") {
      node[key] = restoreArrays(value) as MessageTree;
    }
  }

  return dense ? (keys.map((key) => node[key]) as string[]) : node;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
