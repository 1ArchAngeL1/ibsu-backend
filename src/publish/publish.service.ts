import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../config/configuration";

/**
 * Tells the website that something it has cached is out of date.
 *
 * The site is prerendered: 112 routes built once and served as static HTML,
 * which is why it is fast. The price is that publishing has to say so. Each
 * collection carries cache tags (`news`, `schools`, `tuition`); publishing a
 * record posts those tags to the site's `/api/revalidate`, which calls
 * `revalidateTag` and the affected pages rebuild in the background.
 *
 * Failure is logged, not thrown. The content *is* published — the record is
 * already saved — and the pages will come right on their own when their
 * cache expires. Refusing the publish because the site did not answer would
 * be the wrong trade.
 */
@Injectable()
export class PublishService {
  private readonly log = new Logger(PublishService.name);

  constructor(private readonly config: ConfigService<{ app: AppConfig }, true>) {}

  /**
   * The cache tag the website files a collection's content under.
   *
   * It has to match `tagFor` in the website's `src/cms/client.ts` exactly.
   * A tag posted under any other name is accepted by the site, invalidates
   * nothing, and reports success — so this is the one string in the system
   * that must not be spelled twice from memory.
   */
  static tagFor(collection: string): string {
    return `cms:${collection}`;
  }

  /** Everything publishing one collection's record should invalidate. */
  async revalidateCollection(collection: string, groupTags: string[] = []): Promise<boolean> {
    return this.revalidate([
      PublishService.tagFor(collection),
      ...groupTags.map((tag) => PublishService.tagFor(tag)),
    ]);
  }

  async revalidate(tags: string[], paths: string[] = []): Promise<boolean> {
    const app = this.config.get("app", { infer: true });
    const unique = [...new Set(tags)].filter(Boolean);
    if (unique.length === 0 && paths.length === 0) return true;

    try {
      const response = await fetch(app.site.revalidateUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidate-secret": app.site.revalidateSecret,
        },
        body: JSON.stringify({ tags: unique, paths }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        this.log.warn(
          `the site refused the revalidation (${response.status}); tags ${unique.join(", ")}`,
        );
        return false;
      }
      this.log.log(`revalidated ${unique.join(", ") || paths.join(", ")}`);
      return true;
    } catch (error) {
      this.log.warn(
        `could not reach the site to revalidate ${unique.join(", ")}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
