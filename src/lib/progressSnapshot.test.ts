import { describe, expect, it } from "vitest";
import { buildProgressSnapshotInput, dayForSnapshot } from "./progressSnapshot";

describe("progress snapshot calculations", () => {
  it("calculates the active program day from the start date", () => {
    expect(dayForSnapshot(new Date("2026-08-25T00:00:00Z"), new Date("2026-08-27T00:00:00Z"), 40)).toBe(3);
    expect(dayForSnapshot(new Date("2026-08-28T00:00:00Z"), new Date("2026-08-27T00:00:00Z"), 40)).toBeNull();
    expect(dayForSnapshot(new Date("2026-08-01T00:00:00Z"), new Date("2026-09-30T00:00:00Z"), 40)).toBeNull();
  });

  it("builds a numeric aggregate without private notes", () => {
    const snapshot = buildProgressSnapshotInput(
      {
        id: "module_1",
        ownerId: "user_1",
        workspaceId: "workspace_1",
        days: 3,
        activities: ["Read", "Run", " "],
        startDate: new Date("2026-08-25T00:00:00Z"),
        checks: [
          { day: 1, activityIdx: 0 },
          { day: 1, activityIdx: 1 },
          { day: 2, activityIdx: 0 },
        ],
      },
      new Date("2026-08-27T12:00:00Z"),
    );

    expect(snapshot).toMatchObject({
      workspaceId: "workspace_1",
      moduleId: "module_1",
      userId: "user_1",
      day: 3,
      totalActivities: 2,
      checkedCount: 3,
      totalCount: 6,
      progress: 50,
      perfectDays: 1,
      currentStreak: 0,
    });
    expect(Object.keys(snapshot)).not.toContain("content");
    expect(Object.keys(snapshot)).not.toContain("notes");
  });
});
