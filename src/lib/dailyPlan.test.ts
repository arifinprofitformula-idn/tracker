import { describe, expect, it } from "vitest";
import { blocksOverlap, effectiveBlockStatus, findOverlappingBlock, formatMinutes, parseTimeToMinutes, shiftISODate, sortByStart } from "./dailyPlan";

describe("blocksOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(blocksOverlap({ startMinute: 60, endMinute: 120 }, { startMinute: 90, endMinute: 150 })).toBe(true);
    expect(blocksOverlap({ startMinute: 60, endMinute: 120 }, { startMinute: 0, endMinute: 60 })).toBe(false);
    expect(blocksOverlap({ startMinute: 60, endMinute: 120 }, { startMinute: 120, endMinute: 180 })).toBe(false);
    expect(blocksOverlap({ startMinute: 60, endMinute: 120 }, { startMinute: 70, endMinute: 80 })).toBe(true);
  });
});

describe("findOverlappingBlock", () => {
  const blocks = [
    { id: "a", startMinute: 60, endMinute: 120 },
    { id: "b", startMinute: 180, endMinute: 240 },
  ];
  it("finds a conflicting block", () => {
    expect(findOverlappingBlock(blocks, { startMinute: 90, endMinute: 100 })?.id).toBe("a");
  });
  it("returns undefined when there is no conflict", () => {
    expect(findOverlappingBlock(blocks, { startMinute: 120, endMinute: 180 })).toBeUndefined();
  });
  it("excludes the block being updated from the conflict check", () => {
    expect(findOverlappingBlock(blocks, { startMinute: 60, endMinute: 130 }, "a")).toBeUndefined();
    expect(findOverlappingBlock(blocks, { startMinute: 60, endMinute: 130 }, "b")?.id).toBe("a");
  });
});

describe("formatMinutes / parseTimeToMinutes", () => {
  it("formats minutes since midnight as HH:MM", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(90)).toBe("01:30");
    expect(formatMinutes(1439)).toBe("23:59");
  });
  it("parses valid HH:MM strings", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("06:30")).toBe(390);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });
  it("rejects invalid time strings", () => {
    expect(parseTimeToMinutes("24:00")).toBeNull();
    expect(parseTimeToMinutes("12:60")).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
    expect(parseTimeToMinutes("9:30")).toBeNull();
  });
});

describe("shiftISODate", () => {
  it("moves forward and backward across month/year boundaries", () => {
    expect(shiftISODate("2026-08-26", 1)).toBe("2026-08-27");
    expect(shiftISODate("2026-08-26", -1)).toBe("2026-08-25");
    expect(shiftISODate("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftISODate("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("effectiveBlockStatus", () => {
  const now = new Date(2026, 7, 26, 10, 30);
  it("marks an overdue scheduled block as missed", () => {
    expect(effectiveBlockStatus("SCHEDULED", "2026-08-26", 600, now)).toBe("MISSED");
  });
  it("keeps future and active scheduled blocks scheduled", () => {
    expect(effectiveBlockStatus("SCHEDULED", "2026-08-26", 660, now)).toBe("SCHEDULED");
    expect(effectiveBlockStatus("SCHEDULED", "2026-08-27", 60, now)).toBe("SCHEDULED");
  });
  it("never overrides terminal statuses", () => {
    expect(effectiveBlockStatus("COMPLETED", "2026-08-25", 60, now)).toBe("COMPLETED");
    expect(effectiveBlockStatus("RESCHEDULED", "2026-08-25", 60, now)).toBe("RESCHEDULED");
  });
});

describe("sortByStart", () => {
  it("sorts blocks by start time without mutating the input", () => {
    const blocks = [{ startMinute: 120 }, { startMinute: 0 }, { startMinute: 60 }];
    const sorted = sortByStart(blocks);
    expect(sorted.map((b) => b.startMinute)).toEqual([0, 60, 120]);
    expect(blocks.map((b) => b.startMinute)).toEqual([120, 0, 60]);
  });
});
