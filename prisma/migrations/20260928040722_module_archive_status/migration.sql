-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ModuleStatus" NOT NULL DEFAULT 'ACTIVE';
