import type { NextRequest } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { createSession, hashPassword, prisma, revokeSession, SESSION_DAYS, validateSession, verifyPassword } from "@/lib/prisma";
import { adminUserSchema, checkSchema, loginSchema, moduleCreateSchema, moduleUpdateSchema, noteSchema, registerSchema, settingSchema, startSchema } from "@/lib/validation";

const COOKIE = process.env.SESSION_COOKIE_NAME || "tracker_session";
const attempts = new Map<string, { count: number; reset: number }>();
const json = (data: unknown, status = 200) => Response.json(data, { status });
const route = (req: NextRequest) => req.nextUrl.pathname;

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const expected = process.env.APP_URL;
  return !!expected && origin === expected;
}
function limited(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const now = Date.now(); const key = `${ip}:${route(req)}`; const old = attempts.get(key);
  const item = !old || old.reset < now ? { count: 1, reset: now + 15 * 60_000 } : { ...old, count: old.count + 1 };
  attempts.set(key, item); return item.count > 10;
}
async function actor(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  return token ? validateSession(token) : null;
}
async function ownedModule(moduleId: string, userId: string) {
  return prisma.module.findFirst({ where: { id: moduleId, ownerId: userId } });
}
const defaultModule = {
  title: "Sholat & Tahajjud", subtitle: "40 Hari — Fondasi Ketenangan", days: 40,
  activities: ["Sholat Subuh", "Sholat Dzuhur", "Sholat Ashar", "Sholat Maghrib", "Sholat Isya", "Tahajjud", "Dzikir"],
  phases: { create: [
    { label: "Fase 1 — Fondasi", startDay: 1, endDay: 10, description: "Perbaiki kualitas malam. 5 waktu tepat waktu.", position: 0 },
    { label: "Fase 2 — Ekspansi", startDay: 11, endDay: 25, description: "Masjid bertahap + tahajjud 3x/minggu.", position: 1 },
    { label: "Fase 3 — Konsolidasi", startDay: 26, endDay: 40, description: "Masjid penuh, tahajjud jadi default.", position: 2 },
  ] },
};

