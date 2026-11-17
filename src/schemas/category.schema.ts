import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export interface Localized {
  ka: string;
  en: string;
}

/**
 * A placement category — WordPress's idea of a post category.
 *
 * A post is filed under any number of these, and that is what decides where
 * it shows on the site: a post in `news` appears in the news feed, one in
 * `school-of-business` on the business school page. The `slug` is the stable
 * identity the site reads; `name` is what the editor sees, per language.
 *
 * `parent` lets categories nest (a school under "Schools"), mirroring the
 * hierarchy an editor coming from WordPress expects in the checkbox list.
 */
@Schema({ timestamps: true, collection: "categories", minimize: false })
export class Category {
  @Prop({ type: String, required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: Object, required: true })
  name!: Localized;

  /** parent category slug, for a hierarchy; `null` at the top level */
  @Prop({ type: String, default: null })
  parent!: string | null;

  /** editors order categories by hand; ties break on the English name */
  @Prop({ type: Number, default: 0 })
  order!: number;

  @Prop({ type: Object, default: () => ({ ka: "", en: "" }) })
  description!: Localized;
}

export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);
