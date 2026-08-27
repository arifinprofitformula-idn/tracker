import { prisma } from "../src/lib/prisma";
import { ensureOwnerProgramEnrollment } from "../src/lib/programEnrollment";

async function main() {
  const modules = await prisma.module.findMany({
    select: {
      id: true,
      ownerId: true,
      workspaceId: true,
      startDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let ready = 0;
  for (const trackerModule of modules) {
    await ensureOwnerProgramEnrollment(trackerModule);
    ready++;
  }

  console.log(`program_enrollments_ready=${ready}`);
}

main().finally(() => prisma.$disconnect());
