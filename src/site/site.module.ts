import { Module } from "@nestjs/common";
import { SiteController } from "./site.controller";
import { CopyModule } from "../copy/copy.module";
import { ContentModule } from "../content/content.module";

@Module({
  imports: [CopyModule, ContentModule],
  controllers: [SiteController],
})
export class SiteModule {}
