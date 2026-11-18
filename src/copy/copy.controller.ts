import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CopyService } from "./copy.service";
import { PublishCopyDto, SaveCopyDto } from "./dto";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import type { Locale } from "../content-model/types";

@Controller("copy")
export class CopyController {
  constructor(private readonly copy: CopyService) {}

  @Get("namespaces")
  namespaces() {
    return this.copy.namespaces();
  }

  @Get("pending")
  async pending() {
    return { pending: await this.copy.pendingCount() };
  }

  @Get("search")
  search(@Query("q") q: string, @Query("limit") limit?: string) {
    return this.copy.search(q ?? "", Number(limit) || 100);
  }

  @Get("untranslated/:locale")
  untranslated(@Param("locale") locale: Locale) {
    return this.copy.untranslated(locale);
  }

  @Get("namespace/:namespace")
  namespace(@Param("namespace") namespace: string) {
    return this.copy.namespace(namespace);
  }

  @Put("entry/:path")
  @Roles("editor", "translator")
  async save(
    @Param("path") path: string,
    @Body() body: SaveCopyDto,
    @CurrentUser() actor?: AuthUser,
  ) {
    const entry = await this.copy.saveDraft(path, body.values, actor);
    return { path: entry.path, values: entry.values, draft: entry.draft };
  }

  /**
   * Adds an item to the end of the list at `:path`.
   *
   * Which list, not which key: the index belongs to the service, because
   * the numbering is what keeps a list a list rather than an object.
   */
  @Post("list/:path/item")
  @Roles("editor", "translator")
  async addListItem(@Param("path") path: string, @CurrentUser() actor?: AuthUser) {
    const entry = await this.copy.addListItem(path, actor);
    return { path: entry.path, values: entry.values, draft: entry.draft };
  }

  /**
   * Removes one item from a list and closes the gap behind it.
   *
   * Editors only, and not translators: this one renumbers its neighbours
   * and goes to the site without a publish, which is more than somebody
   * working through a language's wording should carry.
   */
  @Delete("list/item/:path")
  @Roles("editor")
  removeListItem(@Param("path") path: string, @CurrentUser() actor?: AuthUser) {
    return this.copy.removeListItem(path, actor);
  }

  @Delete("entry/:path/draft")
  @Roles("editor", "translator")
  async discard(@Param("path") path: string, @CurrentUser() actor?: AuthUser) {
    await this.copy.discardDraft(path, actor);
    return { ok: true };
  }

  @Post("publish")
  @Roles("editor")
  publish(@Body() body: PublishCopyDto, @CurrentUser() actor?: AuthUser) {
    return this.copy.publish(body, actor);
  }
}
