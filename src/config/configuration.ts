/**
 * Everything the API needs from its environment, read once and validated
 * once, so a missing secret fails at boot with a sentence about which one
 * rather than at 3am with a stack trace.
 */
export interface AppConfig {
  port: number;
  mongoUri: string;
  jwt: { secret: string; accessTtl: string; refreshTtl: string };
  /** where the website runs, for CORS and for the revalidation call */
  site: { origin: string; revalidateUrl: string; revalidateSecret: string };
  /** admin origins allowed to call this API with credentials */
  corsOrigins: string[];
  uploads: { dir: string; publicPrefix: string; maxBytes: number; variantWidths: number[] };
  /** the website's `public/` folder, indexed into the media library */
  sitePublicDir: string;
  /** lets the website read drafts; never handed to a browser */
  previewSecret: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `${name} is not set. Copy backend/.env.example to backend/.env and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export function loadConfig(): AppConfig {
  const secret = required("JWT_SECRET");
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }
  return {
    port: Number(optional("PORT", "4000")),
    mongoUri: optional("MONGO_URI", "mongodb://127.0.0.1:27017/ibsu"),
    jwt: {
      secret,
      accessTtl: optional("JWT_ACCESS_TTL", "30m"),
      refreshTtl: optional("JWT_REFRESH_TTL", "7d"),
    },
    site: {
      origin: optional("SITE_ORIGIN", "http://localhost:3000"),
      revalidateUrl: optional("SITE_REVALIDATE_URL", "http://localhost:3000/api/revalidate"),
      revalidateSecret: required("REVALIDATE_SECRET"),
    },
    corsOrigins: optional("CORS_ORIGINS", "http://localhost:3000")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    uploads: {
      dir: optional("UPLOADS_DIR", "uploads"),
      publicPrefix: "/media",
      maxBytes: Number(optional("UPLOAD_MAX_BYTES", String(25 * 1024 * 1024))),
      variantWidths: optional("VARIANT_WIDTHS", "480,768,1200,1920")
        .split(",")
        .map((w) => Number(w.trim()))
        .filter((w) => Number.isFinite(w) && w > 0),
    },
    sitePublicDir: optional("SITE_PUBLIC_DIR", "../public"),
    previewSecret: required("PREVIEW_SECRET"),
  };
}
