import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/**
 * Who may do what.
 *
 *   admin      everything, including other people's accounts
 *   editor     write and publish content, upload media
 *   translator write content, but never publish — the university's
 *              translators work ahead of a release, and a half-finished
 *              Georgian page must not reach the site because someone saved
 *   viewer     read the admin, change nothing
 */
export const ROLES = ["admin", "editor", "translator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

@Schema({ timestamps: true, collection: "users" })
export class User {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: true })
  name!: string;

  /** bcrypt. Never selected by default — see UsersService.findForLogin. */
  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, required: true, enum: ROLES, default: "viewer" })
  role!: Role;

  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  /**
   * Bumped when the password changes or the account is suspended. Access
   * tokens carry the value they were minted with, so raising it makes every
   * token already in the wild fail the next request.
   */
  @Prop({ type: Number, default: 1 })
  tokenVersion!: number;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
