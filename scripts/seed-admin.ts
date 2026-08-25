import { prisma, hashPassword } from "../src/lib/prisma";

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
    title: "Sholat & Tahajjud",
    subtitle: "40 Hari — Fondasi Ketenangan",
    days: 40,
    activities: ["Sholat Subuh","Sholat Dzuhur","Sholat Ashar","Sholat Maghrib","Sholat Isya","Tahajjud","Dzikir"],
    phases: { create: [
      { label: "Fase 1 — Fondasi", startDay: 1, endDay: 10, description: "Perbaiki kualitas malam. 5 waktu tepat waktu.", position: 0 },
      { label: "Fase 2 — Ekspansi", startDay: 11, endDay: 25, description: "Masjid bertahap + tahajjud 3x/minggu.", position: 1 },
      { label: "Fase 3 — Konsolidasi", startDay: 26, endDay: 40, description: "Masjid penuh, tahajjud jadi default.", position: 2 }
    ] }
  }});
  console.log(`admin_ready=${user.id}`);
}
main().finally(() => prisma.$disconnect());
