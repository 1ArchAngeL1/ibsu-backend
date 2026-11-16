import { Controller, ForbiddenException, Get, Headers, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../common/decorators/public.decorator";
import { CopyService } from "../copy/copy.service";
import { ContentService } from "../content/content.service";
import { findCollection, COLLECTIONS } from "../content-model/catalogue";
import { LOCALES, type Locale } from "../content-model/types";
import type { AppConfig } from "../config/configuration";

/**
 * What the website reads. Three routes, and nothing else.
 *
 * Open, because the website is open: everything here is already on a public
 * page. The exception is `preview`, which serves unpublished drafts and
 * needs the shared secret — that is the only thing on this controller that
 * is not public knowledge.
 *
 * The website caches these responses as part of its own build and
 * invalidates them by tag when something is published, so in normal running
 * this controller is hit once per collection per deploy, not once per
 * visitor.
 */
@Controller("site")
@Public()
export class SiteController {
  constructor(
    private readonly copy: CopyService,
    private readonly content: ContentService,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
  ) {}

  /** Every message for one language, as a tree. */
  @Get("copy/:locale")
  async messages(
    @Param("locale") locale: string,
    @Query("preview") preview?: string,
    @Headers("x-preview-secret") secret?: string,
  ) {
    if (!LOCALES.includes(locale as Locale)) {
      return {};
    }
    const drafts = this.previewing(preview, secret);
    return this.copy.tree(locale as Locale, drafts);
  }

  /**
   * One collection's published records.
   *
   * Paged, because Next refuses to cache a single fetch response over 2 MB
   * and the newsroom's 310 stories are four times that. The website asks
   * for pages and stitches them back together; each page is its own cache
   * entry under the same tag, so publishing still invalidates all of them
   * at once. Without a `limit` the whole collection comes back, which is
   * what any other caller wants.
   */
  @Get("records/:collection")
  async records(
    @Param("collection") name: string,
    @Query("skip") skip?: string,
    @Query("limit") limit?: string,
    @Query("preview") preview?: string,
    @Headers("x-preview-secret") secret?: string,
  ) {
    const drafts = this.previewing(preview, secret);
    const rows = await this.content.published(name, drafts);
    if (!limit) return rows;

    const from = Math.max(0, Number(skip) || 0);
    const size = Math.min(Math.max(1, Number(limit) || 100), 1000);
    return rows.slice(from, from + size);
  }

  /**
   * A singleton's content. The same data as `records` would give, unwrapped,
   * because a caller asking for the tuition rules wants an object and not a
   * list with one thing in it.
   */
  @Get("singleton/:collection")
  async singleton(
    @Param("collection") name: string,
    @Query("preview") preview?: string,
    @Headers("x-preview-secret") secret?: string,
  ) {
    const drafts = this.previewing(preview, secret);
    const rows = await this.content.published(name, drafts);
    return rows[0] ?? null;
  }

  /**
   * The shape of everything, so a deploy can check the site and the API
   * still agree before it goes live.
   */
  @Get("manifest")
  manifest() {
    return {
      locales: LOCALES,
      collections: COLLECTIONS.map((c) => ({
        name: c.name,
        kind: c.kind,
        tags: c.tags,
        fields: c.fields.length,
      })),
    };
  }

  @Get("health")
  health() {
    return { ok: true, collections: COLLECTIONS.length };
  }

  private previewing(preview: string | undefined, secret: string | undefined): boolean {
    if (!preview) return false;
    const expected = this.config.get("app", { infer: true }).previewSecret;
    if (secret !== expected) {
      throw new ForbiddenException("Previewing drafts needs the preview secret.");
    }
    return true;
  }
}
