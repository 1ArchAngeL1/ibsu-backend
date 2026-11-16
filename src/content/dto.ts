import { IsArray, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SaveRecordDto {
  /**
   * Whatever the collection's fields describe. The shape is checked against
   * the content model in the service, which is the only thing that knows
   * what this collection's fields are — a DTO cannot, since there are 71 of
   * them and they differ in every field.
   */
  @IsObject()
  data!: Record<string, unknown>;
}

export class CreateRecordDto extends SaveRecordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  key!: string;
}

export class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  keys!: string[];
}

export class RestoreDto {
  @IsString()
  revisionId!: string;
}

export class ListQueryDto {
  @IsOptional()
  @IsString()
  status?: "draft" | "published" | "archived";

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
