import { describe, expect, it } from "vitest";
import { WorkspaceRole } from "@prisma/client";
import { canReadWorkspace, canWriteWorkspace, personalWorkspaceId, workspaceReadRoles, workspaceWriteRoles } from "./workspace";

describe("workspace helpers", () => {
  it("builds deterministic personal workspace ids for backfill safety", () => {
    expect(personalWorkspaceId("user_123")).toBe("ws_personal_user_123");
  });

  it("allows every member role to read workspace data", () => {
    expect(workspaceReadRoles).toEqual([
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.COACH,
      WorkspaceRole.MEMBER,
      WorkspaceRole.VIEWER,
    ]);
    expect(canReadWorkspace(WorkspaceRole.VIEWER)).toBe(true);
  });

  it("limits workspace content writes to elevated roles", () => {
    expect(workspaceWriteRoles).toEqual([WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.COACH]);
    expect(canWriteWorkspace(WorkspaceRole.OWNER)).toBe(true);
    expect(canWriteWorkspace(WorkspaceRole.MEMBER)).toBe(false);
    expect(canWriteWorkspace(WorkspaceRole.VIEWER)).toBe(false);
  });
});
