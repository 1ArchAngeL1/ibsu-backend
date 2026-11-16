import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { MediaAsset, MediaAssetSchema } from "../schemas/media-asset.schema";
import { MediaService } from "./media.service";
import { MediaController } from "./media.controller";
import { RevisionsModule } from "../revisions/revisions.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MediaAsset.name, schema: MediaAssetSchema }]),
    // In memory, because every upload is re-encoded by sharp before it is
    // written: a temporary file on disk would only be read straight back.
    MulterModule.register({ storage: undefined }),
    RevisionsModule,
  ],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
