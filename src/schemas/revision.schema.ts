import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

/**
 * What a record looked like before someone changed it.
 *
 * Written on every save, before the save. The university has people
 * editing the same pages, and the cost of keeping a copy of a few
 * kilobytes of JSON is nothing against finding out on Monday that
 * Friday's text is gone with no way back.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "revisions" })
export class Revision {
  /** `records`, `copy` — which kind of thing this is a revision of */
  @Prop({ type: String, required: true, index: true })
  subject!: string;

  /** the collection name for records, the namespace for copy */
  @Prop({ type: String, required: true, index: true })
  scope!: string;

  /** the record's key, or the copy path */
  @Prop({ type: String, required: true, index: true })
  target!: string;

  /** the content as it was */
  @Prop({ type: SchemaTypes.Mixed, required: true })
  snapshot!: unknown;

  /** `save`, `publish`, `unpublish`, `restore`, `delete`, `reorder` */
  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
  author?: unknown;

  @Prop({ type: String })
  authorName?: string;

  @Prop({ type: String })
  note?: string;
}

export type RevisionDocument = HydratedDocument<Revision>;
export const RevisionSchema = SchemaFactory.createForClass(Revision);
RevisionSchema.index({ subject: 1, scope: 1, target: 1, createdAt: -1 });
