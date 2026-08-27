import { prisma } from "../src/lib/prisma";
import { upsertProgressSnapshotForModule } from "../src/lib/progressSnapshot";

async function main() {
  const modules = await prisma.module.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let ready = 0;
  for (const trackerModule of modules) {
    await upsertProgressSnapshotForModule(trackerModule.id);
    ready++;
  }

  console.log(`progress_snapshots_ready=${ready}`);
}

main().finally(() => prisma.$disconnect());
