import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf8");

describe("public landing page", () => {
  it("contains hero, pain-gain, benefits, and registration CTA", () => {
    expect(source).toContain("Bangun konsistensi");
    expect(source).toContain("Masalahnya bukan kurang niat");
    expect(source).toContain("Yang berubah saat progres terlihat");
    expect(source).toContain("Manfaat yang terasa setiap hari");
    expect(source).toContain('href="/register"');
    expect(source).toContain("Daftar sekarang");
  });

  it("keeps login available for existing users", () => {
    expect(source).toContain('href="/login"');
    expect(source).toContain("Masuk");
  });
});
