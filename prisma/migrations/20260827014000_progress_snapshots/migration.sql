-- Progress snapshots store numeric aggregates only; no notes/private text.
CREATE TABLE "ProgressSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "day" INTEGER,
    "totalActivities" INTEGER NOT NULL,
    "checkedCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL,
    "perfectDays" INTEGER NOT NULL,
    "currentStreak" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressSnapshot_moduleId_userId_date_key" ON "ProgressSnapshot"("moduleId", "userId", "date");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_workspaceId_date_idx" ON "ProgressSnapshot"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_userId_date_idx" ON "ProgressSnapshot"("userId", "date");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_moduleId_date_idx" ON "ProgressSnapshot"("moduleId", "date");

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
