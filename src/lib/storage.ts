import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  compressImage,
  isImageBuffer,
  type CompressImageOptions,
} from "./image-compression";

interface UploadOptions {
  buffer: Buffer;
  contentType: string;
  directory?: string;
  fileName?: string;
  /**
   * Enable image compression (default: true for images)
   * Set to false to disable compression
   */
  compress?: boolean;
  /**
   * Compression settings (optional, uses defaults if not provided)
   */
  compressionOptions?: CompressImageOptions;
}

export interface UploadResult {
  url: string;
  storagePath: string;
}

interface StorageAdapter {
  upload(options: UploadOptions): Promise<UploadResult>;
  delete(storagePath: string): Promise<void>;
  getSignedUploadUrl?(key: string, contentType: string, expiresIn: number): Promise<string>;
}

// ─── Config ────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "monitoring";

// Baca runtime — jangan cache di module scope agar selalu reflect nilai .env terkini
function getStorageDriver(): string {
  const driver = process.env.STORAGE_DRIVER;
  if (driver) return driver;
  const hasR2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID;
  if (hasR2) return "r2";
  if (process.env.SUPABASE_URL) return "supabase";
  return "local";
}

// ─── Local Adapter ─────────────────────────────────────────────────────────

class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_DIR
      ? path.resolve(process.env.LOCAL_STORAGE_DIR)
      : path.join(process.cwd(), "public", "uploads");
  }

  private async ensureDir(dir: string) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  async upload({
    buffer,
    contentType,
    directory,
    fileName,
  }: UploadOptions): Promise<UploadResult> {
    const safeDir = directory?.replace(/\\/g, "/") || "";
    const finalDir = path.join(this.baseDir, safeDir);
    await this.ensureDir(finalDir);

    const extension = getExtensionFromContentType(contentType);
    const safeName = createSafeFileName(fileName, extension);
    const filePath = path.join(finalDir, safeName);
    await writeFile(filePath, buffer);

    const relativePath = path
      .relative(this.baseDir, filePath)
      .replace(/\\/g, "/");
    const publicPath = path.join("/uploads", relativePath).replace(/\\/g, "/");

    return {
      url: publicPath,
      storagePath: relativePath,
    };
  }

  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;
    const absolutePath = path.join(this.baseDir, storagePath);
    try {
      await unlink(absolutePath);
    } catch {
      // ignore missing files
    }
  }
}

// ─── Supabase Adapter ──────────────────────────────────────────────────────

class SupabaseStorageAdapter implements StorageAdapter {
  private bucket: string;
  private client = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: { persistSession: false },
  });

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload({
    buffer,
    contentType,
    directory,
    fileName,
  }: UploadOptions): Promise<UploadResult> {
    const extension = getExtensionFromContentType(contentType);
    const safeName = createSafeFileName(fileName, extension);
    const key = path.posix.join(directory || "", safeName);

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, buffer, { contentType, upsert: false });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(key);

    return {
      url: data.publicUrl,
      storagePath: key,
    };
  }

  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storagePath]);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }
}

// ─── Cloudflare R2 Adapter ─────────────────────────────────────────────────

class R2StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "R2 credentials are required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET"
      );
    }
    if (!publicUrl) {
      throw new Error(
        "R2_PUBLIC_URL is required (e.g. https://pub-xxx.r2.dev or custom domain)"
      );
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/$/, "");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload({
    buffer,
    contentType,
    directory,
    fileName,
  }: UploadOptions): Promise<UploadResult> {
    const extension = getExtensionFromContentType(contentType);
    const safeName = createSafeFileName(fileName, extension);
    const key = directory ? `${directory}/${safeName}` : safeName;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      url: `${this.publicUrl}/${key}`,
      storagePath: key,
    };
  }

  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      })
    );
  }

  async getSignedUploadUrl(key: string, contentType: string, expiresIn: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function createSafeFileName(fileName: string | undefined, extension: string) {
  if (fileName) {
    const hasExt = path.extname(fileName);
    return (
      fileName.replace(/[^a-zA-Z0-9_.-]/g, "_") + (hasExt ? "" : extension)
    );
  }
  return `${Date.now()}-${randomUUID()}${extension}`;
}

function getExtensionFromContentType(contentType: string) {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
  };
  return map[contentType] || "";
}

// ─── Resolver ──────────────────────────────────────────────────────────────

let storageAdapter: StorageAdapter | null = null;

function resolveAdapter(): StorageAdapter {
  if (storageAdapter) return storageAdapter;

  const driver = getStorageDriver();

  if (driver === "r2") {
    storageAdapter = new R2StorageAdapter();
  } else if (driver === "supabase") {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Supabase credentials are required for supabase storage driver."
      );
    }
    storageAdapter = new SupabaseStorageAdapter(supabaseBucket);
  } else {
    storageAdapter = new LocalStorageAdapter();
  }

  return storageAdapter;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function uploadFile(
  options: UploadOptions
): Promise<UploadResult> {
  const adapter = resolveAdapter();

  // Auto-compress images unless explicitly disabled
  const shouldCompress =
    options.compress !== false &&
    (options.contentType.startsWith("image/") || isImageBuffer(options.buffer));

  if (shouldCompress) {
    try {
      const compressed = await compressImage(
        options.buffer,
        options.compressionOptions || { quality: 80 }
      );

      return adapter.upload({
        ...options,
        buffer: compressed.buffer,
        contentType: compressed.contentType,
      });
    } catch (error) {
      console.error("Image compression failed, uploading original:", error);
      return adapter.upload(options);
    }
  }

  return adapter.upload(options);
}

export async function deleteFile(storagePath: string): Promise<void> {
  const adapter = resolveAdapter();
  await adapter.delete(storagePath);
}

/**
 * Return "signed" jika driver R2 (upload langsung dari browser ke R2),
 * "proxy" jika driver lain (upload lewat server).
 */
export function getUploadMode(): "signed" | "proxy" {
  return getStorageDriver() === "r2" ? "signed" : "proxy";
}

export interface SignedUploadResult {
  signedUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Generate presigned PUT URL untuk upload langsung dari browser ke R2.
 * Hanya tersedia jika STORAGE_DRIVER=r2.
 */
export async function generateSignedUpload(
  directory: string,
  fileName: string,
  contentType: string,
  expiresIn = 300
): Promise<SignedUploadResult> {
  const adapter = resolveAdapter();

  if (!adapter.getSignedUploadUrl) {
    throw new Error("Signed upload tidak didukung untuk storage driver ini");
  }

  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!publicUrl) {
    throw new Error("R2_PUBLIC_URL tidak dikonfigurasi");
  }

  const extension = getExtensionFromContentType(contentType);
  const safeName = createSafeFileName(fileName, extension);
  const key = directory ? `${directory}/${safeName}` : safeName;

  const signedUrl = await adapter.getSignedUploadUrl(key, contentType, expiresIn);

  return { signedUrl, key, publicUrl: `${publicUrl}/${key}` };
}
