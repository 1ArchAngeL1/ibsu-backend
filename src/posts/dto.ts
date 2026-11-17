import { IsArray, IsIn, IsObject, IsOptional, IsString } from "class-validator";
import { POST_STATUSES } from "../schemas/post.schema";

/**
 * Localized fields (`title`, `body`, `excerpt`) are validated as objects and
 * stored whole — the same treatment content records get. `cover` is a media
 * path or an empty string to clear it; the service turns "" into null.
 */
export class CreatePostDto {
  @IsObject()
  title!: { ka: string; en: string };

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  excerpt?: { ka: string; en: string };

  @IsOptional()
  @IsObject()
  body?: { ka: string; en: string };

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(POST_STATUSES)
  status?: (typeof POST_STATUSES)[number];
}

export class UpdatePostDto {
  @IsOptional()
  @IsObject()
  title?: { ka: string; en: string };

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  excerpt?: { ka: string; en: string };

  @IsOptional()
  @IsObject()
  body?: { ka: string; en: string };

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(POST_STATUSES)
  status?: (typeof POST_STATUSES)[number];
}

export class ListPostsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  skip?: string;
}
