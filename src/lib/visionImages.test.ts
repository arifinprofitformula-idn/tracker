import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  MAX_VISION_IMAGE_BYTES,
  prepareVisionImage,
  safeOriginalName,
  validateVisionUploadBatch,
  visionImagePath,
} from "./visionImages";

describe("tracker vision image processing", () => {
  it("normalizes names and rejects unsafe storage keys", () => {
    expect(safeOriginalName("../my\u0000dream.png")).toBe("mydream.png");
    expect(() => visionImagePath("../../secret.webp")).toThrow("INVALID_STORAGE_KEY");
    expect(path.extname(visionImagePath("f4e33760-1a93-4318-bd85-e70080230cb2.webp"))).toBe(".webp");
  });

  it("enforces count, type, and size limits before processing", () => {
    const image = new File([Buffer.from("not-yet-decoded")], "dream.jpg", { type: "image/jpeg" });
    expect(() => validateVisionUploadBatch([image], 9)).not.toThrow();
    expect(() => validateVisionUploadBatch([image, image], 9)).toThrow("VISION_IMAGE_LIMIT");
    expect(() => validateVisionUploadBatch([new File(["x"], "dream.svg", { type: "image/svg+xml" })], 0)).toThrow("VISION_IMAGE_TYPE");
    expect(() => validateVisionUploadBatch([new File([Uint8Array.from(Buffer.alloc(MAX_VISION_IMAGE_BYTES + 1))], "large.png", { type: "image/png" })], 0)).toThrow("VISION_IMAGE_SIZE");
  });

  it("converts a valid upload to bounded webp output", async () => {
    const source = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#42aaa4" } }).png().toBuffer();
    const prepared = await prepareVisionImage(new File([Uint8Array.from(source)], "future.png", { type: "image/png" }));
    const metadata = await sharp(prepared.buffer).metadata();
    expect(prepared).toMatchObject({ mimeType: "image/webp", width: 1600, height: 800, originalName: "future.png" });
    expect(metadata.format).toBe("webp");
    expect(prepared.storageKey).toMatch(/^[0-9a-f-]{36}\.webp$/);
  });
});
