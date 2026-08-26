-- DropForeignKey
ALTER TABLE "TimeBlock" DROP CONSTRAINT "TimeBlock_moduleId_fkey";

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "locksActivities" BOOLEAN NOT NULL DEFAULT true;

-- Grandfather existing trackers: only newly-created trackers (inserted after this
-- migration runs) should have their activities locked once a start date is set.
UPDATE "Module" SET "locksActivities" = false;

-- AlterTable
ALTER TABLE "TimeBlock" DROP COLUMN "moduleId";
