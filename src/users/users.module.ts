import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RevisionsModule } from "../revisions/revisions.module";
import { User, UserSchema } from "../schemas/user.schema";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // the controller records who changed an account
    RevisionsModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
