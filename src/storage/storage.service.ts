import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config/configuration";

/**
 * Where uploaded files live. One of two backends, chosen once at boot:
 *
 *   R2      when every R2_* variable is set - files are PUT to the bucket and
 *           served from its public base URL (a CDN, with no egress cost).
 *   local   otherwise - files are written under `uploads/` and served by this
 *           API at `/media/`, exactly as things worked before R2 existed.
 *
 * MediaService never has to know which: it hands over a key and some bytes
 * and gets back the URL to store. `key` is the object key in R2 (the
 * `fileId`) and `<folder>/<name>` on local disk - the same string either way,
 * so a library built on one backend still deletes cleanly on the other.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly localDir: string;
  private readonly localPrefix: string;

  constructor(private readonly config: ConfigService<{ app: AppConfig }, true>) {
    const app = this.config.get("app", { infer: true });
    this.localDir = app.uploads.dir;
    this.localPrefix = app.uploads.publicPrefix;
    const r2 = app.r2;
    if (r2) {
      this.client = new S3Client({
        region: "auto",
        endpoint: r2.endpoint,
        credentials: {
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        },
      });
      this.bucket = r2.bucket;
      this.publicBase = r2.publicBaseUrl;
      this.log.log(`media storage: Cloudflare R2 bucket "${r2.bucket}"`);
    } else {
      this.client = null;
      this.bucket = "";
      this.publicBase = "";
      this.log.log("media storage: local disk (R2 not configured)");
    }
  }

  /** True when uploads go to R2 rather than local disk. */
  get usingR2(): boolean {
    return this.client !== null;
  }

  /** The public URL a given key is served at, without storing anything. */
  publicUrl(key: string): string {
    return this.client ? `${this.publicBase}/${key}` : `${this.localPrefix}/${key}`;
  }

  /** Store bytes under `key`; return the public URL to render. */
  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.client) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return `${this.publicBase}/${key}`;
    }
    const full = path.join(this.localDir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return `${this.localPrefix}/${key}`;
  }

  /** Remove the object at `key`. Missing is not an error. */
  async delete(key: string): Promise<void> {
    if (this.client) {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return;
    }
    await fs.rm(path.join(this.localDir, key), { force: true });
  }
}
