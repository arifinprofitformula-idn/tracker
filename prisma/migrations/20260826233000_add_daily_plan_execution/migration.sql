-- CreateEnum
CREATE TYPE "TimeBlockStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'RESCHEDULED');

-- AlterTable
ALTER TABLE "TimeBlock"
  ADD COLUMN "status" "TimeBlockStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "rescheduledAt" TIMESTAMP(3),
  ADD COLUMN "rescheduledToBlockId" TEXT,
  ADD COLUMN "rescheduleReason" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "TimeBlock_status_idx" ON "TimeBlock"("status");
