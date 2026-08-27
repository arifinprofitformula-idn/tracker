import { Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlanCode = "FREE" | "PERSONAL_PRO" | "COACH_PRO" | "COMMUNITY" | "BUSINESS";

export type WorkspaceEntitlements = {
  plan: PlanCode;
  maxActivePrograms: number;
  historyDays: number;
  advancedAnalytics: boolean;
  aiWeeklyInsights: boolean;
  maxAccountabilityPartners: number;
  maxClients: number;
  maxCommunityMembers: number;
  exportEnabled: boolean;
  customBranding: boolean;
};

type Db = typeof prisma | Prisma.TransactionClient;

export const FREE_ENTITLEMENTS: WorkspaceEntitlements = {
  plan: "FREE",
  maxActivePrograms: 1,
  historyDays: 60,
  advancedAnalytics: false,
  aiWeeklyInsights: false,
  maxAccountabilityPartners: 0,
  maxClients: 0,
  maxCommunityMembers: 0,
  exportEnabled: false,
  customBranding: false,
};

export const ENTITLEMENT_ACCESS_STATUSES = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.GRACE,
] as const;

function isPlanCode(value: string): value is PlanCode {
  return ["FREE", "PERSONAL_PRO", "COACH_PRO", "COMMUNITY", "BUSINESS"].includes(value);
}

export function parseEntitlementConfig(plan: { code: string; entitlementConfig: Prisma.JsonValue }): WorkspaceEntitlements {
  const raw = typeof plan.entitlementConfig === "object" && plan.entitlementConfig !== null && !Array.isArray(plan.entitlementConfig)
    ? plan.entitlementConfig as Record<string, unknown>
    : {};

  return {
    ...FREE_ENTITLEMENTS,
    plan: isPlanCode(plan.code) ? plan.code : "FREE",
    maxActivePrograms: typeof raw.maxActivePrograms === "number" ? raw.maxActivePrograms : FREE_ENTITLEMENTS.maxActivePrograms,
    historyDays: typeof raw.historyDays === "number" ? raw.historyDays : FREE_ENTITLEMENTS.historyDays,
    advancedAnalytics: raw.advancedAnalytics === true,
    aiWeeklyInsights: raw.aiWeeklyInsights === true,
    maxAccountabilityPartners: typeof raw.maxAccountabilityPartners === "number" ? raw.maxAccountabilityPartners : FREE_ENTITLEMENTS.maxAccountabilityPartners,
    maxClients: typeof raw.maxClients === "number" ? raw.maxClients : FREE_ENTITLEMENTS.maxClients,
    maxCommunityMembers: typeof raw.maxCommunityMembers === "number" ? raw.maxCommunityMembers : FREE_ENTITLEMENTS.maxCommunityMembers,
    exportEnabled: raw.exportEnabled === true,
    customBranding: raw.customBranding === true,
  };
}

export async function getEntitlements(workspaceId: string, db: Db = prisma): Promise<WorkspaceEntitlements> {
  const subscription = await db.subscription.findFirst({
    where: {
      workspaceId,
      status: { in: [...ENTITLEMENT_ACCESS_STATUSES] },
      plan: { active: true },
      OR: [
        { currentPeriodEnd: null },
        { currentPeriodEnd: { gt: new Date() } },
      ],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (subscription) return parseEntitlementConfig(subscription.plan);

  const freePlan = await db.plan.findUnique({ where: { code: "FREE" } });
  return freePlan ? parseEntitlementConfig(freePlan) : FREE_ENTITLEMENTS;
}
