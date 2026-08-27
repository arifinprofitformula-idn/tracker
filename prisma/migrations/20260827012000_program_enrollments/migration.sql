-- CreateEnum
CREATE TYPE "ProgramEnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "ProgramEnrollment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ProgramEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

-- Backfill one active enrollment for every existing module owner.
INSERT INTO "ProgramEnrollment" (
    "id",
    "workspaceId",
    "moduleId",
    "userId",
    "status",
    "startedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'pe_owner_' || m."id",
    m."workspaceId",
    m."id",
    m."ownerId",
    'ACTIVE',
    COALESCE(m."startDate", m."createdAt"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Module" m
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "ProgramEnrollment_moduleId_userId_key" ON "ProgramEnrollment"("moduleId", "userId");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_workspaceId_status_idx" ON "ProgramEnrollment"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_userId_status_idx" ON "ProgramEnrollment"("userId", "status");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_moduleId_status_idx" ON "ProgramEnrollment"("moduleId", "status");

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
