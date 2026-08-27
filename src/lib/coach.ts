import { CoachClientLinkStatus, CoachInterventionType, Prisma, WorkspaceRole, WorkspaceType } from "@prisma/client";
import { prisma } from "./prisma";
import { createCoachInviteToken, hashCoachInviteToken, isCoachInviteExpired } from "./coachInvite";
import { getEntitlements } from "./entitlements";
import { calculateCoachRisk } from "./coachRisk";

const coachWriteRoles = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.COACH] as const;
type Db = typeof prisma | Prisma.TransactionClient;

async function assertCoachAccess(workspaceId: string, actorUserId: string, db: Db = prisma) {
  const membership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: actorUserId, role: { in: [...coachWriteRoles] }, workspace: { type: WorkspaceType.COACH } },
  });
  if (!membership) throw new Error("COACH_FORBIDDEN");
  return membership;
}

export async function ensureCoachWorkspace(ownerUserId: string, name: string) {
  const existing = await prisma.workspace.findFirst({ where: { ownerId: ownerUserId, type: WorkspaceType.COACH }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { ownerId: ownerUserId, name: name.trim(), type: WorkspaceType.COACH } });
    await tx.workspaceMember.create({ data: { workspaceId: workspace.id, userId: ownerUserId, role: WorkspaceRole.OWNER } });
    return workspace;
  });
}

export async function getCoachWorkspaceSummary(actorUserId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: actorUserId, role: { in: [...coachWriteRoles] }, workspace: { type: WorkspaceType.COACH } },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;
  const entitlements = await getEntitlements(membership.workspaceId);
  const clientCount = await prisma.coachClientLink.count({ where: { workspaceId: membership.workspaceId, status: { in: [CoachClientLinkStatus.PENDING, CoachClientLinkStatus.ACTIVE] } } });
  return { workspace: membership.workspace, role: membership.role, entitlements, clientCount };
}

