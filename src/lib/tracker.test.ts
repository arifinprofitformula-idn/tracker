import { describe, expect, it } from "vitest";
import { buildDefaultPhases, calculatePhaseStats, calculateTrackerStats, ownsResource } from "./tracker";

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

describe("calculatePhaseStats", () => {
  const activities = ["Run", "Read"];

  it("is upcoming when today is before the phase starts", () => {
    const stats = calculatePhaseStats(11, 20, 5, activities, [], 70);
    expect(stats).toEqual({ status: "upcoming", percent: 0, perfectDays: 0, totalDaysCounted: 0, streak: 0, targetMet: null });
  });

  it("is upcoming when there is no start date yet (today is null)", () => {
    const stats = calculatePhaseStats(1, 10, null, activities, [], 70);
    expect(stats.status).toBe("upcoming");
    expect(stats.targetMet).toBeNull();
  });

  it("scores an active phase only against days elapsed so far, not the full range", () => {
    const checks = [
      { day: 1, activityIndex: 0 }, { day: 1, activityIndex: 1 },
      { day: 2, activityIndex: 0 }, { day: 2, activityIndex: 1 },
    ];
    const stats = calculatePhaseStats(1, 10, 2, activities, checks, 70);
    expect(stats.status).toBe("active");
    expect(stats.totalDaysCounted).toBe(2);
    expect(stats.percent).toBe(100);
    expect(stats.perfectDays).toBe(2);
    expect(stats.streak).toBe(2);
    expect(stats.targetMet).toBeNull();
  });

  it("breaks the streak on an incomplete day", () => {
    const checks = [
      { day: 1, activityIndex: 0 }, { day: 1, activityIndex: 1 },
      { day: 2, activityIndex: 0 },
      { day: 3, activityIndex: 0 }, { day: 3, activityIndex: 1 },
    ];
    const stats = calculatePhaseStats(1, 10, 3, activities, checks, 70);
    expect(stats.perfectDays).toBe(2);
    expect(stats.streak).toBe(1);
  });

  it("judges a completed phase against its full range and reports target outcome", () => {
    const checks = [
      { day: 1, activityIndex: 0 }, { day: 1, activityIndex: 1 },
      { day: 2, activityIndex: 0 }, { day: 2, activityIndex: 1 },
    ];
    const met = calculatePhaseStats(1, 2, 5, activities, checks, 70);
    expect(met.status).toBe("completed");
    expect(met.percent).toBe(100);
    expect(met.targetMet).toBe(true);

    const missed = calculatePhaseStats(1, 4, 5, activities, checks, 70);
    expect(missed.status).toBe("completed");
    expect(missed.percent).toBe(50);
    expect(missed.targetMet).toBe(false);
  });

  it("ignores blank activities and checks outside the phase range", () => {
    const checks = [{ day: 1, activityIndex: 0 }, { day: 99, activityIndex: 0 }];
    const stats = calculatePhaseStats(1, 3, 3, ["Run", "  "], checks, 70);
    expect(stats.totalDaysCounted).toBe(3);
    expect(stats.percent).toBe(33);
  });
});

describe("buildDefaultPhases", () => {
  it("splits an even day count into 4 equal phases", () => {
    const phases = buildDefaultPhases(40);
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => [p.startDay, p.endDay])).toEqual([[1, 10], [11, 20], [21, 30], [31, 40]]);
    expect(phases.every((p) => p.targetPercent === 70)).toBe(true);
    expect(phases.map((p) => p.position)).toEqual([0, 1, 2, 3]);
  });

  it("distributes the remainder across the first phases", () => {
    const phases = buildDefaultPhases(10);
    expect(phases.map((p) => [p.startDay, p.endDay])).toEqual([[1, 3], [4, 6], [7, 8], [9, 10]]);
  });

  it("uses fewer phases than the template when there are not enough days", () => {
    expect(buildDefaultPhases(3).map((p) => [p.startDay, p.endDay])).toEqual([[1, 1], [2, 2], [3, 3]]);
    expect(buildDefaultPhases(1).map((p) => [p.startDay, p.endDay])).toEqual([[1, 1]]);
  });

  it("returns an empty list for zero or negative days", () => {
    expect(buildDefaultPhases(0)).toEqual([]);
    expect(buildDefaultPhases(-5)).toEqual([]);
  });
});