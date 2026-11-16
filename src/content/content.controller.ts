import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ContentService } from "./content.service";
import { CreateRecordDto, ListQueryDto, ReorderDto, RestoreDto, SaveRecordDto } from "./dto";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { findCollection } from "../content-model/catalogue";
import type { ContentRecordDocument } from "../schemas/content-record.schema";

/**
 * The admin's content API. One set of routes for every collection, because
 * the shape comes from the content model rather than from the route.
 *
 * Publishing is kept apart from saving, and needs the editor role:
 * translators save, editors publish.
 */
@Controller("content/:collection")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  async list(@Param("collection") name: string, @Query() query: ListQueryDto) {
    const { total, records, collection } = await this.content.list(name, {
      status: query.status,
      search: query.search,
      limit: query.limit ? Number(query.limit) : undefined,
      skip: query.skip ? Number(query.skip) : undefined,
    });
    return {
      total,
      collection: {
        name: collection.name,
        label: collection.label,
        kind: collection.kind,
        titleField: collection.titleField,
        keyField: collection.keyField ?? null,
        sortable: collection.sortable ?? false,
      },
      records: records.map((record) => summarize(record)),
    };
  }

  @Get("counts")
  counts(@Param("collection") name: string) {
    return this.content.counts(name);
  }

  @Get("record/:key")
  async one(@Param("collection") name: string, @Param("key") key: string) {
    return summarize(await this.content.get(name, key), true);
  }

  @Put("record/:key")
  @Roles("editor", "translator")
  async save(
    @Param("collection") name: string,
    @Param("key") key: string,
    @Body() body: SaveRecordDto,
    @CurrentUser() actor?: AuthUser,
  ) {
    return summarize(await this.content.saveDraft(name, key, body.data, actor), true);
  }

  @Post()
  @Roles("editor", "translator")
  async create(
    @Param("collection") name: string,
    @Body() body: CreateRecordDto,
    @CurrentUser() actor?: AuthUser,
  ) {
    return summarize(await this.content.saveDraft(name, body.key, body.data, actor), true);
  }

  @Post("record/:key/publish")
  @Roles("editor")
  async publish(
    @Param("collection") name: string,
    @Param("key") key: string,
    @CurrentUser() actor?: AuthUser,
  ) {
    return summarize(await this.content.publish(name, key, actor), true);
  }

  @Post("record/:key/unpublish")
  @Roles("editor")
  async unpublish(
    @Param("collection") name: string,
    @Param("key") key: string,
    @CurrentUser() actor?: AuthUser,
  ) {
    return summarize(await this.content.unpublish(name, key, actor), true);
  }

  @Post("record/:key/restore")
  @Roles("editor", "translator")
  async restore(
    @Param("collection") name: string,
    @Param("key") key: string,
    @Body() body: RestoreDto,
    @CurrentUser() actor?: AuthUser,
  ) {
    return summarize(await this.content.restore(name, key, body.revisionId, actor), true);
  }

  @Delete("record/:key")
  @Roles("editor")
  async archive(
    @Param("collection") name: string,
    @Param("key") key: string,
    @CurrentUser() actor?: AuthUser,
  ) {
    await this.content.archive(name, key, actor);
    return { ok: true };
  }

  @Post("reorder")
  @Roles("editor")
  async reorder(
    @Param("collection") name: string,
    @Body() body: ReorderDto,
    @CurrentUser() actor?: AuthUser,
  ) {
    await this.content.reorder(name, body.keys, actor);
    return { ok: true };
  }

  @Post("publish-all")
  @Roles("editor")
  async publishAll(@Param("collection") name: string, @CurrentUser() actor?: AuthUser) {
    const published = await this.content.publishAll(name, actor);
    return { published };
  }
}

/**
 * What the admin needs about a record. The list screens take the summary
 * without `data`; an editor opening one gets the content too.
 */
function summarize(record: ContentRecordDocument, withData = false) {
  const collection = findCollection(record.collectionName);
  const live = record.draft ?? record.data ?? {};
  const titleField = collection?.titleField;
  const titleValue = titleField ? (live as Record<string, unknown>)[titleField] : undefined;

  return {
    key: record.key,
    order: record.order,
    status: record.status,
    /** the draft's title where there is one, so a list shows pending names */
    title: readTitle(titleValue) ?? record.key,
    hasPendingEdits: record.draft !== null,
    publishedAt: record.publishedAt ?? null,
    updatedAt: record.get("updatedAt") as Date,
    ...(withData ? { data: record.draft ?? record.data, published: record.data } : {}),
    ...(withData ? {} : { preview: previewOf(live as Record<string, unknown>, collection) }),
  };
}

/** A localized title reads in Georgian; the admin shows both where it can. */
function readTitle(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    for (const key of ["ka", "ge", "en"]) {
      if (typeof row[key] === "string") return row[key] as string;
    }
  }
  return null;
}

/** The handful of values a list screen shows as columns. */
function previewOf(
  data: Record<string, unknown>,
  collection: ReturnType<typeof findCollection>,
): Record<string, unknown> {
  if (!collection) return {};
  const out: Record<string, unknown> = {};
  for (const field of collection.fields) {
    if (!field.listColumn) continue;
    const value = field.siblings ? data[field.siblings.ka] : data[field.name];
    out[field.name] = field.localized ? readTitle(value) : value;
  }
  return out;
}