export async function GET(req: NextRequest) {
  const path = route(req);
  if (path === "/api/health") { await prisma.$queryRaw`SELECT 1`; return json({ status: "ok" }); }
  const auth = await actor(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  if (path === "/api/auth/session" || path === "/api/me") {
    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
    return json({ user });
  }
  if (path === "/api/modules" || path === "/api/trackers") {
    const modules = await prisma.module.findMany({ where: { ownerId: auth.userId }, include: { checks: true, notes: true, phases: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } });
    return json(modules);
  }
  if (path === "/api/admin/users") {
    if (auth.role !== "ADMIN") return json({ error: "Forbidden" }, 403);
    return json(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, _count: { select: { modules: true } } }, orderBy: { createdAt: "desc" } }));
  }
  if (path === "/api/admin/settings") {
    if (auth.role !== "ADMIN") return json({ error: "Forbidden" }, 403);
    return json(await prisma.featureSetting.findMany({ orderBy: { key: "asc" } }));
  }
  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  const path = route(req); let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (path === "/api/auth/register") {
    if (limited(req)) return json({ error: "Too many attempts" }, 429);
    const registration = await prisma.featureSetting.findUnique({ where: { key: "registration.enabled" } });
    if (registration?.value === "false") return json({ error: "Registration disabled" }, 403);
    const parsed = registerSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } }); if (exists) return json({ error: "Email already registered" }, 409);
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash } });
      await tx.module.create({ data: { ownerId: created.id, ...defaultModule } }); return created;
    });
    const session = await createSession(user.id); const res = json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 201);
    res.headers.append("Set-Cookie", `${COOKIE}=${session.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`); return res;
  }
  if (path === "/api/auth/login") {
    if (limited(req)) return json({ error: "Too many attempts" }, 429);
    const parsed = loginSchema.safeParse(body); if (!parsed.success) return json({ error: "Invalid credentials" }, 401);
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.status !== "ACTIVE" || !await verifyPassword(parsed.data.password, user.passwordHash)) return json({ error: "Invalid credentials" }, 401);
    const session = await createSession(user.id); const res = json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    res.headers.append("Set-Cookie", `${COOKIE}=${session.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`); return res;
  }
  if (path === "/api/auth/logout") {
    const token = req.cookies.get(COOKIE)?.value; if (token) await revokeSession(token);
    const res = json({ success: true }); res.headers.append("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`); return res;
  }
  const auth = await actor(req); if (!auth) return json({ error: "Unauthorized" }, 401);
  if (path === "/api/modules" || path === "/api/trackers") {
    const parsed = moduleCreateSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    return json(await prisma.module.create({ data: { ownerId: auth.userId, ...parsed.data } }), 201);
  }
  if (path === "/api/modules/checks") {
    const parsed = checkSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const owned = await ownedModule(parsed.data.moduleId, auth.userId); if (!owned) return json({ error: "Forbidden" }, 403);
    if (parsed.data.day > owned.days || parsed.data.activityIdx >= owned.activities.length || !owned.activities[parsed.data.activityIdx]) return json({ error: "Out of range" }, 400);
    const key = { moduleId_day_activityIdx: parsed.data }; const existing = await prisma.check.findUnique({ where: key });
    if (existing) await prisma.check.delete({ where: key }); else await prisma.check.create({ data: parsed.data });
    return json({ checked: !existing });
  }
  if (path === "/api/modules/notes") {
    const parsed = noteSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    if (!await ownedModule(parsed.data.moduleId, auth.userId)) return json({ error: "Forbidden" }, 403);
    return json(await prisma.note.upsert({ where: { moduleId_phaseKey: { moduleId: parsed.data.moduleId, phaseKey: parsed.data.phaseKey } }, update: { content: parsed.data.content }, create: parsed.data }));
  }
  if (path === "/api/modules/start-date") {
    const parsed = startSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    if (!await ownedModule(parsed.data.moduleId, auth.userId)) return json({ error: "Forbidden" }, 403);
    return json(await prisma.module.update({ where: { id: parsed.data.moduleId }, data: { startDate: parsed.data.startDate ? new Date(`${parsed.data.startDate}T00:00:00Z`) : null } }));
  }
  if (path === "/api/admin/users") {
    if (auth.role !== "ADMIN") return json({ error: "Forbidden" }, 403);
    const parsed = adminUserSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } }); if (!target) return json({ error: "Not found" }, 404);
    if (target.role === "ADMIN" && (parsed.data.role === "USER" || parsed.data.status === "SUSPENDED")) {
      const count = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } }); if (count <= 1) return json({ error: "Last active admin protected" }, 409);
    }
    await prisma.session.updateMany({ where: { userId: target.id }, data: { revoked: true } });
    return json(await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role as UserRole | undefined, status: parsed.data.status as UserStatus | undefined }, select: { id: true, role: true, status: true } }));
  }
  if (path === "/api/admin/settings") {
    if (auth.role !== "ADMIN") return json({ error: "Forbidden" }, 403);
    const parsed = settingSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    return json(await prisma.featureSetting.upsert({ where: { key: parsed.data.key }, update: { value: parsed.data.value }, create: parsed.data }));
  }
  return json({ error: "Not found" }, 404);
}

export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  const auth = await actor(req); if (!auth) return json({ error: "Unauthorized" }, 401);
  const parsed = moduleUpdateSchema.safeParse(await req.json()); if (!parsed.success) return json({ error: "Validation failed" }, 400);
  if (!await ownedModule(parsed.data.moduleId, auth.userId)) return json({ error: "Forbidden" }, 403);
  const { moduleId, ...data } = parsed.data; return json(await prisma.module.update({ where: { id: moduleId }, data }));
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  const auth = await actor(req); if (!auth) return json({ error: "Unauthorized" }, 401);
  const moduleId = req.nextUrl.searchParams.get("moduleId"); if (!moduleId || !await ownedModule(moduleId, auth.userId)) return json({ error: "Forbidden" }, 403);
  await prisma.module.delete({ where: { id: moduleId } }); return json({ success: true });
}
