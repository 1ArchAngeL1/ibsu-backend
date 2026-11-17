import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

/**
 * A photograph, logo or document the site uses.
 *
 * Two sources, and the difference matters:
 *
 *   public  the 869 files already in the website's `public/` folder. The
 *           content refers to them by the path they have always had
 *           (`/photos/hero-building.webp`) and Next goes on serving them.
 *           Indexing rather than moving them means no content had to be
 *           rewritten and nothing broke on the day the CMS arrived.
 *   upload  added through the admin. Stored next to the API and served by
 *           it under `/media/`.
 *
 * Either way `path` is what goes into the content and what the website
 * renders, so a picture can be swapped for the other kind at any time.
 */
export const MEDIA_SOURCES = ["public", "upload", "r2", "wp"] as const;
export type MediaSource = (typeof MEDIA_SOURCES)[number];

@Schema({ timestamps: true, collection: "media", minimize: false })
export class MediaAsset {
  /** what the website renders: `/photos/x.webp` or `/media/2026/11/x.webp` */
  @Prop({ type: String, required: true, unique: true })
  path!: string;

  /**
   * The object key in R2 (its `fileId`) when `source === "r2"`. The public
   * URL in `path` is this key under the bucket's public base. Absent for
   * files on local disk or those shipped in the site's `public/` folder.
   */
  @Prop({ type: String })
  key?: string;

  @Prop({ type: String, required: true, enum: MEDIA_SOURCES, index: true })
  source!: MediaSource;

  @Prop({ type: String, required: true })
  originalName!: string;

  @Prop({ type: String, required: true })
  mime!: string;

  @Prop({ type: Number, required: true })
  bytes!: number;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;

  /**
   * Alternative text, per language. Empty is allowed and meaningful — a
   * decorative photograph should carry `alt=""` rather than a description
   * a screen reader has to sit through.
   */
  @Prop({ type: SchemaTypes.Mixed, default: {} })
  alt!: Record<string, string>;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  caption!: Record<string, string>;

  /** `photos/media/columns`, for browsing */
  @Prop({ type: String, default: "", index: true })
  folder!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  /** generated widths, for the `sizes` the site asks for */
  @Prop({ type: [{ width: Number, path: String, bytes: Number, key: String }], default: [] })
  variants!: { width: number; path: string; bytes: number; key?: string }[];

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
  uploadedBy?: unknown;
}

export type MediaAssetDocument = HydratedDocument<MediaAsset>;
export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
MediaAssetSchema.index({ originalName: "text", tags: "text" });
