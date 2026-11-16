import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { loadConfig, type AppConfig } from "./config/configuration";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CopyModule } from "./copy/copy.module";
import { ContentModule } from "./content/content.module";
import { ContentModelModule } from "./content-model/content-model.module";
import { MediaModule } from "./media/media.module";
import { RevisionsModule } from "./revisions/revisions.module";
import { PublishModule } from "./publish/publish.module";
import { SiteModule } from "./site/site.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // One validated object rather than loose `process.env` reads, so a
      // missing secret stops the boot with a sentence naming it.
      load: [() => ({ app: loadConfig() })],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<{ app: AppConfig }, true>) => ({
        uri: config.get("app", { infer: true }).mongoUri,
      }),
    }),
    // A floor under the whole API. The sign-in route sets its own, stricter.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuthModule,
    UsersModule,
    CopyModule,
    ContentModule,
    ContentModelModule,
    MediaModule,
    RevisionsModule,
    PublishModule,
    SiteModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Order matters: authenticate, then check the role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
