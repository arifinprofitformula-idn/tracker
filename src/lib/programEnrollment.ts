import { Prisma, ProgramEnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export function ownerEnrollmentId(moduleId: string): string {
  return `pe_owner_${moduleId}`;
}

export async function ensureOwnerProgramEnrollment(
  module: { id: string; workspaceId: string; ownerId: string; startDate?: Date | null; createdAt?: Date },
  db: Db = prisma,
) {
  return db.programEnrollment.upsert({
    where: { moduleId_userId: { moduleId: module.id, userId: module.ownerId } },
    update: {},
    create: {
      id: ownerEnrollmentId(module.id),
      workspaceId: module.workspaceId,
      moduleId: module.id,
      userId: module.ownerId,
      status: ProgramEnrollmentStatus.ACTIVE,
      startedAt: module.startDate ?? module.createdAt ?? new Date(),
    },
  });
}

export async function userHasActiveProgramEnrollment(
  moduleId: string,
  userId: string,
  db: Db = prisma,
): Promise<boolean> {
  const enrollment = await db.programEnrollment.findFirst({
    where: {
      moduleId,
      userId,
      status: ProgramEnrollmentStatus.ACTIVE,
    },
    select: { id: true },
  });

  return !!enrollment;
}
