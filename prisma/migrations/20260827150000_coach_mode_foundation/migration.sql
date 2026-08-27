CREATE TYPE "CoachClientLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'REVOKED', 'EXPIRED');
CREATE TYPE "CoachInterventionType" AS ENUM ('PRIVATE_NOTE', 'NUDGE');

CREATE TABLE "CoachClientLink" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "coachUserId" TEXT NOT NULL,
  "clientUserId" TEXT,
  "clientEmail" TEXT NOT NULL,
  "status" "CoachClientLinkStatus" NOT NULL DEFAULT 'PENDING',
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "consentedAt" TIMESTAMP(3),
  "consentVersion" TEXT,
  "declinedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoachClientLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachIntervention" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "coachClientLinkId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "type" "CoachInterventionType" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoachIntervention_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachClientLink_tokenHash_key" ON "CoachClientLink"("tokenHash");
CREATE INDEX "CoachClientLink_workspaceId_status_idx" ON "CoachClientLink"("workspaceId", "status");
CREATE INDEX "CoachClientLink_coachUserId_status_idx" ON "CoachClientLink"("coachUserId", "status");
CREATE INDEX "CoachClientLink_clientUserId_status_idx" ON "CoachClientLink"("clientUserId", "status");
CREATE INDEX "CoachClientLink_clientEmail_status_idx" ON "CoachClientLink"("clientEmail", "status");
CREATE INDEX "CoachClientLink_expiresAt_idx" ON "CoachClientLink"("expiresAt");
CREATE INDEX "CoachIntervention_workspaceId_createdAt_idx" ON "CoachIntervention"("workspaceId", "createdAt");
CREATE INDEX "CoachIntervention_coachClientLinkId_createdAt_idx" ON "CoachIntervention"("coachClientLinkId", "createdAt");
CREATE INDEX "CoachIntervention_authorUserId_createdAt_idx" ON "CoachIntervention"("authorUserId", "createdAt");

ALTER TABLE "CoachClientLink" ADD CONSTRAINT "CoachClientLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachClientLink" ADD CONSTRAINT "CoachClientLink_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachClientLink" ADD CONSTRAINT "CoachClientLink_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CoachIntervention" ADD CONSTRAINT "CoachIntervention_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachIntervention" ADD CONSTRAINT "CoachIntervention_coachClientLinkId_fkey" FOREIGN KEY ("coachClientLinkId") REFERENCES "CoachClientLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachIntervention" ADD CONSTRAINT "CoachIntervention_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
