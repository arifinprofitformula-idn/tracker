import { describe, expect, it } from "vitest";
import { parseEntitlementConfig } from "./entitlements";

describe("entitlements", () => {
  it("parses server-side plan config into workspace entitlements", () => {
    const entitlements = parseEntitlementConfig({
      code: "PERSONAL_PRO",
      entitlementConfig: {
        maxActivePrograms: -1,
        historyDays: -1,
        advancedAnalytics: true,
        aiWeeklyInsights: true,
        maxAccountabilityPartners: 3,
        maxClients: 0,
        maxCommunityMembers: 0,
        exportEnabled: true,
        customBranding: false,
      },
    });

    expect(entitlements).toMatchObject({
      plan: "PERSONAL_PRO",
      maxActivePrograms: -1,
      historyDays: -1,
      advancedAnalytics: true,
      exportEnabled: true,
    });
  });

  it("falls back to FREE defaults for malformed config", () => {
    const entitlements = parseEntitlementConfig({ code: "UNKNOWN", entitlementConfig: [] });
    expect(entitlements).toMatchObject({
      plan: "FREE",
      maxActivePrograms: 1,
      historyDays: 60,
      exportEnabled: false,
    });
  });
});
