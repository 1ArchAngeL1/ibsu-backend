import { Module } from "@nestjs/common";
import { ContentModelController } from "./content-model.controller";

@Module({ controllers: [ContentModelController] })
export class ContentModelModule {}
