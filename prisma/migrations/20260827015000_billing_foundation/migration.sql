-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingTransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPriceCents" INTEGER NOT NULL,
    "yearlyPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "entitlementConfig" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTransaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "BillingTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "checkoutUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- Seed plans and entitlement config server-side.
INSERT INTO "Plan" ("id", "code", "name", "monthlyPriceCents", "yearlyPriceCents", "currency", "entitlementConfig", "active", "createdAt", "updatedAt")
VALUES
  ('plan_free', 'FREE', 'Free', 0, 0, 'IDR', '{"maxActivePrograms":1,"historyDays":60,"advancedAnalytics":false,"aiWeeklyInsights":false,"maxAccountabilityPartners":0,"maxClients":0,"maxCommunityMembers":0,"exportEnabled":false,"customBranding":false}'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_personal_pro', 'PERSONAL_PRO', 'Personal Pro', 3900000, 34900000, 'IDR', '{"maxActivePrograms":-1,"historyDays":-1,"advancedAnalytics":true,"aiWeeklyInsights":true,"maxAccountabilityPartners":3,"maxClients":0,"maxCommunityMembers":0,"exportEnabled":true,"customBranding":false}'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_coach_pro', 'COACH_PRO', 'Coach Pro', 19900000, 179000000, 'IDR', '{"maxActivePrograms":-1,"historyDays":-1,"advancedAnalytics":true,"aiWeeklyInsights":true,"maxAccountabilityPartners":10,"maxClients":50,"maxCommunityMembers":0,"exportEnabled":true,"customBranding":false}'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_community', 'COMMUNITY', 'Community', 59900000, 539000000, 'IDR', '{"maxActivePrograms":-1,"historyDays":-1,"advancedAnalytics":true,"aiWeeklyInsights":true,"maxAccountabilityPartners":20,"maxClients":0,"maxCommunityMembers":500,"exportEnabled":true,"customBranding":true}'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_business', 'BUSINESS', 'Business', 0, 0, 'IDR', '{"maxActivePrograms":-1,"historyDays":-1,"advancedAnalytics":true,"aiWeeklyInsights":true,"maxAccountabilityPartners":-1,"maxClients":-1,"maxCommunityMembers":-1,"exportEnabled":true,"customBranding":true}'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Subscription_workspaceId_status_idx" ON "Subscription"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_provider_providerSubscriptionId_idx" ON "Subscription"("provider", "providerSubscriptionId");

-- CreateIndex
CREATE INDEX "BillingTransaction_workspaceId_status_idx" ON "BillingTransaction"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "BillingTransaction_provider_providerReference_idx" ON "BillingTransaction"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_providerEventId_key" ON "WebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_processedAt_idx" ON "WebhookEvent"("provider", "processedAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
