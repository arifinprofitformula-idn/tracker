-- Tracker lifecycle is additive so existing trackers remain readable.
CREATE TYPE "DailyProgressStatus" AS ENUM ('PENDING', 'SUBMITTED', 'MISSED');
CREATE TYPE "DailyProgressAuditSource" AS ENUM ('USER', 'SYSTEM', 'CHECKLIST');

ALTER TABLE "Module" ADD COLUMN "endDate" TIMESTAMP(3);

CREATE TABLE "DailyProgress" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "DailyProgressStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyProgress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyProgress_day_check" CHECK ("day" >= 1),
    CONSTRAINT "DailyProgress_progress_check" CHECK ("progress" >= 0 AND "progress" <= 100)
);

CREATE TABLE "DailyProgressAudit" (
    "id" TEXT NOT NULL,
    "dailyProgressId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "source" "DailyProgressAuditSource" NOT NULL,
    "previousProgress" INTEGER NOT NULL,
    "newProgress" INTEGER NOT NULL,
    "previousStatus" "DailyProgressStatus" NOT NULL,
    "newStatus" "DailyProgressStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyProgressAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrackerTestimonial" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrackerTestimonial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyProgress_moduleId_userId_day_key" ON "DailyProgress"("moduleId", "userId", "day");
CREATE UNIQUE INDEX "DailyProgress_moduleId_userId_date_key" ON "DailyProgress"("moduleId", "userId", "date");
CREATE INDEX "DailyProgress_userId_date_status_idx" ON "DailyProgress"("userId", "date", "status");
CREATE INDEX "DailyProgress_moduleId_status_idx" ON "DailyProgress"("moduleId", "status");
CREATE INDEX "DailyProgressAudit_moduleId_createdAt_idx" ON "DailyProgressAudit"("moduleId", "createdAt");
CREATE INDEX "DailyProgressAudit_dailyProgressId_createdAt_idx" ON "DailyProgressAudit"("dailyProgressId", "createdAt");
CREATE INDEX "DailyProgressAudit_actorUserId_createdAt_idx" ON "DailyProgressAudit"("actorUserId", "createdAt");
CREATE UNIQUE INDEX "TrackerTestimonial_moduleId_userId_key" ON "TrackerTestimonial"("moduleId", "userId");
CREATE INDEX "TrackerTestimonial_userId_createdAt_idx" ON "TrackerTestimonial"("userId", "createdAt");

ALTER TABLE "DailyProgress" ADD CONSTRAINT "DailyProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyProgress" ADD CONSTRAINT "DailyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyProgressAudit" ADD CONSTRAINT "DailyProgressAudit_dailyProgressId_fkey" FOREIGN KEY ("dailyProgressId") REFERENCES "DailyProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyProgressAudit" ADD CONSTRAINT "DailyProgressAudit_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyProgressAudit" ADD CONSTRAINT "DailyProgressAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrackerTestimonial" ADD CONSTRAINT "TrackerTestimonial_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackerTestimonial" ADD CONSTRAINT "TrackerTestimonial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
