import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

export const RECORD_STATUSES = ["draft", "published", "archived"] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/**
 * One row of content — an announcement, a conference, a staff profile.
 *
 * Every collection in the content model lives in this one Mongo collection,
 * told apart by `collection`. That is what lets 71 kinds of content share
 * one API, one admin screen and one audit trail: the shape lives in the
 * content model, not in a schema per kind.
 *
 * `data` is what the website reads. `draft` is what the admin edits. They
 * are separate so an editor can work on a page for a week without any of it
 * showing, and so publishing is a copy rather than a save:
 *
 *   data: null,  draft: {…}   never published; the site does not see it
 *   data: {…},   draft: null  published, no pending edits
 *   data: {…},   draft: {…}   published, with edits waiting
 */
@Schema({ timestamps: true, collection: "records", minimize: false })
export class ContentRecord {
  /**
   * Which collection in the content model this is a row of.
   *
   * Named `collectionName` rather than `collection`: Mongoose documents
   * already have a `collection` property — the Mongo handle — and shadowing
   * it makes every typed query on this model fail to compile.
   */
  @Prop({ type: String, required: true, index: true })
  collectionName!: string;

  /**
   * Stable identity within the collection, and the value the website's URLs
   * are built from where a collection has public pages. Taken from the
   * content's own `id`/`slug` at migration.
   */
  @Prop({ type: String, required: true })
  key!: string;

  /** hand ordering, where the collection is `sortable` */
  @Prop({ type: Number, default: 0 })
  order!: number;

  /** the published content; `null` until it is first published */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  data!: Record<string, unknown> | null;

  /** edits not yet published; `null` when there are none */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  draft!: Record<string, unknown> | null;

  @Prop({ type: String, required: true, enum: RECORD_STATUSES, default: "draft", index: true })
  status!: RecordStatus;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
  updatedBy?: unknown;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
  publishedBy?: unknown;
}

export type ContentRecordDocument = HydratedDocument<ContentRecord>;
export const ContentRecordSchema = SchemaFactory.createForClass(ContentRecord);

// One record per key per collection, and list screens read in order.
ContentRecordSchema.index({ collectionName: 1, key: 1 }, { unique: true });
ContentRecordSchema.index({ collectionName: 1, order: 1 });
ContentRecordSchema.index({ collectionName: 1, status: 1 });
