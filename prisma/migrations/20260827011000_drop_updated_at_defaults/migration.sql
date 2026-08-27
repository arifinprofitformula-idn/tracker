-- Align database defaults with Prisma @updatedAt semantics.
ALTER TABLE "TimeBlock" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Workspace" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "WorkspaceMember" ALTER COLUMN "updatedAt" DROP DEFAULT;
