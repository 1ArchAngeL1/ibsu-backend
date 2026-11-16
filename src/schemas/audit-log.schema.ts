import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

/** Who did what, and from where. Append-only; nothing in the API deletes it. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "audit" })
export class AuditLog {
  @Prop({ type: SchemaTypes.ObjectId, ref: "User", index: true })
  actor?: unknown;

  @Prop({ type: String })
  actorEmail?: string;

  /** `copy.save`, `records.publish`, `media.delete`, `auth.login` */
  @Prop({ type: String, required: true, index: true })
  action!: string;

  @Prop({ type: String })
  target?: string;

  @Prop({ type: SchemaTypes.Mixed })
  detail?: unknown;

  @Prop({ type: String })
  ip?: string;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
