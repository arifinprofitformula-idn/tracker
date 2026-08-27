import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { seedPlans } from "./plans";
import { ensurePersonalWorkspace } from "./workspace";
import {
  acceptCoachInvite,
  addCoachIntervention,
  createCoachInvite,
  ensureCoachWorkspace,
  getCoachClientDetail,
  revokeOwnCoachConsent,
  revokeCoachClientLink,
} from "./coach";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emails = {
  coach: `coach-${suffix}@test.local`,
  client: `client-${suffix}@test.local`,
  outsider: `outsider-${suffix}@test.local`,
};
let coachId = "", clientId = "", outsiderId = "", workspaceId = "", linkId = "", token = "";

describe("Coach Mode consent and isolation", () => {
  beforeAll(async () => {
    await seedPlans();
    const [coach, client, outsider] = await Promise.all(Object.entries(emails).map(([key, email]) => prisma.user.create({ data: { email, name: key, passwordHash: "test" } })));
    coachId = coach.id; clientId = client.id; outsiderId = outsider.id;
    await Promise.all([ensurePersonalWorkspace(coach), ensurePersonalWorkspace(client), ensurePersonalWorkspace(outsider)]);
    const workspace = await ensureCoachWorkspace(coachId, "QA Coach Workspace");
    workspaceId = workspace.id;
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "COACH_PRO" } });
    await prisma.subscription.create({ data: { workspaceId, planId: plan.id, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 86400000) } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  });

  it("creates one hashed invite under Coach Pro entitlement", async () => {
    const invite = await createCoachInvite({ workspaceId, actorUserId: coachId, clientEmail: emails.client });
    token = invite.token; linkId = invite.link.id;
    expect(invite.link.tokenHash).not.toBe(token);
    expect(await prisma.coachClientLink.count({ where: { workspaceId, clientEmail: emails.client, status: "PENDING" } })).toBe(1);
    await expect(createCoachInvite({ workspaceId, actorUserId: coachId, clientEmail: emails.client })).rejects.toThrow("COACH_LINK_EXISTS");
  });

  it("requires matching authenticated email and explicit consent", async () => {
    await expect(acceptCoachInvite({ token, clientUserId: outsiderId, consent: true, consentVersion: "v1" })).rejects.toThrow("INVITE_EMAIL_MISMATCH");
    await expect(acceptCoachInvite({ token, clientUserId: clientId, consent: false, consentVersion: "v1" })).rejects.toThrow("CONSENT_REQUIRED");
    const accepted = await acceptCoachInvite({ token, clientUserId: clientId, consent: true, consentVersion: "v1" });
    expect(accepted).toMatchObject({ status: "ACTIVE", clientUserId: clientId, consentVersion: "v1" });
    await expect(acceptCoachInvite({ token, clientUserId: clientId, consent: true, consentVersion: "v1" })).rejects.toThrow("INVITE_NOT_PENDING");
  });

  it("scopes private interventions to authorized coach workspace", async () => {
    await expect(getCoachClientDetail({ workspaceId, linkId, actorUserId: outsiderId, rangeDays: 7 })).rejects.toThrow("COACH_FORBIDDEN");
    const intervention = await addCoachIntervention({ workspaceId, linkId, actorUserId: coachId, type: "PRIVATE_NOTE", content: "Private follow-up" });
    expect(intervention.content).toBe("Private follow-up");
    const detail = await getCoachClientDetail({ workspaceId, linkId, actorUserId: coachId, rangeDays: 7 });
    expect(detail.interventions).toHaveLength(1);
    expect(detail.client.email).toBe(emails.client);
  });

  it("allows client to revoke own consent without coach membership", async () => {
    const ownInvite = await createCoachInvite({ workspaceId, actorUserId: coachId, clientEmail: emails.outsider });
    const accepted = await acceptCoachInvite({ token: ownInvite.token, clientUserId: outsiderId, consent: true, consentVersion: "v1" });
    const revoked = await revokeOwnCoachConsent({ linkId: accepted.id, clientUserId: outsiderId });
    expect(revoked).toMatchObject({ status: "REVOKED", clientUserId: outsiderId });
    await expect(revokeOwnCoachConsent({ linkId, clientUserId: outsiderId })).rejects.toThrow("COACH_LINK_NOT_ACTIVE");
  });

  it("revocation immediately blocks client detail", async () => {
    await revokeCoachClientLink({ workspaceId, linkId, actorUserId: coachId });
    await expect(getCoachClientDetail({ workspaceId, linkId, actorUserId: coachId, rangeDays: 7 })).rejects.toThrow("COACH_LINK_NOT_ACTIVE");
  });
});
