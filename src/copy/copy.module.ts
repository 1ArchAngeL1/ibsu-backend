import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CopyEntry, CopyEntrySchema } from "../schemas/copy-entry.schema";
import { CopyService } from "./copy.service";
import { CopyController } from "./copy.controller";
import { RevisionsModule } from "../revisions/revisions.module";
import { PublishModule } from "../publish/publish.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CopyEntry.name, schema: CopyEntrySchema }]),
    RevisionsModule,
    PublishModule,
  ],
  providers: [CopyService],
  controllers: [CopyController],
  exports: [CopyService],
})
export class CopyModule {}
