import { IsInt, IsObject, IsOptional, IsString } from "class-validator";

/**
 * A localized object arrives as `{ ka, en }` and is validated as an object
 * rather than a nested DTO, the same way content records are: the pair is
 * stored whole, and checking its two string leaves buys nothing.
 */
export class CreateCategoryDto {
  @IsObject()
  name!: { ka: string; en: string };

  /** derived from the English name when absent */
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  parent?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsObject()
  description?: { ka: string; en: string };
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsObject()
  name?: { ka: string; en: string };

  @IsOptional()
  @IsString()
  parent?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsObject()
  description?: { ka: string; en: string };
}
