import { Prisma, WorkspaceRole, WorkspaceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export const PERSONAL_WORKSPACE_PREFIX = "ws_personal_";

export const workspaceReadRoles = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.COACH,
  WorkspaceRole.MEMBER,
  WorkspaceRole.VIEWER,
] as const;

export const workspaceWriteRoles = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.COACH,
] as const;

export function personalWorkspaceId(userId: string): string {
  return `${PERSONAL_WORKSPACE_PREFIX}${userId}`;
}

export function canReadWorkspace(role: WorkspaceRole): boolean {
  return workspaceReadRoles.includes(role);
}

export function canWriteWorkspace(role: WorkspaceRole): boolean {
  return (workspaceWriteRoles as readonly WorkspaceRole[]).includes(role);
}

export async function ensurePersonalWorkspace(
  user: { id: string; name: string; email: string },
  db: Db = prisma,
) {
  const workspaceId = personalWorkspaceId(user.id);
  const workspace = await db.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: {
      id: workspaceId,
      ownerId: user.id,
      name: `${user.name.trim() || user.email}'s Personal Workspace`,
      type: WorkspaceType.PERSONAL,
    },
  });

  await db.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    update: { role: WorkspaceRole.OWNER },
    create: {
      id: `wsm_owner_${user.id}`,
      workspaceId,
      userId: user.id,
      role: WorkspaceRole.OWNER,
    },
  });

  return workspace;
}

export async function getDefaultWorkspaceIdForUser(userId: string, db: Db = prisma): Promise<string> {
  const membership = await db.workspaceMember.findFirst({
    where: {
      userId,
      workspace: { type: WorkspaceType.PERSONAL, ownerId: userId },
    },
    select: { workspaceId: true },
    orderBy: { createdAt: "asc" },
  });

  return membership?.workspaceId ?? personalWorkspaceId(userId);
}

export async function assertWorkspaceMember(
  userId: string,
  workspaceId: string,
  roles: readonly WorkspaceRole[] = workspaceReadRoles,
  db: Db = prisma,
) {
  const membership = await db.workspaceMember.findFirst({
    where: { userId, workspaceId, role: { in: [...roles] } },
  });

  if (!membership) throw new Error("WORKSPACE_FORBIDDEN");
  return membership;
}

export function accessibleModuleWhere(
  userId: string,
  roles: readonly WorkspaceRole[] = workspaceReadRoles,
): Prisma.ModuleWhereInput {
  return {
    workspace: {
      members: {
        some: {
          userId,
          role: { in: [...roles] },
        },
      },
    },
  };
}

export function accessibleDailyPlanWhere(
  userId: string,
  roles: readonly WorkspaceRole[] = workspaceReadRoles,
): Prisma.DailyPlanWhereInput {
  return {
    userId,
    workspace: {
      members: {
        some: {
          userId,
          role: { in: [...roles] },
        },
      },
    },
  };
}

export async function findAccessibleModule(
  moduleId: string,
  userId: string,
  roles: readonly WorkspaceRole[] = workspaceReadRoles,
  db: Db = prisma,
) {
  return db.module.findFirst({
    where: {
      id: moduleId,
      ...accessibleModuleWhere(userId, roles),
    },
  });
}
