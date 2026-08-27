import { createHash, randomBytes } from "node:crypto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashCoachInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createCoachInviteToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashCoachInviteToken(token),
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
  };
}

export function isCoachInviteExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
