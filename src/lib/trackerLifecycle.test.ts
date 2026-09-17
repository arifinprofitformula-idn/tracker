import { DailyProgressStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateDailyProgressSummary,
  dailyProgressRows,
  endDateForDuration,
  hasTrackerEnded,
  inclusiveDayCount,
  progressFromChecklist,
  trackerPeriod,
} from "./trackerLifecycle";

describe("tracker lifecycle dates", () => {
  it("uses an inclusive 40-day period", () => {
    const period = trackerPeriod("2026-10-26", "2026-09-17");
    expect(period.days).toBe(40);
    expect(period.startDate.toISOString()).toBe("2026-09-17T00:00:00.000Z");
    expect(period.endDate.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(inclusiveDayCount(period.startDate, period.endDate)).toBe(40);
  });

  it("rejects periods shorter than 40 or longer than 100 days", () => {
    expect(() => trackerPeriod("2026-10-25", "2026-09-17")).toThrow("TRACKER_DURATION_INVALID");
    expect(() => trackerPeriod("2026-12-26", "2026-09-17")).toThrow("TRACKER_DURATION_INVALID");
  });

  it("marks a tracker ended only after its inclusive end date", () => {
    const endDate = endDateForDuration(new Date("2026-09-17T00:00:00Z"), 40);
    expect(hasTrackerEnded(endDate, new Date("2026-10-26T12:00:00Z"))).toBe(false);
    expect(hasTrackerEnded(endDate, new Date("2026-10-27T00:00:00Z"))).toBe(true);
  });
});

describe("daily accountability", () => {
  it("creates one persistent pending row for every tracker day", () => {
    const rows = dailyProgressRows("module_1", "user_1", new Date("2026-09-17T00:00:00Z"), 40);
    expect(rows).toHaveLength(40);
    expect(rows[0]).toMatchObject({ day: 1, progress: 0, status: DailyProgressStatus.PENDING });
    expect(rows[39].date.toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });

  it("separates input accountability from weighted life-change progress", () => {
    const summary = calculateDailyProgressSummary([
      { status: "SUBMITTED", progress: 100 },
      { status: "SUBMITTED", progress: 50 },
      { status: "MISSED", progress: 0 },
    ], 40);
    expect(summary).toEqual({ submittedDays: 2, missedDays: 1, pendingDays: 37, accountabilityPercent: 5, progressPercent: 4 });
  });

  it("calculates daily progress from the active checklist", () => {
    expect(progressFromChecklist(["Read", "Run", " "], [0])).toBe(50);
    expect(progressFromChecklist(["Read", "Run"], [0, 1])).toBe(100);
  });
});
