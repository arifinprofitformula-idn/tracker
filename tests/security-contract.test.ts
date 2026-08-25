import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function source(path: string) {
  return readFileSync(path, "utf8");
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : entry.name === "route.ts" ? [path] : [];
  });
}

function apiSource() {
  return walk("src/app/api").map(source).join("\n");
}

describe("production security contract", () => {
  it("does not persist raw session tokens", () => {
    const schema = source("prisma/schema.prisma");
    const auth = source("src/lib/prisma.ts");
    expect(schema).not.toMatch(/\btoken\s+String\s+@unique/);
    expect(schema).toMatch(/tokenHash\s+String\s+@unique/);
    expect(auth).toMatch(/sha256|createHash\(["']sha256["']\)/i);
  });

  it("has explicit same-origin protection for state-changing routes", () => {
    const api = apiSource();
    expect(api).toMatch(/origin/i);
    expect(api).toMatch(/APP_URL/);
    expect(api).toMatch(/403/);
  });

  it("checks tracker ownership before check and note mutations", () => {
    const api = apiSource();
    expect(api).toMatch(/ownerId/);
    expect(api).toMatch(/moduleId/);
    expect(api).toMatch(/Forbidden|404|Not found/i);
  });

  it("provides public health, session, admin, and tracker endpoints", () => {
    const api = apiSource();
    expect(api).toMatch(/api\/health/);
    expect(api).toMatch(/api\/auth\/session|api\/me/);
    expect(api).toMatch(/api\/admin/);
    expect(api).toMatch(/api\/(trackers|modules)/);
  });
});
