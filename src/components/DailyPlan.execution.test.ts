import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/components/DailyPlan.tsx"), "utf8");

describe("daily plan execution actions", () => {
  it("offers Done and Reschedule on scheduled blocks", () => {
    expect(source).toContain("Tandai selesai");
    expect(source).toContain("Reschedule");
    expect(source).toContain("/api/daily-plan/complete");
    expect(source).toContain("/api/daily-plan/reschedule");
  });

  it("provides reschedule destination fields and undo feedback", () => {
    expect(source).toContain("Tanggal baru");
    expect(source).toContain("Jam mulai baru");
    expect(source).toContain("Undo");
  });
});