export async function listCoachClients(input: { workspaceId: string; actorUserId: string; rangeDays: 7 | 30 }) {
  await assertCoachAccess(input.workspaceId, input.actorUserId);
  const links = await prisma.coachClientLink.findMany({
    where: { workspaceId: input.workspaceId, status: { in: [CoachClientLinkStatus.PENDING, CoachClientLinkStatus.ACTIVE] } },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const clients = [];
  for (const link of links) {
    if (link.status !== CoachClientLinkStatus.ACTIVE || !link.clientUserId || !link.consentedAt) {
      clients.push({ id: link.id, status: link.status, client: link.client ?? { id: null, name: link.clientEmail, email: link.clientEmail }, expiresAt: link.expiresAt, risk: null, metrics: null });
      continue;
    }
    const detail = await getCoachClientDetail({ workspaceId: input.workspaceId, linkId: link.id, actorUserId: input.actorUserId, rangeDays: input.rangeDays });
    clients.push({ id: link.id, status: link.status, client: detail.client, expiresAt: link.expiresAt, risk: detail.risk, metrics: detail.metrics });
  }
  return clients.sort((a, b) => (b.risk?.score ?? -1) - (a.risk?.score ?? -1) || a.client.name.localeCompare(b.client.name));
}

export async function createCoachInvite(input: { workspaceId: string; actorUserId: string; clientEmail: string }) {
  await assertCoachAccess(input.workspaceId, input.actorUserId);
  const clientEmail = input.clientEmail.trim().toLowerCase();
  const entitlements = await getEntitlements(input.workspaceId);
  if (entitlements.maxClients === 0) throw new Error("COACH_PLAN_REQUIRED");
  const existing = await prisma.coachClientLink.findFirst({
    where: { workspaceId: input.workspaceId, clientEmail, status: { in: [CoachClientLinkStatus.PENDING, CoachClientLinkStatus.ACTIVE] } },
  });
  if (existing) throw new Error("COACH_LINK_EXISTS");
  const current = await prisma.coachClientLink.count({ where: { workspaceId: input.workspaceId, status: { in: [CoachClientLinkStatus.PENDING, CoachClientLinkStatus.ACTIVE] } } });
  if (entitlements.maxClients !== -1 && current >= entitlements.maxClients) throw new Error("CLIENT_LIMIT_REACHED");
  const invite = createCoachInviteToken();
  const link = await prisma.coachClientLink.create({
    data: { workspaceId: input.workspaceId, coachUserId: input.actorUserId, clientEmail, tokenHash: invite.tokenHash, expiresAt: invite.expiresAt },
  });
  return { token: invite.token, link };
}

export async function previewCoachInvite(token: string) {
  const link = await prisma.coachClientLink.findUnique({
    where: { tokenHash: hashCoachInviteToken(token) },
    include: { workspace: { select: { id: true, name: true } }, coach: { select: { name: true } } },
  });
  if (!link) throw new Error("INVITE_NOT_FOUND");
  if (link.status !== CoachClientLinkStatus.PENDING) throw new Error("INVITE_NOT_PENDING");
  if (isCoachInviteExpired(link.expiresAt)) {
    await prisma.coachClientLink.update({ where: { id: link.id }, data: { status: CoachClientLinkStatus.EXPIRED } });
    throw new Error("INVITE_EXPIRED");
  }
  return { workspace: link.workspace, coachName: link.coach.name, clientEmail: link.clientEmail, expiresAt: link.expiresAt };
}

export async function acceptCoachInvite(input: { token: string; clientUserId: string; consent: boolean; consentVersion: string }) {
  if (!input.consent) throw new Error("CONSENT_REQUIRED");
  return prisma.$transaction(async (tx) => {
    const link = await tx.coachClientLink.findUnique({ where: { tokenHash: hashCoachInviteToken(input.token) } });
    if (!link) throw new Error("INVITE_NOT_FOUND");
    if (link.status !== CoachClientLinkStatus.PENDING) throw new Error("INVITE_NOT_PENDING");
    if (isCoachInviteExpired(link.expiresAt)) {
      await tx.coachClientLink.update({ where: { id: link.id }, data: { status: CoachClientLinkStatus.EXPIRED } });
      throw new Error("INVITE_EXPIRED");
    }
    const client = await tx.user.findUnique({ where: { id: input.clientUserId }, select: { email: true } });
    if (!client || client.email.toLowerCase() !== link.clientEmail) throw new Error("INVITE_EMAIL_MISMATCH");
    const duplicate = await tx.coachClientLink.findFirst({ where: { workspaceId: link.workspaceId, clientUserId: input.clientUserId, status: CoachClientLinkStatus.ACTIVE, id: { not: link.id } } });
    if (duplicate) throw new Error("COACH_LINK_EXISTS");
    const now = new Date();
    return tx.coachClientLink.update({ where: { id: link.id }, data: { clientUserId: input.clientUserId, status: CoachClientLinkStatus.ACTIVE, acceptedAt: now, consentedAt: now, consentVersion: input.consentVersion } });
  });
}

export async function getCoachClientDetail(input: { workspaceId: string; linkId: string; actorUserId: string; rangeDays: 7 | 30 }) {
  await assertCoachAccess(input.workspaceId, input.actorUserId);
  const link = await prisma.coachClientLink.findFirst({
    where: { id: input.linkId, workspaceId: input.workspaceId },
    include: { client: { select: { id: true, name: true, email: true } }, interventions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!link || link.status !== CoachClientLinkStatus.ACTIVE || !link.consentedAt || !link.clientUserId || !link.client) throw new Error("COACH_LINK_NOT_ACTIVE");
  const cutoff = new Date(Date.now() - input.rangeDays * 86_400_000);
  const modules = await prisma.module.findMany({
    where: { ownerId: link.clientUserId },
    select: { id: true, title: true, activities: true, checks: { where: { checkedAt: { gte: cutoff } }, select: { checkedAt: true } } },
  });
  const completed = modules.reduce((sum, module) => sum + module.checks.length, 0);
  const expected = modules.reduce((sum, module) => sum + module.activities.filter(Boolean).length * input.rangeDays, 0);
  const completion7d = expected ? Math.round((completed / expected) * 100) : 100;
  const latest = modules.flatMap((module) => module.checks).sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())[0]?.checkedAt;
  const inactivityDays = latest ? Math.floor((Date.now() - latest.getTime()) / 86_400_000) : input.rangeDays;
  return {
    id: link.id,
    client: link.client,
    consentedAt: link.consentedAt,
    programs: modules.map(({ id, title }) => ({ id, title })),
    metrics: { rangeDays: input.rangeDays, completed, expected, completion: completion7d, inactivityDays },
    risk: calculateCoachRisk({ inactivityDays, completion7d, streakBroken: false, priorityTasksMissed: 0 }),
    interventions: link.interventions,
  };
}

export async function addCoachIntervention(input: { workspaceId: string; linkId: string; actorUserId: string; type: CoachInterventionType; content: string }) {
  await assertCoachAccess(input.workspaceId, input.actorUserId);
  const link = await prisma.coachClientLink.findFirst({ where: { id: input.linkId, workspaceId: input.workspaceId, status: CoachClientLinkStatus.ACTIVE, consentedAt: { not: null } } });
  if (!link) throw new Error("COACH_LINK_NOT_ACTIVE");
  return prisma.coachIntervention.create({ data: { workspaceId: input.workspaceId, coachClientLinkId: link.id, authorUserId: input.actorUserId, type: input.type, content: input.content.trim() } });
}

export async function listOwnCoachConsents(clientUserId: string) {
  return prisma.coachClientLink.findMany({
    where: { clientUserId, status: CoachClientLinkStatus.ACTIVE, consentedAt: { not: null } },
    select: { id: true, consentedAt: true, consentVersion: true, workspace: { select: { name: true } }, coach: { select: { name: true, email: true } } },
    orderBy: { consentedAt: "desc" },
  });
}

export async function revokeOwnCoachConsent(input: { linkId: string; clientUserId: string }) {
  const link = await prisma.coachClientLink.findFirst({ where: { id: input.linkId, clientUserId: input.clientUserId, status: CoachClientLinkStatus.ACTIVE, consentedAt: { not: null } } });
  if (!link) throw new Error("COACH_LINK_NOT_ACTIVE");
  return prisma.coachClientLink.update({ where: { id: link.id }, data: { status: CoachClientLinkStatus.REVOKED, revokedAt: new Date() } });
}

export async function revokeCoachClientLink(input: { workspaceId: string; linkId: string; actorUserId: string }) {
  await assertCoachAccess(input.workspaceId, input.actorUserId);
  const link = await prisma.coachClientLink.findFirst({ where: { id: input.linkId, workspaceId: input.workspaceId, status: CoachClientLinkStatus.ACTIVE } });
  if (!link) throw new Error("COACH_LINK_NOT_ACTIVE");
  return prisma.coachClientLink.update({ where: { id: link.id }, data: { status: CoachClientLinkStatus.REVOKED, revokedAt: new Date() } });
}
