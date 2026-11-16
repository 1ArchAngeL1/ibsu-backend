import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Revision, RevisionSchema } from "../schemas/revision.schema";
import { AuditLog, AuditLogSchema } from "../schemas/audit-log.schema";
import { RevisionsService } from "./revisions.service";
import { AuditService } from "./audit.service";
import { RevisionsController } from "./revisions.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Revision.name, schema: RevisionSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [RevisionsService, AuditService],
  controllers: [RevisionsController],
  exports: [RevisionsService, AuditService],
})
export class RevisionsModule {}
