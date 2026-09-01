import sharp from "sharp";

/**
 * Image Compression Configuration
 */
const COMPRESSION_CONFIG = {
  // Maximum dimensions (maintain aspect ratio)
  maxWidth: 1920,
  maxHeight: 1920,

  // Quality settings
  jpeg: {
    quality: 80,
    progressive: true,
    mozjpeg: true, // Better compression
  },

  webp: {
    quality: 80,
    effort: 4, // 0-6, higher = better compression but slower
  },

  png: {
    quality: 80,
    compressionLevel: 9,
    progressive: true,
  },
};

export interface CompressImageOptions {
  /**
   * Maximum width (default: 1920px)
   */
  maxWidth?: number;

  /**
   * Maximum height (default: 1920px)
   */
  maxHeight?: number;

  /**
   * Quality 1-100 (default: 80)
   */
  quality?: number;

  /**
   * Convert to WebP format for better compression (default: false)
   * Note: Not all browsers support WebP, use with caution
   */
  convertToWebP?: boolean;
}

export interface CompressedImage {
  /**
   * Compressed image buffer
   */
  buffer: Buffer;

  /**
   * Content type (e.g., image/jpeg, image/webp)
   */
  contentType: string;

  /**
   * File extension (e.g., jpg, webp)
   */
  extension: string;

  /**
   * Original size in bytes
   */
  originalSize: number;

  /**
   * Compressed size in bytes
   */
  compressedSize: number;

  /**
   * Compression ratio (e.g., 0.5 means 50% reduction)
   */
  compressionRatio: number;

  /**
   * Image metadata
   */
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

/**
 * Compress an image buffer using Sharp
 *
 * @param inputBuffer - Original image buffer
 * @param options - Compression options
 * @returns Compressed image with metadata
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: CompressImageOptions = {},
): Promise<CompressedImage> {
  const {
    maxWidth = COMPRESSION_CONFIG.maxWidth,
    maxHeight = COMPRESSION_CONFIG.maxHeight,
    quality = 80,
    convertToWebP = false,
  } = options;

  const originalSize = inputBuffer.length;

  // Get image metadata
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  // Resize if needed (maintain aspect ratio)
  let pipeline = image.resize({
    width: maxWidth,
    height: maxHeight,
    fit: "inside", // Maintain aspect ratio, fit within dimensions
    withoutEnlargement: true, // Don't upscale small images
  });

  let outputFormat: string;
  let contentType: string;
  let extension: string;

  if (convertToWebP) {
    // Convert to WebP for best compression
    pipeline = pipeline.webp({
      quality,
      effort: COMPRESSION_CONFIG.webp.effort,
    });
    outputFormat = "webp";
    contentType = "image/webp";
    extension = "webp";
  } else {
    // Keep original format but compress
    const format = metadata.format || "jpeg";

    switch (format) {
      case "jpeg":
      case "jpg":
        pipeline = pipeline.jpeg({
          quality,
          progressive: COMPRESSION_CONFIG.jpeg.progressive,
          mozjpeg: COMPRESSION_CONFIG.jpeg.mozjpeg,
        });
        outputFormat = "jpeg";
        contentType = "image/jpeg";
        extension = "jpg";
        break;

      case "png":
        pipeline = pipeline.png({
          quality,
          compressionLevel: COMPRESSION_CONFIG.png.compressionLevel,
          progressive: COMPRESSION_CONFIG.png.progressive,
        });
        outputFormat = "png";
        contentType = "image/png";
        extension = "png";
        break;

      case "webp":
        pipeline = pipeline.webp({
          quality,
          effort: COMPRESSION_CONFIG.webp.effort,
        });
        outputFormat = "webp";
        contentType = "image/webp";
        extension = "webp";
        break;

      default:
        // Fallback to JPEG for unknown formats
        pipeline = pipeline.jpeg({
          quality,
          progressive: COMPRESSION_CONFIG.jpeg.progressive,
          mozjpeg: COMPRESSION_CONFIG.jpeg.mozjpeg,
        });
        outputFormat = "jpeg";
        contentType = "image/jpeg";
        extension = "jpg";
    }
  }

  // Execute compression
  const compressedBuffer = await pipeline.toBuffer();
  const compressedSize = compressedBuffer.length;
  const compressionRatio = 1 - compressedSize / originalSize;

  // Get final metadata
  const finalMetadata = await sharp(compressedBuffer).metadata();

  console.log(
    `Image compressed: ${originalSize} bytes → ${compressedSize} bytes (${(compressionRatio * 100).toFixed(1)}% reduction)`,
  );

  return {
    buffer: compressedBuffer,
    contentType,
    extension,
    originalSize,
    compressedSize,
    compressionRatio,
    metadata: {
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      format: outputFormat,
    },
  };
}

/**
 * Check if a buffer is an image
 */
export function isImageBuffer(buffer: Buffer): boolean {
  // Check magic numbers for common image formats
  const magicNumbers = [
    { format: "jpeg", bytes: [0xff, 0xd8, 0xff] },
    { format: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
    { format: "gif", bytes: [0x47, 0x49, 0x46] },
    { format: "webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { format: "bmp", bytes: [0x42, 0x4d] },
  ];

  for (const { bytes } of magicNumbers) {
    if (buffer.length >= bytes.length) {
      const matches = bytes.every((byte, index) => buffer[index] === byte);
      if (matches) return true;
    }
  }

  return false;
}

/**
 * Get image quality preset for different use cases
 */
export function getQualityPreset(
  preset: "thumbnail" | "standard" | "high",
): CompressImageOptions {
  switch (preset) {
    case "thumbnail":
      return {
        maxWidth: 400,
        maxHeight: 400,
        quality: 70,
        convertToWebP: false,
      };
    case "standard":
      return {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 80,
        convertToWebP: false,
      };
    case "high":
      return {
        maxWidth: 3840,
        maxHeight: 3840,
        quality: 90,
        convertToWebP: false,
      };
  }
}
