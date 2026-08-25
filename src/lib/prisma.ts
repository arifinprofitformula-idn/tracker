import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const SESSION_DAYS = 7;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<{ userId: string; role: UserRole; status: UserStatus } | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, role: true, status: true } } },
  });
  if (!session || session.revoked || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  return { userId: session.user.id, role: session.user.role, status: session.user.status };
}

export async function revokeSession(token: string) {
  await prisma.session.updateMany({ where: { tokenHash: hashToken(token) }, data: { revoked: true } });
}
