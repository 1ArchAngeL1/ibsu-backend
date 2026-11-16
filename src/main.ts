import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "node:path";
import { AppModule } from "./app.module";
import type { AppConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn", "log"],
  });
  const config = app.get(ConfigService<{ app: AppConfig }, true>);
  const settings = config.get("app", { infer: true });

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use(
    helmet({
      // The admin loads uploaded images from this origin into a page served
      // from another, which the default same-origin policy would block.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: settings.corsOrigins,
    // The admin signs in with an httpOnly cookie, so the browser has to be
    // allowed to send it.
    credentials: true,
    allowedHeaders: ["content-type", "authorization", "x-preview-secret"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // A request carrying a field the DTO does not declare is a mistake
      // worth naming rather than quietly dropping.
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * Uploaded files, served straight off disk. The website's own `public/`
   * folder is still served by Next — see MediaService.indexSitePublic for
   * why the two live side by side.
   */
  app.useStaticAssets(path.resolve(settings.uploads.dir), {
    prefix: `${settings.uploads.publicPrefix}/`,
    maxAge: "365d",
    immutable: true,
    index: false,
  });

  await app.listen(settings.port);
  new Logger("bootstrap").log(
    `IBSU content API on http://localhost:${settings.port}/api — site at ${settings.site.origin}`,
  );
}

void bootstrap();
