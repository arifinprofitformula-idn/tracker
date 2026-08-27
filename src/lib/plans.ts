import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PlanCode, WorkspaceEntitlements } from "@/lib/entitlements";

type Db = typeof prisma | Prisma.TransactionClient;

type PlanSeed = {
  id: string;
  code: PlanCode;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  entitlementConfig: Omit<WorkspaceEntitlements, "plan">;
};

export const PLAN_SEEDS: PlanSeed[] = [
  {
    id: "plan_free",
    code: "FREE",
    name: "Free",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    currency: "IDR",
    entitlementConfig: {
      maxActivePrograms: 1,
      historyDays: 60,
      advancedAnalytics: false,
      aiWeeklyInsights: false,
      maxAccountabilityPartners: 0,
      maxClients: 0,
      maxCommunityMembers: 0,
      exportEnabled: false,
      customBranding: false,
    },
  },
  {
    id: "plan_personal_pro",
    code: "PERSONAL_PRO",
    name: "Personal Pro",
    monthlyPriceCents: 3900000,
    yearlyPriceCents: 34900000,
    currency: "IDR",
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
  },
  {
    id: "plan_coach_pro",
    code: "COACH_PRO",
    name: "Coach Pro",
    monthlyPriceCents: 19900000,
    yearlyPriceCents: 179000000,
    currency: "IDR",
    entitlementConfig: {
      maxActivePrograms: -1,
      historyDays: -1,
      advancedAnalytics: true,
      aiWeeklyInsights: true,
      maxAccountabilityPartners: 10,
      maxClients: 50,
      maxCommunityMembers: 0,
      exportEnabled: true,
      customBranding: false,
    },
  },
  {
    id: "plan_community",
    code: "COMMUNITY",
    name: "Community",
    monthlyPriceCents: 59900000,
    yearlyPriceCents: 539000000,
    currency: "IDR",
    entitlementConfig: {
      maxActivePrograms: -1,
      historyDays: -1,
      advancedAnalytics: true,
      aiWeeklyInsights: true,
      maxAccountabilityPartners: 20,
      maxClients: 0,
      maxCommunityMembers: 500,
      exportEnabled: true,
      customBranding: true,
    },
  },
  {
    id: "plan_business",
    code: "BUSINESS",
    name: "Business",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    currency: "IDR",
    entitlementConfig: {
      maxActivePrograms: -1,
      historyDays: -1,
      advancedAnalytics: true,
      aiWeeklyInsights: true,
      maxAccountabilityPartners: -1,
      maxClients: -1,
      maxCommunityMembers: -1,
      exportEnabled: true,
      customBranding: true,
    },
  },
];

export async function seedPlans(db: Db = prisma) {
  const plans = [];
  for (const plan of PLAN_SEEDS) {
    plans.push(await db.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        currency: plan.currency,
        entitlementConfig: plan.entitlementConfig,
        active: true,
      },
      create: {
        ...plan,
        entitlementConfig: plan.entitlementConfig,
      },
    }));
  }
  return plans;
}
