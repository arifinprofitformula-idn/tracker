import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("tracker vision board contract", () => {
  it("stores private image metadata with workspace, tracker, and user scope", () => {
    const schema = source("prisma/schema.prisma");
    const model = schema.match(/model TrackerVisionImage \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(model).toMatch(/workspaceId\s+String/);
    expect(model).toMatch(/moduleId\s+String/);
    expect(model).toMatch(/userId\s+String/);
    expect(model).toMatch(/storageKey\s+String\s+@unique/);
    expect(model).toMatch(/@@index\(\[moduleId, userId, position\]\)/);
  });

  it("serves and mutates images through authenticated scoped routes", () => {
    const api = source("src/app/api/[...route]/route.ts");
    expect(api).toContain("/vision-images");
    expect(api).toMatch(/userId: auth\.userId/);
    expect(api).toMatch(/accessibleModuleWhere\(auth\.userId/);
    expect(api).toMatch(/workspaceWriteRoles/);
    expect(api).toMatch(/Cache-Control.*private/);
    expect(api).toMatch(/X-Content-Type-Options/);
  });

  it("keeps the vision board two-up and metrics compact near the dashboard hero", () => {
    const dashboard = source("src/components/Dashboard.tsx");
    const css = source("src/app/globals.css");
    expect(dashboard).toMatch(/Visualisasi Impian/);
    expect(dashboard).toMatch(/dashboard-focus-grid/);
    expect(dashboard).toMatch(/compact-stats/);
    expect(dashboard).toMatch(/tracker-title-tagline/);
    expect(dashboard).not.toContain('<span className="section-icon"><Images size={19} /></span>');
    expect(dashboard.indexOf("dashboard-focus-grid")).toBeLessThan(dashboard.indexOf("tracker-portfolio"));
    expect(css).toMatch(/\.vision-slider[\s\S]*?grid-template-columns:\s*repeat\(2/);
    expect(css).toMatch(/\.compact-stats[\s\S]*?grid-template-columns:\s*repeat\(2/);
    expect(css).toMatch(/\.dashboard-shell \.tracker-title-card[\s\S]*?linear-gradient/);
    expect(css).toMatch(/\.dashboard-shell \.tracker-title-text[\s\S]*?font-size:\s*clamp\(19px, 2vw, 24px\)/);
    expect(css).not.toMatch(/\.dashboard-shell \.title-inline::before/);
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.dashboard-shell \.dashboard-hero[\s\S]*?margin-bottom:\s*0/);
    expect(dashboard).not.toMatch(/className="vision-delete"/);
    expect(dashboard).not.toMatch(/PencilLine|titleEditing|updateTrackerTitle/);
    expect(dashboard).toMatch(/onContextMenu=/);
    expect(dashboard).toMatch(/startVisionLongPress/);
    expect(dashboard).toMatch(/vision-action-menu/);
    expect(css).toMatch(/\.vision-action-menu[\s\S]*?position:\s*fixed/);
  });

  it("moves tracker editing into the dedicated management page", () => {
    const manager = source("src/components/TrackerManager.tsx");
    const header = source("src/components/AppHeader.tsx");
    const mobileNav = source("src/components/MobileBottomNav.tsx");
    expect(manager).toMatch(/Kelola Tracker/);
    expect(manager).toMatch(/method:\s*"PATCH"/);
    expect(manager).toContain("/api/modules/activities");
    expect(manager).toContain("/api/modules/start-date");
    expect(header).toContain('href="/tracker"');
    expect(mobileNav).toContain('href="/tracker"');
  });
});
