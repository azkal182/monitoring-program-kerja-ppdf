import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
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
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "monitoring";
const storageDriver =
  process.env.STORAGE_DRIVER ||
  (supabaseUrl && supabaseServiceRoleKey ? "supabase" : "local");

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
    } catch (error) {
      // ignore missing files
    }
  }
}

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

let storageAdapter: StorageAdapter | null = null;

function resolveAdapter(): StorageAdapter {
  if (storageAdapter) return storageAdapter;

  if (storageDriver === "supabase") {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Supabase credentials are required for supabase storage driver.",
      );
    }
    storageAdapter = new SupabaseStorageAdapter(supabaseBucket);
  } else {
    storageAdapter = new LocalStorageAdapter();
  }

  return storageAdapter;
}

export async function uploadFile(
  options: UploadOptions,
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
        options.compressionOptions || { quality: 80 },
      );

      // Use compressed buffer and update content type if format changed
      return adapter.upload({
        ...options,
        buffer: compressed.buffer,
        contentType: compressed.contentType,
      });
    } catch (error) {
      console.error("Image compression failed, uploading original:", error);
      // Fallback to original if compression fails
      return adapter.upload(options);
    }
  }

  return adapter.upload(options);
}

export async function deleteFile(storagePath: string): Promise<void> {
  const adapter = resolveAdapter();
  await adapter.delete(storagePath);
}
