import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Arva Tracker branding", () => {
  it("uses official brand assets in auth and app header", () => {
    expect(read("src/components/AuthForm.tsx")).toContain("/brand/arva-tracker-symbol.png");
    expect(read("src/components/AppHeader.tsx")).toContain("/brand/arva-tracker-symbol.png");
    expect(read("src/components/AppHeader.tsx")).toContain("Arva Tracker");
  });

  it("publishes branded PWA and social metadata", () => {
    const manifest = read("public/manifest.webmanifest");
    expect(manifest).toContain('"name": "Arva Tracker"');
    expect(manifest).toContain("/brand/pwa-512.png");
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("/brand/og-arva-tracker.png");
    expect(layout).toContain("twitter");
  });

  it("provides branded logout and password recovery routes", () => {
    expect(fs.existsSync(path.join(process.cwd(), "src/app/logout/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "src/app/reset-password/page.tsx"))).toBe(true);
  });
});
