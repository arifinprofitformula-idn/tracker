import { describe, expect, it } from "vitest";
import { computeAmountCents, computePeriodEnd } from "./billing";

describe("computeAmountCents", () => {
  it("returns monthly price for monthly interval", () => {
    expect(computeAmountCents({ monthlyPriceCents: 3900000, yearlyPriceCents: 34900000 }, "monthly")).toBe(3900000);
  });

  it("returns yearly price for yearly interval", () => {
    expect(computeAmountCents({ monthlyPriceCents: 3900000, yearlyPriceCents: 34900000 }, "yearly")).toBe(34900000);
  });
});

describe("computePeriodEnd", () => {
  it("adds 30 days for monthly interval", () => {
    const start = new Date("2026-08-01T00:00:00Z");
    expect(computePeriodEnd(start, "monthly").toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("adds 365 days for yearly interval", () => {
    const start = new Date("2026-08-01T00:00:00Z");
    expect(computePeriodEnd(start, "yearly").toISOString()).toBe("2027-08-01T00:00:00.000Z");
  });
});
