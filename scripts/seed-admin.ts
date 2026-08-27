import { prisma, hashPassword } from "../src/lib/prisma";
import { ensureOwnerProgramEnrollment } from "../src/lib/programEnrollment";
import { buildDefaultPhases } from "../src/lib/tracker";
import { ensurePersonalWorkspace } from "../src/lib/workspace";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) throw new Error("ADMIN_EMAIL and strong ADMIN_PASSWORD required");
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "ACTIVE", passwordHash },
    create: { email, name: "Coach Arifin", passwordHash, role: "ADMIN", status: "ACTIVE" }
  });
  const workspace = await ensurePersonalWorkspace(user);
  await prisma.featureSetting.upsert({
    where: { key: "registration.enabled" },
    update: {},
    create: { key: "registration.enabled", value: "true" }
  });
  const count = await prisma.module.count({ where: { ownerId: user.id } });
  if (!count) {
    const createdModule = await prisma.module.create({ data: {
      ownerId: user.id,
      workspaceId: workspace.id,
      title: "Judul Tracker Anda",
      subtitle: "40 Hari — Fondasi Ketenangan",
      days: 40,
      activities: [],
      phases: { create: buildDefaultPhases(40) }
    }});
    await ensureOwnerProgramEnrollment(createdModule);
  } else {
    const modules = await prisma.module.findMany({
      where: { ownerId: user.id },
      select: { id: true, ownerId: true, workspaceId: true, startDate: true, createdAt: true },
    });
    for (const trackerModule of modules) await ensureOwnerProgramEnrollment(trackerModule);
  }
  console.log(`admin_ready=${user.id}`);
}
main().finally(() => prisma.$disconnect());
