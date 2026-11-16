import { Controller, Get, Param, Query } from "@nestjs/common";
import { RevisionsService } from "./revisions.service";
import { AuditService } from "./audit.service";
import { Roles } from "../common/decorators/roles.decorator";

@Controller()
export class RevisionsController {
  constructor(
    private readonly revisions: RevisionsService,
    private readonly audit: AuditService,
  ) {}

  @Get("revisions/recent")
  async recent(@Query("limit") limit?: string) {
    const list = await this.revisions.recent(Number(limit) || 20);
    return list.map(summarize);
  }

  @Get("revisions/:subject/:scope/:target")
  async history(
    @Param("subject") subject: string,
    @Param("scope") scope: string,
    @Param("target") target: string,
  ) {
    const list = await this.revisions.history(subject, scope, target);
    return list.map(summarize);
  }

  @Get("revisions/one/:id")
  async one(@Param("id") id: string) {
    const revision = await this.revisions.get(id);
    return { ...summarize(revision), snapshot: revision.snapshot };
  }

  @Get("audit")
  @Roles("admin")
  async auditLog(@Query("limit") limit?: string, @Query("action") action?: string) {
    const list = await this.audit.list(Number(limit) || 100, action);
    return list.map((entry) => ({
      id: String(entry._id),
      action: entry.action,
      target: entry.target ?? null,
      actor: entry.actorEmail ?? null,
      detail: entry.detail ?? null,
      at: entry.get("createdAt") as Date,
    }));
  }
}

function summarize(revision: {
  _id: unknown;
  subject: string;
  scope: string;
  target: string;
  action: string;
  authorName?: string;
  note?: string;
  get(key: string): unknown;
}) {
  return {
    id: String(revision._id),
    subject: revision.subject,
    scope: revision.scope,
    target: revision.target,
    action: revision.action,
    author: revision.authorName ?? null,
    note: revision.note ?? null,
    at: revision.get("createdAt") as Date,
  };
}
