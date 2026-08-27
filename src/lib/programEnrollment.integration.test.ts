import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { ensureOwnerProgramEnrollment, userHasActiveProgramEnrollment } from "./programEnrollment";
import { ensurePersonalWorkspace } from "./workspace";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `program-owner-${suffix}@test.local`;
const outsiderEmail = `program-outsider-${suffix}@test.local`;

let ownerId = "";
let outsiderId = "";
let moduleId = "";

describe("program enrollment integration", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: "Program Owner", passwordHash: "test-hash" },
    });
    const outsider = await prisma.user.create({
      data: { email: outsiderEmail, name: "Program Outsider", passwordHash: "test-hash" },
    });
    ownerId = owner.id;
    outsiderId = outsider.id;

    const workspace = await ensurePersonalWorkspace(owner);
    await ensurePersonalWorkspace(outsider);
    const createdModule = await prisma.module.create({
      data: {
        ownerId,
        workspaceId: workspace.id,
        title: "Enrollment Test Module",
        days: 40,
        activities: [],
      },
    });
    moduleId = createdModule.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  });

  it("creates an active owner enrollment idempotently", async () => {
    const trackerModule = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
    const first = await ensureOwnerProgramEnrollment(trackerModule);
    const second = await ensureOwnerProgramEnrollment(trackerModule);

    expect(second.id).toBe(first.id);
    await expect(userHasActiveProgramEnrollment(moduleId, ownerId)).resolves.toBe(true);
  });

  it("does not treat unrelated users as enrolled", async () => {
    await expect(userHasActiveProgramEnrollment(moduleId, outsiderId)).resolves.toBe(false);
  });
});
