import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ContentRecord, ContentRecordSchema } from "../schemas/content-record.schema";
import { ContentService } from "./content.service";
import { ContentController } from "./content.controller";
import { RevisionsModule } from "../revisions/revisions.module";
import { PublishModule } from "../publish/publish.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ContentRecord.name, schema: ContentRecordSchema }]),
    RevisionsModule,
    PublishModule,
  ],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
