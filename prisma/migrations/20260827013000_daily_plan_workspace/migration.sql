-- Attach DailyPlan to Workspace while keeping plans personal-private by userId.
ALTER TABLE "DailyPlan" ADD COLUMN "workspaceId" TEXT;

UPDATE "DailyPlan"
SET "workspaceId" = 'ws_personal_' || "userId"
WHERE "workspaceId" IS NULL;

ALTER TABLE "DailyPlan" ALTER COLUMN "workspaceId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "DailyPlan_workspaceId_date_idx" ON "DailyPlan"("workspaceId", "date");

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
