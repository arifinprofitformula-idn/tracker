import { describe, expect, it } from "vitest";
import { calculateTrackerStats, ownsResource } from "./tracker";

describe("tracker calculations", () => {
  it("calculates progress, perfect days, and current streak", () => {
    const stats = calculateTrackerStats(4, ["Prayer", "Read"], [
      { day: 1, activityIndex: 0 }, { day: 1, activityIndex: 1 },
      { day: 2, activityIndex: 0 }, { day: 2, activityIndex: 1 },
      { day: 3, activityIndex: 0 },
    ]);
    expect(stats).toEqual({ checked: 5, total: 8, progress: 63, perfectDays: 2, currentStreak: 0 });
  });
  it("counts only valid checks within range and ignores duplicates", () => {
    const stats = calculateTrackerStats(3, ["Run", "  "], [
      { day: 1, activityIndex: 0 }, { day: 1, activityIndex: 0 }, { day: 4, activityIndex: 0 },
    ]);
    expect(stats).toEqual({ checked: 1, total: 3, progress: 33, perfectDays: 1, currentStreak: 1 });
  });
  it("only counts filled activities, blank activities are ignored", () => {
    const stats = calculateTrackerStats(2, ["Run", "  "], [
      { day: 1, activityIndex: 0 }, { day: 2, activityIndex: 0 },
    ]);
    expect(stats).toEqual({ checked: 2, total: 2, progress: 100, perfectDays: 2, currentStreak: 2 });
  });
});

describe("ownership", () => {
  it("requires matching owner unless active admin", () => {
    expect(ownsResource("u1", "u1", "USER", "ACTIVE")).toBe(true);
    expect(ownsResource("u1", "u2", "USER", "ACTIVE")).toBe(false);
    expect(ownsResource("admin", "u2", "ADMIN", "ACTIVE")).toBe(true);
    expect(ownsResource("admin", "u2", "ADMIN", "SUSPENDED")).toBe(false);
  });
});