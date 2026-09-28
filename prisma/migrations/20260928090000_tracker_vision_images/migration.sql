-- Vision-board metadata stays in PostgreSQL while image bytes live in private,
-- self-hosted storage. This migration is additive and keeps existing trackers intact.
CREATE TABLE "TrackerVisionImage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackerVisionImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrackerVisionImage_sizeBytes_check" CHECK ("sizeBytes" > 0),
    CONSTRAINT "TrackerVisionImage_dimensions_check" CHECK ("width" > 0 AND "height" > 0)
);

CREATE UNIQUE INDEX "TrackerVisionImage_storageKey_key" ON "TrackerVisionImage"("storageKey");
CREATE INDEX "TrackerVisionImage_workspaceId_userId_idx" ON "TrackerVisionImage"("workspaceId", "userId");
CREATE INDEX "TrackerVisionImage_moduleId_userId_position_idx" ON "TrackerVisionImage"("moduleId", "userId", "position");

ALTER TABLE "TrackerVisionImage" ADD CONSTRAINT "TrackerVisionImage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackerVisionImage" ADD CONSTRAINT "TrackerVisionImage_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackerVisionImage" ADD CONSTRAINT "TrackerVisionImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
