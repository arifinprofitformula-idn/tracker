import { prisma, hashPassword } from "../src/lib/prisma";
import { buildDefaultPhases } from "../src/lib/tracker";

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
  await prisma.featureSetting.upsert({
    where: { key: "registration.enabled" },
    update: {},
    create: { key: "registration.enabled", value: "true" }
  });
  const count = await prisma.module.count({ where: { ownerId: user.id } });
  if (!count) await prisma.module.create({ data: {
    ownerId: user.id,
    title: "Judul Tracker Anda",
    subtitle: "40 Hari — Fondasi Ketenangan",
    days: 40,
    activities: [],
    phases: { create: buildDefaultPhases(40) }
  }});
  console.log(`admin_ready=${user.id}`);
}
main().finally(() => prisma.$disconnect());
