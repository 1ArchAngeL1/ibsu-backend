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

  /**
   * The narrower copies the site's `sizes` ask for.
   *
   * Two kinds live here. Uploads through the admin get the widths in
   * `VARIANT_WIDTHS`, made by sharp. A file mirrored out of WordPress gets
   * exactly the derivatives WordPress itself had made and the old posts
   * actually reference (`photo-768x512.webp`), so a migrated `srcset` keeps
   * every width it was written with.
   */
  @Prop({
    type: [{ width: Number, height: Number, path: String, bytes: Number, key: String }],
    default: [],
  })
  variants!: { width: number; height?: number; path: string; bytes: number; key?: string }[];

  /**
   * Everything WordPress knew about this attachment, kept as it was found.
   *
   * The library is the old site's media library: 5,435 attachments whose
   * titles, captions, dates and authors are the only record of what they
   * are. `id` is the attachment's WordPress post id and `parentPost` the
   * post it was uploaded to, so a file can still be traced back to where it
   * came from after the files themselves have moved into our bucket.
   * `url` is where it used to live, which is what the old content referred
   * to before it was relinked. `null` for anything not out of WordPress.
   */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  wp!: {
    id: number;
    url: string;
    file: string;
    slug?: string;
    title?: string;
    date?: string | null;
    modified?: string | null;
    mediaType?: string;
    description?: string;
    parentPost?: number | null;
    author?: number | null;
    width?: number | null;
    height?: number | null;
    filesize?: number | null;
    sizes?: { name: string; width: number; height: number; mime?: string; url: string }[];
  } | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
  uploadedBy?: unknown;
}

export type MediaAssetDocument = HydratedDocument<MediaAsset>;
export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
MediaAssetSchema.index({ originalName: "text", tags: "text" });
/** the WordPress importer upserts on this; sparse, since only mirrored files have it */
MediaAssetSchema.index({ "wp.id": 1 }, { sparse: true });
/** relinking looks every referenced WordPress URL up by the key it maps to */
MediaAssetSchema.index({ key: 1 }, { sparse: true });
MediaAssetSchema.index({ "variants.key": 1 }, { sparse: true });
