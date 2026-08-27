import { describe, expect, it } from "vitest";
import { calculateCoachRisk } from "./coachRisk";

describe("calculateCoachRisk", () => {
  it("returns green with no reasons for a healthy client", () => {
    expect(calculateCoachRisk({ inactivityDays: 1, completion7d: 80, streakBroken: false, priorityTasksMissed: 0 })).toEqual({
      score: 0,
      level: "GREEN",
      reasons: [],
    });
  });

  it("returns transparent weighted reasons for an at-risk client", () => {
    expect(calculateCoachRisk({ inactivityDays: 3, completion7d: 40, streakBroken: true, priorityTasksMissed: 2 })).toEqual({
      score: 100,
      level: "RED",
      reasons: [
        { code: "INACTIVE_3D", points: 35, label: "Tidak aktif selama 3 hari atau lebih" },
        { code: "LOW_COMPLETION_7D", points: 30, label: "Penyelesaian 7 hari di bawah 50%" },
        { code: "STREAK_BROKEN", points: 20, label: "Streak terputus" },
        { code: "PRIORITY_MISSED", points: 15, label: "Tugas prioritas terlewat" },
      ],
    });
  });

  it("uses yellow and red boundaries defined by the blueprint", () => {
    expect(calculateCoachRisk({ inactivityDays: 0, completion7d: 49, streakBroken: false, priorityTasksMissed: 0 }).level).toBe("YELLOW");
    expect(calculateCoachRisk({ inactivityDays: 3, completion7d: 90, streakBroken: true, priorityTasksMissed: 0 }).level).toBe("YELLOW");
    expect(calculateCoachRisk({ inactivityDays: 3, completion7d: 49, streakBroken: false, priorityTasksMissed: 0 }).level).toBe("RED");
  });
});
