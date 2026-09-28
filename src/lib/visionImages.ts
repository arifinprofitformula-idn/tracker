import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_VISION_IMAGES_PER_TRACKER = 10;
export const MAX_VISION_FILES_PER_UPLOAD = 5;
export const MAX_VISION_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VISION_UPLOAD_REQUEST_BYTES = MAX_VISION_FILES_PER_UPLOAD * MAX_VISION_IMAGE_BYTES + 1024 * 1024;
export const ACCEPTED_VISION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const STORAGE_KEY_PATTERN = /^[0-9a-f-]{36}\.webp$/i;
const MAX_OUTPUT_EDGE = 1600;

export type PreparedVisionImage = {
  storageKey: string;
  originalName: string;
  mimeType: "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
  buffer: Buffer;
};

export function visionStorageRoot() {
  const configured = process.env.TRACKER_VISION_UPLOAD_DIR?.trim();
  return path.resolve(/* turbopackIgnore: true */ configured || path.join(process.cwd(), ".local", "uploads", "vision-images"));
}

export function safeOriginalName(name: string) {
  return path.basename(name).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || "image";
}

export function visionImagePath(storageKey: string) {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) throw new Error("INVALID_STORAGE_KEY");
  return path.join(/* turbopackIgnore: true */ visionStorageRoot(), storageKey);
}

export function validateVisionUploadBatch(files: File[], currentCount: number) {
  if (files.length < 1) throw new Error("VISION_IMAGE_REQUIRED");
  if (files.length > MAX_VISION_FILES_PER_UPLOAD) throw new Error("VISION_UPLOAD_BATCH_LIMIT");
  if (currentCount + files.length > MAX_VISION_IMAGES_PER_TRACKER) throw new Error("VISION_IMAGE_LIMIT");
  for (const file of files) {
    if (file.size < 1 || file.size > MAX_VISION_IMAGE_BYTES) throw new Error("VISION_IMAGE_SIZE");
    if (!ACCEPTED_VISION_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_VISION_IMAGE_TYPES)[number])) {
      throw new Error("VISION_IMAGE_TYPE");
    }
  }
}

export async function prepareVisionImage(file: File): Promise<PreparedVisionImage> {
  if (file.size < 1 || file.size > MAX_VISION_IMAGE_BYTES) throw new Error("VISION_IMAGE_SIZE");
  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(input, { failOn: "warning", limitInputPixels: 40_000_000 });
  const metadata = await pipeline.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("VISION_IMAGE_TYPE");
  if ((metadata.pages ?? 1) > 1) throw new Error("VISION_IMAGE_ANIMATED");

  const result = await pipeline
    .rotate()
    .resize({ width: MAX_OUTPUT_EDGE, height: MAX_OUTPUT_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  if (!result.info.width || !result.info.height) throw new Error("VISION_IMAGE_INVALID");
  return {
    storageKey: `${randomUUID()}.webp`,
    originalName: safeOriginalName(file.name),
    mimeType: "image/webp",
    sizeBytes: result.data.byteLength,
    width: result.info.width,
    height: result.info.height,
    buffer: result.data,
  };
}

export async function persistVisionImage(image: PreparedVisionImage) {
  const root = visionStorageRoot();
  await mkdir(/* turbopackIgnore: true */ root, { recursive: true });
  const destination = visionImagePath(image.storageKey);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(/* turbopackIgnore: true */ temporary, image.buffer, { flag: "wx" });
    await rename(/* turbopackIgnore: true */ temporary, destination);
  } catch (error) {
    await unlink(/* turbopackIgnore: true */ temporary).catch(() => undefined);
    throw error;
  }
}

export async function readVisionImage(storageKey: string) {
  return readFile(/* turbopackIgnore: true */ visionImagePath(storageKey));
}

export async function removeVisionImage(storageKey: string) {
  await unlink(/* turbopackIgnore: true */ visionImagePath(storageKey)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
