import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MediaAsset, type MediaAssetDocument } from "../schemas/media-asset.schema";
import { AuditService } from "../revisions/audit.service";
import type { AppConfig } from "../config/configuration";
import type { AuthUser } from "../common/decorators/current-user.decorator";

/** What a browser may hand us. Anything else is refused by extension. */
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["image/svg+xml", ".svg"],
  ["application/pdf", ".pdf"],
]);

const RASTER = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/**
 * What multer hands over. Declared here rather than taken from
 * `Express.Multer.File`: that type arrives through a global augmentation in
 * `@types/multer`, which is loaded or not depending on how the compiler
 * resolves ambient types, and a signature this small is not worth the
 * uncertainty.
 */
export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name);

  constructor(
    @InjectModel(MediaAsset.name) private readonly media: Model<MediaAssetDocument>,
    private readonly audit: AuditService,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
  ) {}

  private get app(): AppConfig {
    return this.config.get("app", { infer: true });
  }

  async browse(options: {
    folder?: string;
    search?: string;
    source?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ total: number; assets: MediaAssetDocument[] }> {
    const filter: Record<string, unknown> = {};
    if (options.folder) filter.folder = options.folder;
    if (options.source) filter.source = options.source;
    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { path: { $regex: escaped, $options: "i" } },
        { originalName: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
      ];
    }
    const [total, assets] = await Promise.all([
      this.media.countDocuments(filter).exec(),
      this.media
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(options.skip ?? 0)
        .limit(Math.min(options.limit ?? 60, 300))
        .exec(),
    ]);
    return { total, assets };
  }

  /** The folder tree, for the picker's sidebar. */
  async folders(): Promise<{ folder: string; count: number }[]> {
    const rows = await this.media.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$folder", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((r) => ({ folder: r._id, count: r.count }));
  }

  async byPath(assetPath: string): Promise<MediaAssetDocument> {
    const asset = await this.media.findOne({ path: assetPath }).exec();
    if (!asset) throw new NotFoundException(`Nothing in the library at ${assetPath}.`);
    return asset;
  }

  /**
   * Takes an upload, writes it under `uploads/<year>/<month>/`, and makes
   * the narrower copies the site's `sizes` ask for.
   *
   * Uploads are always converted to WebP unless they are an SVG or a PDF:
   * the site's existing 869 photographs are WebP, the layouts are built for
   * it, and a 4 MB phone JPEG straight from somebody's camera would
   * otherwise become the heaviest thing on the page.
   */
  async upload(
    file: UploadedFileLike,
    meta: { folder?: string; alt?: Record<string, string>; tags?: string[] },
    actor?: AuthUser,
  ): Promise<MediaAssetDocument> {
    if (!ALLOWED.has(file.mimetype)) {
      throw new BadRequestException(
        `${file.mimetype} is not a kind of file the site uses. Images or PDFs, please.`,
      );
    }
    if (file.size > this.app.uploads.maxBytes) {
      throw new BadRequestException(
        `That file is ${Math.round(file.size / 1024 / 1024)} MB; the limit is ${Math.round(
          this.app.uploads.maxBytes / 1024 / 1024,
        )} MB.`,
      );
    }

    const now = new Date();
    const folder = normalizeFolder(
      meta.folder ?? `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`,
    );
    const raster = RASTER.has(file.mimetype);
    const stem = safeStem(file.originalname);
    const extension = raster ? ".webp" : ALLOWED.get(file.mimetype)!;
    const base = await this.uniqueName(folder, stem, extension);

    const dir = path.join(this.app.uploads.dir, folder);
    await fs.mkdir(dir, { recursive: true });

    let width: number | undefined;
    let height: number | undefined;
    let bytes = file.size;
    const variants: { width: number; path: string; bytes: number }[] = [];

    if (raster) {
      const image = sharp(file.buffer, { failOn: "error" });
      const info = await image.metadata();
      width = info.width;
      height = info.height;

      const main = await image.clone().webp({ quality: 82 }).toBuffer();
      await fs.writeFile(path.join(dir, base + extension), main);
      bytes = main.length;

      for (const target of this.app.uploads.variantWidths) {
        // Never upscale: a 600px photograph has no 1920px version to give.
        if (!width || target >= width) continue;
        const resized = await sharp(file.buffer)
          .resize({ width: target })
          .webp({ quality: 80 })
          .toBuffer();
        const name = `${base}-${target}w${extension}`;
        await fs.writeFile(path.join(dir, name), resized);
        variants.push({
          width: target,
          path: `${this.app.uploads.publicPrefix}/${folder}/${name}`,
          bytes: resized.length,
        });
      }
    } else {
      await fs.writeFile(path.join(dir, base + extension), file.buffer);
    }

    const asset = await this.media.create({
      path: `${this.app.uploads.publicPrefix}/${folder}/${base}${extension}`,
      source: "upload",
      originalName: file.originalname,
      mime: raster ? "image/webp" : file.mimetype,
      bytes,
      width,
      height,
      alt: meta.alt ?? {},
      folder,
      tags: meta.tags ?? [],
      variants,
      uploadedBy: actor?.id,
    });

    await this.audit.record(actor, "media.upload", asset.path, { bytes, variants: variants.length });
    return asset;
  }

  async updateMeta(
    assetPath: string,
    changes: { alt?: Record<string, string>; caption?: Record<string, string>; tags?: string[]; folder?: string },
    actor?: AuthUser,
  ): Promise<MediaAssetDocument> {
    const asset = await this.byPath(assetPath);
    if (changes.alt) asset.alt = { ...asset.alt, ...changes.alt };
    if (changes.caption) asset.caption = { ...asset.caption, ...changes.caption };
    if (changes.tags) asset.tags = changes.tags;
    if (changes.folder !== undefined) asset.folder = normalizeFolder(changes.folder);
    await asset.save();
    await this.audit.record(actor, "media.update", assetPath);
    return asset;
  }

  /**
   * Removes an uploaded file. Files that came with the website are only
   * de-listed, never deleted: they are in git, the deploy would put them
   * back, and the content may still point at them.
   */
  async remove(assetPath: string, actor?: AuthUser): Promise<void> {
    const asset = await this.byPath(assetPath);
    if (asset.source === "upload") {
      const relative = asset.path.slice(this.app.uploads.publicPrefix.length + 1);
      for (const victim of [relative, ...asset.variants.map((v) => v.path.slice(this.app.uploads.publicPrefix.length + 1))]) {
        await fs.rm(path.join(this.app.uploads.dir, victim), { force: true });
      }
    }
    await this.media.deleteOne({ path: assetPath }).exec();
    await this.audit.record(actor, "media.delete", assetPath, { source: asset.source });
  }

  /**
   * Walks the website's `public/` folder and lists what is there.
   *
   * The site has 869 photographs, logos and documents that content already
   * points at by path. Indexing them makes every one of them pickable in
   * the admin on the first day, without moving a file or rewriting a single
   * reference.
   */
  async indexSitePublic(): Promise<{ added: number; seen: number }> {
    const root = path.resolve(this.app.sitePublicDir);
    let seen = 0;
    let added = 0;

    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        this.log.warn(`cannot read ${dir}; skipping`);
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        const extension = path.extname(entry.name).toLowerCase();
        const mime = MIME_BY_EXTENSION[extension];
        if (!mime) continue;

        const webPath = `/${path.relative(root, full).split(path.sep).join("/")}`;
        seen += 1;
        if (await this.media.exists({ path: webPath })) continue;

        const stat = await fs.stat(full);
        let width: number | undefined;
        let height: number | undefined;
        if (RASTER.has(mime)) {
          try {
            const info = await sharp(full).metadata();
            width = info.width;
            height = info.height;
          } catch {
            // a file sharp cannot read is still a file the site serves
          }
        }
        await this.media.create({
          path: webPath,
          source: "public",
          originalName: entry.name,
          mime,
          bytes: stat.size,
          width,
          height,
          folder: path.dirname(webPath).replace(/^\//, ""),
        });
        added += 1;
      }
    };

    await walk(root);
    this.log.log(`media library: ${added} new of ${seen} files under ${root}`);
    return { added, seen };
  }

  async stats(): Promise<{ total: number; uploads: number; bytes: number }> {
    const [total, uploads, sized] = await Promise.all([
      this.media.countDocuments().exec(),
      this.media.countDocuments({ source: "upload" }).exec(),
      this.media.aggregate<{ bytes: number }>([
        { $group: { _id: null, bytes: { $sum: "$bytes" } } },
      ]),
    ]);
    return { total, uploads, bytes: sized[0]?.bytes ?? 0 };
  }

  private async uniqueName(folder: string, stem: string, extension: string): Promise<string> {
    let candidate = stem;
    let n = 2;
    while (
      await this.media.exists({
        path: `${this.app.uploads.publicPrefix}/${folder}/${candidate}${extension}`,
      })
    ) {
      candidate = `${stem}-${n}`;
      n += 1;
    }
    return candidate;
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
};

/** `My Photo (2).JPG` → `my-photo-2` */
function safeStem(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const slug = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "file";
}

function normalizeFolder(folder: string): string {
  return folder
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}
