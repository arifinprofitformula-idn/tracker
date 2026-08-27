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
    expect(api).toMatch(/findAccessibleModule|accessibleModuleWhere/);
    expect(api).toMatch(/workspaceWriteRoles/);
    expect(api).toMatch(/moduleId/);
    expect(api).toMatch(/Forbidden|404|Not found/i);
  });

  it("lists trackers through workspace membership instead of direct owner filtering", () => {
    const api = apiSource();
    expect(api).toMatch(/accessibleModuleWhere\(auth\.userId\)/);
    expect(api).not.toMatch(/findMany\(\{ where: \{ ownerId: auth\.userId \}/);
  });

  it("creates an explicit program enrollment when creating trackers", () => {
    const api = apiSource();
    expect(api).toMatch(/ensureOwnerProgramEnrollment/);
    expect(api).toMatch(/prisma\.\$transaction/);
  });

  it("scopes daily plan routes through workspace-aware personal access", () => {
    const api = apiSource();
    expect(api).toMatch(/accessibleDailyPlanWhere/);
    expect(api).toMatch(/create: \{ userId: auth\.userId, workspaceId/);
  });

  it("keeps progress snapshots numeric and separate from private notes", () => {
    const schema = source("prisma/schema.prisma");
    const snapshotModel = schema.match(/model ProgressSnapshot \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(schema).toMatch(/model ProgressSnapshot/);
    expect(snapshotModel).toMatch(/workspaceId\s+String/);
    expect(snapshotModel).toMatch(/progress\s+Int/);
    expect(snapshotModel).not.toMatch(/content\s+String/);
    expect(snapshotModel).not.toMatch(/note/i);
  });

  it("stores billing and entitlement state server-side", () => {
    const schema = source("prisma/schema.prisma");
    expect(schema).toMatch(/model Plan/);
    expect(schema).toMatch(/entitlementConfig\s+Json/);
    expect(schema).toMatch(/model Subscription/);
    expect(schema).toMatch(/model BillingTransaction/);
    expect(schema).toMatch(/model WebhookEvent/);
    expect(schema).toMatch(/@@unique\(\[provider, providerEventId\]\)/);
  });

  it("provides public health, session, admin, and tracker endpoints", () => {
    const api = apiSource();
    expect(api).toMatch(/api\/health/);
    expect(api).toMatch(/api\/auth\/session|api\/me/);
    expect(api).toMatch(/api\/admin/);
    expect(api).toMatch(/api\/(trackers|modules)/);
  });
});
