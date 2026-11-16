import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaService, type UploadedFileLike } from "./media.service";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";

@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  async browse(
    @Query("folder") folder?: string,
    @Query("search") search?: string,
    @Query("source") source?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    const { total, assets } = await this.media.browse({
      folder,
      search,
      source,
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
    return { total, assets: assets.map(present) };
  }

  @Get("folders")
  folders() {
    return this.media.folders();
  }

  @Get("stats")
  stats() {
    return this.media.stats();
  }

  @Post("upload")
  @Roles("editor", "translator")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body("folder") folder?: string,
    @Body("altKa") altKa?: string,
    @Body("altEn") altEn?: string,
    @Body("tags") tags?: string,
    @CurrentUser() actor?: AuthUser,
  ) {
    if (!file) throw new BadRequestException("No file arrived.");
    const asset = await this.media.upload(
      file,
      {
        folder,
        alt: { ka: altKa ?? "", en: altEn ?? "" },
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      },
      actor,
    );
    return present(asset);
  }

  @Patch("meta")
  @Roles("editor", "translator")
  async updateMeta(
    @Body("path") assetPath: string,
    @Body("alt") alt?: Record<string, string>,
    @Body("caption") caption?: Record<string, string>,
    @Body("tags") tags?: string[],
    @Body("folder") folder?: string,
    @CurrentUser() actor?: AuthUser,
  ) {
    if (!assetPath) throw new BadRequestException("Which file?");
    return present(await this.media.updateMeta(assetPath, { alt, caption, tags, folder }, actor));
  }

  @Delete()
  @Roles("editor")
  async remove(@Query("path") assetPath: string, @CurrentUser() actor?: AuthUser) {
    if (!assetPath) throw new BadRequestException("Which file?");
    await this.media.remove(assetPath, actor);
    return { ok: true };
  }

  /** Re-reads the website's `public/` folder. Safe to run again. */
  @Post("index-site-public")
  @Roles("admin")
  index() {
    return this.media.indexSitePublic();
  }
}

function present(asset: {
  path: string;
  source: string;
  originalName: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  alt: Record<string, string>;
  caption: Record<string, string>;
  folder: string;
  tags: string[];
  variants: { width: number; path: string }[];
}) {
  return {
    path: asset.path,
    source: asset.source,
    originalName: asset.originalName,
    mime: asset.mime,
    bytes: asset.bytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    alt: asset.alt,
    caption: asset.caption,
    folder: asset.folder,
    tags: asset.tags,
    variants: asset.variants,
  };
}
