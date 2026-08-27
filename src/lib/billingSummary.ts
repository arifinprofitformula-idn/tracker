import { BillingTransactionStatus, Prisma } from "@prisma/client";
import { getEntitlements, parseEntitlementConfig, type PlanCode, type WorkspaceEntitlements } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export type BillingPlanSummary = {
  code: PlanCode;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  active: boolean;
  checkoutable: boolean;
  entitlements: WorkspaceEntitlements;
};

export type BillingUsageSummary = {
  activePrograms: { current: number; limit: number };
  aiWeeklyInsights: { current: number; limit: number };
  historyDays: { current: number | null; limit: number };
};

export type BillingSummary = {
  workspace: { id: string; name: string; type: string };
  currentPlan: { code: PlanCode; name: string; billingCycle: "monthly" | "yearly" | "free" | "custom" };
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string | null;
  } | null;
  entitlements: WorkspaceEntitlements;
  usage: BillingUsageSummary;
  plans: BillingPlanSummary[];
  transactions: BillingTransactionSummary[];
};

export type BillingTransactionSummary = {
  id: string;
  planCode: PlanCode;
  planName: string;
  status: BillingTransactionStatus;
  amountCents: number;
  currency: string;
  provider: string;
  checkoutUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

function isPlanCode(value: string): value is PlanCode {
  return ["FREE", "PERSONAL_PRO", "COACH_PRO", "COMMUNITY", "BUSINESS"].includes(value);
}

function planCode(value: string): PlanCode {
  return isPlanCode(value) ? value : "FREE";
}

function readBillingCycle(metadata: Prisma.JsonValue, planCodeValue: PlanCode): BillingSummary["currentPlan"]["billingCycle"] {
  if (planCodeValue === "FREE") return "free";
  if (planCodeValue === "BUSINESS") return "custom";
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata) && (metadata as Record<string, unknown>).interval === "yearly") {
    return "yearly";
  }
  return "monthly";
}

export async function getBillingUsage(workspaceId: string, entitlements: WorkspaceEntitlements, db: Db = prisma): Promise<BillingUsageSummary> {
  const activePrograms = await db.module.count({ where: { workspaceId } });

  return {
    activePrograms: { current: activePrograms, limit: entitlements.maxActivePrograms },
    // AI usage arrives in Fase E. Keep it explicit and server-owned so the UI can render
    // a stable contract now without inventing client-side entitlement math later.
    aiWeeklyInsights: { current: 0, limit: entitlements.aiWeeklyInsights ? 30 : 0 },
    historyDays: { current: null, limit: entitlements.historyDays },
  };
}

export async function getBillingSummary(workspaceId: string, db: Db = prisma): Promise<BillingSummary> {
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { id: true, name: true, type: true } });
  const subscription = await db.subscription.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { monthlyPriceCents: "asc" } });
  const transactions = await db.billingTransaction.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { plan: true },
  });

  const freePlan = plans.find((plan) => plan.code === "FREE");
  const activePlan = subscription?.plan ?? freePlan;
  const entitlements = await getEntitlements(workspaceId, db);
  const latestPaidOrPending = transactions.find((transaction) => transaction.status === "PAID" || transaction.status === "PENDING");
  const currentPlanCode = planCode(activePlan?.code ?? "FREE");

  return {
    workspace,
    currentPlan: {
      code: currentPlanCode,
      name: activePlan?.name ?? "Free",
      billingCycle: subscription ? readBillingCycle(latestPaidOrPending?.metadata ?? null, currentPlanCode) : "free",
    },
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          provider: subscription.provider,
        }
      : null,
    entitlements,
    usage: await getBillingUsage(workspaceId, entitlements, db),
    plans: plans.map((plan) => ({
      code: planCode(plan.code),
      name: plan.name,
      monthlyPriceCents: plan.monthlyPriceCents,
      yearlyPriceCents: plan.yearlyPriceCents,
      currency: plan.currency,
      active: plan.active,
      checkoutable: plan.active && plan.code !== "FREE" && plan.code !== "BUSINESS",
      entitlements: parseEntitlementConfig(plan),
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      planCode: planCode(transaction.plan.code),
      planName: transaction.plan.name,
      status: transaction.status,
      amountCents: transaction.amountCents,
      currency: transaction.currency,
      provider: transaction.provider,
      checkoutUrl: transaction.checkoutUrl,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    })),
  };
}

export async function getBillingTransactionStatus(workspaceId: string, transactionId: string, db: Db = prisma): Promise<BillingTransactionSummary | null> {
  const transaction = await db.billingTransaction.findFirst({
    where: { id: transactionId, workspaceId },
    include: { plan: true },
  });
  if (!transaction) return null;

  return {
    id: transaction.id,
    planCode: planCode(transaction.plan.code),
    planName: transaction.plan.name,
    status: transaction.status,
    amountCents: transaction.amountCents,
    currency: transaction.currency,
    provider: transaction.provider,
    checkoutUrl: transaction.checkoutUrl,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}
