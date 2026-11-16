import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog, type AuditLogDocument } from "../schemas/audit-log.schema";
import type { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class AuditService {
  private readonly log = new Logger(AuditService.name);

  constructor(@InjectModel(AuditLog.name) private readonly audit: Model<AuditLogDocument>) {}

  /**
   * Never throws. An audit write failing must not take a content save down
   * with it — losing the trail is bad, losing the edit is worse.
   */
  async record(
    actor: AuthUser | undefined,
    action: string,
    target?: string,
    detail?: unknown,
    ip?: string,
  ): Promise<void> {
    try {
      await this.audit.create({
        actor: actor?.id,
        actorEmail: actor?.email,
        action,
        target,
        detail,
        ip,
      });
    } catch (error) {
      this.log.warn(`could not write audit entry ${action}: ${(error as Error).message}`);
    }
  }

  async list(limit = 100, action?: string): Promise<AuditLogDocument[]> {
    return this.audit
      .find(action ? { action } : {})
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 500))
      .exec();
  }
}
