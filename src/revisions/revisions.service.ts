import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Revision, type RevisionDocument } from "../schemas/revision.schema";
import type { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class RevisionsService {
  constructor(@InjectModel(Revision.name) private readonly revisions: Model<RevisionDocument>) {}

  async snapshot(input: {
    subject: "records" | "copy";
    scope: string;
    target: string;
    snapshot: unknown;
    action: string;
    actor?: AuthUser;
    note?: string;
  }): Promise<void> {
    // Nothing to keep a copy of the first time a record is written.
    if (input.snapshot === null || input.snapshot === undefined) return;
    await this.revisions.create({
      subject: input.subject,
      scope: input.scope,
      target: input.target,
      snapshot: input.snapshot,
      action: input.action,
      author: input.actor?.id,
      authorName: input.actor?.name,
      note: input.note,
    });
  }

  async history(
    subject: string,
    scope: string,
    target: string,
    limit = 50,
  ): Promise<RevisionDocument[]> {
    return this.revisions
      .find({ subject, scope, target })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .exec();
  }

  async get(id: string): Promise<RevisionDocument> {
    const revision = await this.revisions.findById(id).exec();
    if (!revision) throw new NotFoundException("No such revision.");
    return revision;
  }

  /** Recent activity across everything, for the admin's dashboard. */
  async recent(limit = 20): Promise<RevisionDocument[]> {
    return this.revisions.find().sort({ createdAt: -1 }).limit(limit).exec();
  }
}
