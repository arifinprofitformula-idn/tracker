import { describe, expect, it } from "vitest";
import { createCoachInviteToken, hashCoachInviteToken, isCoachInviteExpired } from "./coachInvite";

describe("coach invite token", () => {
  it("returns a raw token once and stores only its deterministic hash", () => {
    const invite = createCoachInviteToken(new Date("2026-08-27T00:00:00.000Z"));
    expect(invite.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(invite.tokenHash).toBe(hashCoachInviteToken(invite.token));
    expect(invite.tokenHash).not.toContain(invite.token);
    expect(invite.expiresAt.toISOString()).toBe("2026-09-03T00:00:00.000Z");
  });

  it("treats an invite as expired at its exact expiry boundary", () => {
    const expiry = new Date("2026-09-03T00:00:00.000Z");
    expect(isCoachInviteExpired(expiry, new Date("2026-09-02T23:59:59.999Z"))).toBe(false);
    expect(isCoachInviteExpired(expiry, expiry)).toBe(true);
  });
});
