import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

/**
 * One line of the site's copy: a heading, a label, a paragraph.
 *
 * `path` is the key the page asks for — `pages.aboutMission.values.intro` —
 * and the website assembles the flat list back into the tree next-intl
 * wants. Flat, not nested, because every edit then touches one document and
 * two editors working on the same page never overwrite each other.
 *
 * `values` is live, `draft` is pending, as with content records.
 */
@Schema({ timestamps: true, collection: "copy", minimize: false })
export class CopyEntry {
  @Prop({ type: String, required: true, unique: true })
  path!: string;

  /** `pages.aboutMission`, for grouping the admin's screens by page */
  @Prop({ type: String, required: true, index: true })
  namespace!: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  values!: Record<string, string>;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  draft!: Record<string, string> | null;

  /**
   * ICU message arguments the string carries (`{count}`, `{name}`). Derived
   * at import and shown to the editor, because dropping one from a
   * translation throws at render time rather than looking wrong.
   */
  @Prop({ type: [String], default: [] })
  placeholders!: string[];

  /** several lines, or marked-up prose — the admin picks its input from this */
  @Prop({ type: Boolean, default: false })
  multiline!: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
  updatedBy?: unknown;
}

export type CopyEntryDocument = HydratedDocument<CopyEntry>;
export const CopyEntrySchema = SchemaFactory.createForClass(CopyEntry);
CopyEntrySchema.index({ namespace: 1, path: 1 });
