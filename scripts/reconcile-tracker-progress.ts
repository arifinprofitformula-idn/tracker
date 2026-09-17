import { prisma } from "../src/lib/prisma";
import { reconcileMissedDailyProgress } from "../src/lib/trackerLifecycle";

async function main() {
  const users = await prisma.dailyProgress.findMany({
    where: { status: "PENDING" },
    distinct: ["userId"],
    select: { userId: true },
  });
  let changed = 0;
  for (const user of users) changed += await reconcileMissedDailyProgress(user.userId);
  console.log(`tracker_progress_reconciled=${changed}`);
}

main().finally(() => prisma.$disconnect());
