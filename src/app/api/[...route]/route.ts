import type { NextRequest } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { createSession, hashPassword, prisma, revokeSession, SESSION_DAYS, validateSession, verifyPassword } from "@/lib/prisma";
import { activityActionSchema, adminUserSchema, checkSchema, dailyPlanBlockActionSchema, dailyPlanLockSchema, loginSchema, moduleCreateSchema, moduleUpdateSchema, noteSchema, profileSettingsSchema, registerSchema, settingSchema, startSchema } from "@/lib/validation";
import { findOverlappingBlock, MAX_BLOCKS_PER_DAY } from "@/lib/dailyPlan";
import { buildDefaultPhases } from "@/lib/tracker";

const COOKIE = process.env.SESSION_COOKIE_NAME || "tracker_session";
const globalForAttempts = globalThis as unknown as { attempts?: Map<string, { count: number; reset: number }>; attemptsCleanup?: ReturnType<typeof setInterval> };
const attempts = globalForAttempts.attempts ?? new Map<string, { count: number; reset: number }>();
globalForAttempts.attempts = attempts;
if (!globalForAttempts.attemptsCleanup) {
  globalForAttempts.attemptsCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.reset < now) attempts.delete(key);
  }, 15 * 60_000).unref();
}
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
  title: "Judul Tracker Anda", subtitle: "40 Hari — Fondasi Ketenangan", days: 40,
  activities: [],
  phases: { create: buildDefaultPhases(40) },
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
  if (path === "/api/daily-plan") {
    const dateParam = req.nextUrl.searchParams.get("date");
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return json({ error: "Invalid date" }, 400);
    const plan = await prisma.dailyPlan.findUnique({
      where: { userId_date: { userId: auth.userId, date: new Date(`${dateParam}T00:00:00Z`) } },
      include: { blocks: { orderBy: { startMinute: "asc" } } },
    });
    return json({
      plan: plan ? { id: plan.id, date: dateParam, locked: plan.locked } : null,
      blocks: (plan?.blocks ?? []).map(b => ({ id: b.id, label: b.label, startMinute: b.startMinute, endMinute: b.endMinute })),
    });
  }
  if (path === "/api/daily-plan/history") {
    const plans = await prisma.dailyPlan.findMany({ where: { userId: auth.userId }, orderBy: { date: "desc" }, take: 60, include: { _count: { select: { blocks: true } } } });
    return json(plans.map(p => ({ date: p.date.toISOString().slice(0, 10), locked: p.locked, blockCount: p._count.blocks })));
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
  if (path === "/api/profile") {
    const parsed = profileSettingsSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const user = await prisma.user.findUnique({ where: { id: auth.userId } }); if (!user) return json({ error: "Unauthorized" }, 401);
    const data: { name: string; passwordHash?: string } = { name: parsed.data.name };
    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword || !await verifyPassword(parsed.data.currentPassword, user.passwordHash)) return json({ error: "Current password is incorrect" }, 403);
      data.passwordHash = await hashPassword(parsed.data.newPassword);
    }
    const updated = await prisma.user.update({ where: { id: auth.userId }, data, select: { id: true, name: true, email: true, role: true, status: true } });
    return json({ user: updated, success: true });
  }
  if (path === "/api/modules" || path === "/api/trackers") {
    const parsed = moduleCreateSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const { title, subtitle, days, phases } = parsed.data;
    const phaseTemplate = buildDefaultPhases(days).map((phase, idx) => {
      const custom = phases?.[idx];
      return custom ? { ...phase, label: custom.label, description: custom.description, targetPercent: custom.targetPercent } : phase;
    });
    return json(await prisma.module.create({ data: { ownerId: auth.userId, title, subtitle, days, activities: [], phases: { create: phaseTemplate } } }), 201);
  }
  if (path === "/api/modules/activities") {
    const parsed = activityActionSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const action = parsed.data;
    const owned = await ownedModule(action.moduleId, auth.userId); if (!owned) return json({ error: "Forbidden" }, 403);
    if (owned.locksActivities && owned.startDate) return json({ error: "Aktivitas tracker ini sudah terkunci karena project sudah dimulai" }, 403);
    if (action.action === "add") {
      if (owned.activities.filter(Boolean).length >= 10) return json({ error: "Maksimal 10 aktivitas per tracker" }, 409);
      return json(await prisma.module.update({ where: { id: owned.id }, data: { activities: [...owned.activities, action.name] } }));
    }
    if (action.activityIdx >= owned.activities.length) return json({ error: "Out of range" }, 400);
    if (action.action === "update") {
      const activities = [...owned.activities]; activities[action.activityIdx] = action.name;
      return json(await prisma.module.update({ where: { id: owned.id }, data: { activities } }));
    }
    const activities = owned.activities.filter((_, idx) => idx !== action.activityIdx);
    return json(await prisma.$transaction(async tx => {
      await tx.check.deleteMany({ where: { moduleId: owned.id, activityIdx: action.activityIdx } });
      await tx.check.updateMany({ where: { moduleId: owned.id, activityIdx: { gt: action.activityIdx } }, data: { activityIdx: { decrement: 1 } } });
      return tx.module.update({ where: { id: owned.id }, data: { activities } });
    }));
  }
  if (path === "/api/daily-plan/blocks") {
    const parsed = dailyPlanBlockActionSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const action = parsed.data;

    if (action.action === "delete") {
      const block = await prisma.timeBlock.findFirst({ where: { id: action.blockId, plan: { userId: auth.userId } }, include: { plan: true } });
      if (!block) return json({ error: "Forbidden" }, 403);
      if (block.plan.locked) return json({ error: "Rencana harian ini sudah dikunci" }, 403);
      await prisma.timeBlock.delete({ where: { id: block.id } });
      return json({ success: true });
    }

    if (action.endMinute <= action.startMinute) return json({ error: "Waktu selesai harus setelah waktu mulai" }, 400);

    if (action.action === "update") {
      const block = await prisma.timeBlock.findFirst({ where: { id: action.blockId, plan: { userId: auth.userId } }, include: { plan: { include: { blocks: true } } } });
      if (!block) return json({ error: "Forbidden" }, 403);
      if (block.plan.locked) return json({ error: "Rencana harian ini sudah dikunci" }, 403);
      if (findOverlappingBlock(block.plan.blocks, action, block.id)) return json({ error: "Blok waktu bertabrakan dengan blok lain" }, 409);
      return json(await prisma.timeBlock.update({ where: { id: block.id }, data: { label: action.label, startMinute: action.startMinute, endMinute: action.endMinute } }));
    }

    const dateOnly = new Date(`${action.date}T00:00:00Z`);
    const plan = await prisma.dailyPlan.upsert({
      where: { userId_date: { userId: auth.userId, date: dateOnly } },
      update: {},
      create: { userId: auth.userId, date: dateOnly },
      include: { blocks: true },
    });
    if (plan.locked) return json({ error: "Rencana harian ini sudah dikunci" }, 403);
    if (plan.blocks.length >= MAX_BLOCKS_PER_DAY) return json({ error: `Maksimal ${MAX_BLOCKS_PER_DAY} blok waktu per hari` }, 409);
    if (findOverlappingBlock(plan.blocks, action)) return json({ error: "Blok waktu bertabrakan dengan blok lain" }, 409);

    return json(await prisma.timeBlock.create({ data: { planId: plan.id, label: action.label, startMinute: action.startMinute, endMinute: action.endMinute } }), 201);
  }
  if (path === "/api/daily-plan/lock") {
    const parsed = dailyPlanLockSchema.safeParse(body); if (!parsed.success) return json({ error: "Validation failed" }, 400);
    const dateOnly = new Date(`${parsed.data.date}T00:00:00Z`);
    const plan = await prisma.dailyPlan.upsert({
      where: { userId_date: { userId: auth.userId, date: dateOnly } },
      update: { locked: parsed.data.locked },
      create: { userId: auth.userId, date: dateOnly, locked: parsed.data.locked },
    });
    return json({ date: parsed.data.date, locked: plan.locked });
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
  const owned = await ownedModule(parsed.data.moduleId, auth.userId); if (!owned) return json({ error: "Forbidden" }, 403);
  const { moduleId, ...data } = parsed.data;
  if (data.activities) {
    if (owned.locksActivities && owned.startDate) return json({ error: "Aktivitas tracker ini sudah terkunci karena project sudah dimulai" }, 403);
  }
  return json(await prisma.module.update({ where: { id: moduleId }, data }));
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  const auth = await actor(req); if (!auth) return json({ error: "Unauthorized" }, 401);
  const moduleId = req.nextUrl.searchParams.get("moduleId"); if (!moduleId || !await ownedModule(moduleId, auth.userId)) return json({ error: "Forbidden" }, 403);
  await prisma.module.delete({ where: { id: moduleId } }); return json({ success: true });
}
