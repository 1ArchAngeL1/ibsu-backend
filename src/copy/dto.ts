import { IsObject, IsOptional, IsString } from "class-validator";

export class SaveCopyDto {
  /** `{ ka: "…", en: "…" }` — either language on its own is fine. */
  @IsObject()
  values!: Record<string, string>;
}

export class PublishCopyDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  namespace?: string;
}
