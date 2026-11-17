import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";
import type { Localized } from "./category.schema";

export const POST_STATUSES = ["draft", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * A post — the WordPress idea of content.
 *
 * Write it once, file it under categories, and it surfaces wherever those
 * categories place it. It is the opposite of this CMS's other content, which
 * is one form per collection with placement fixed by which collection you
 * chose: a post carries its own placement in `categories`.
 *
 * Bilingual throughout. `body` is the markdown subset the website's `rich`
 * renderer already reads, so a post needs no new rendering on the site.
 */
@Schema({ timestamps: true, collection: "posts", minimize: false })
export class Post {
  /** stable public identity; the site's URLs would be built from this */
  @Prop({ type: String, required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: Object, required: true })
  title!: Localized;

  @Prop({ type: Object, default: () => ({ ka: "", en: "" }) })
  excerpt!: Localized;

  @Prop({ type: Object, default: () => ({ ka: "", en: "" }) })
  body!: Localized;

  /** a path into the media library, e.g. `/photos/hero.webp`; the cover */
  @Prop({ type: String, default: null })
  cover!: string | null;

  /** category slugs this post is filed under — its placement on the site */
  @Prop({ type: [String], default: [], index: true })
  categories!: string[];

  /** free-form tags, the secondary WordPress taxonomy */
  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: String, enum: POST_STATUSES, default: "draft", index: true })
  status!: PostStatus;

  /** when it was first published; `null` while it is a draft */
  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  /** the name shown in the list, kept flat so a list needs no user join */
  @Prop({ type: String, default: null })
  authorName!: string | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
  authorId?: unknown;

  /**
   * Where a migrated post came from.
   *
   * Everything in the `records` collections can be pulled into posts so it is
   * all visible and editable in one place. When it is, `source` remembers the
   * origin — which collection, which key, its label — and keeps the full
   * original `data`, so no structured field is lost in the flattening and the
   * original record (left untouched in `records`) can still be found. Native
   * posts, written here, have `source: null`.
   */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  source!: {
    collection: string;
    key: string;
    label: string;
    data: Record<string, unknown>;
  } | null;
}

export type PostDocument = HydratedDocument<Post>;
export const PostSchema = SchemaFactory.createForClass(Post);
