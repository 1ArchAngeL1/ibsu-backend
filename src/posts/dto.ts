import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString } from "class-validator";
import { POST_STATUSES, POST_VISIBILITIES } from "../schemas/post.schema";

type Localized = { ka: string; en: string };

/**
 * Everything a post carries except the title, which is required on create and
 * optional on update. Localized fields are validated as objects and stored
 * whole, the same treatment content records get. `cover` is a media path or
 * "" to clear it; `publishedAt` is an ISO date (a future one schedules the
 * post, "" clears the schedule).
 */
class PostFieldsDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  excerpt?: Localized;

  @IsOptional()
  @IsObject()
  body?: Localized;

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

  @IsOptional()
  @IsIn(POST_VISIBILITIES)
  visibility?: (typeof POST_VISIBILITIES)[number];

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  sticky?: boolean;

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsString()
  publishedAt?: string;
}

export class CreatePostDto extends PostFieldsDto {
  @IsObject()
  title!: Localized;
}

export class UpdatePostDto extends PostFieldsDto {
  @IsOptional()
  @IsObject()
  title?: Localized;
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
