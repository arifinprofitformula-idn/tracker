import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "./prisma";
import { ensurePersonalWorkspace, findAccessibleModule, workspaceWriteRoles } from "./workspace";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `workspace-owner-${suffix}@test.local`;
const outsiderEmail = `workspace-outsider-${suffix}@test.local`;

let ownerId = "";
let outsiderId = "";
let ownerWorkspaceId = "";
let moduleId = "";

describe("workspace authorization integration", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: "Workspace Owner", passwordHash: "test-hash" },
    });
    const outsider = await prisma.user.create({
      data: { email: outsiderEmail, name: "Workspace Outsider", passwordHash: "test-hash" },
    });
    ownerId = owner.id;
    outsiderId = outsider.id;

    const ownerWorkspace = await ensurePersonalWorkspace(owner);
    await ensurePersonalWorkspace(outsider);
    ownerWorkspaceId = ownerWorkspace.id;

    const mod = await prisma.module.create({
      data: {
        ownerId,
        workspaceId: ownerWorkspaceId,
        title: "Cross Tenant Test Module",
        days: 40,
        activities: [],
      },
    });
    moduleId = mod.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  });

  it("allows the workspace owner to read and write the module", async () => {
    await expect(findAccessibleModule(moduleId, ownerId)).resolves.toMatchObject({ id: moduleId });
    await expect(findAccessibleModule(moduleId, ownerId, workspaceWriteRoles)).resolves.toMatchObject({ id: moduleId });
  });

  it("blocks an unrelated user from reading or writing the module", async () => {
    await expect(findAccessibleModule(moduleId, outsiderId)).resolves.toBeNull();
    await expect(findAccessibleModule(moduleId, outsiderId, workspaceWriteRoles)).resolves.toBeNull();
  });

  it("allows a viewer membership to read but not write workspace content", async () => {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: ownerWorkspaceId, userId: outsiderId } },
      update: { role: WorkspaceRole.VIEWER },
      create: {
        id: `wsm_viewer_${suffix}`,
        workspaceId: ownerWorkspaceId,
        userId: outsiderId,
        role: WorkspaceRole.VIEWER,
      },
    });

    await expect(findAccessibleModule(moduleId, outsiderId)).resolves.toMatchObject({ id: moduleId });
    await expect(findAccessibleModule(moduleId, outsiderId, workspaceWriteRoles)).resolves.toBeNull();
  });
});
