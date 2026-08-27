import { describe, expect, it } from "vitest";
import { PLAN_SEEDS } from "./plans";

describe("plan seeds", () => {
  it("contains the V2 pricing ladder from the master prompt", () => {
    expect(PLAN_SEEDS.map((plan) => plan.code)).toEqual([
      "FREE",
      "PERSONAL_PRO",
      "COACH_PRO",
      "COMMUNITY",
      "BUSINESS",
    ]);
    expect(PLAN_SEEDS.find((plan) => plan.code === "PERSONAL_PRO")).toMatchObject({
      monthlyPriceCents: 3900000,
      yearlyPriceCents: 34900000,
    });
    expect(PLAN_SEEDS.find((plan) => plan.code === "COACH_PRO")).toMatchObject({
      monthlyPriceCents: 19900000,
      yearlyPriceCents: 179000000,
    });
    expect(PLAN_SEEDS.find((plan) => plan.code === "COMMUNITY")).toMatchObject({
      monthlyPriceCents: 59900000,
      yearlyPriceCents: 539000000,
    });
  });
});
