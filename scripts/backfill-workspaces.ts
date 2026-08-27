import { prisma } from "../src/lib/prisma";
import { ensureOwnerProgramEnrollment } from "../src/lib/programEnrollment";
import { ensurePersonalWorkspace } from "../src/lib/workspace";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  let workspaceCount = 0;
  let moduleCount = 0;
  let dailyPlanCount = 0;
  let enrollmentCount = 0;
  for (const user of users) {
    const workspace = await ensurePersonalWorkspace(user);
    workspaceCount++;
    const updated = await prisma.module.updateMany({
      where: { ownerId: user.id, workspaceId: { not: workspace.id } },
      data: { workspaceId: workspace.id },
    });
    moduleCount += updated.count;

    const updatedDailyPlans = await prisma.dailyPlan.updateMany({
      where: { userId: user.id, workspaceId: { not: workspace.id } },
      data: { workspaceId: workspace.id },
    });
    dailyPlanCount += updatedDailyPlans.count;

    const modules = await prisma.module.findMany({
      where: { ownerId: user.id },
      select: { id: true, ownerId: true, workspaceId: true, startDate: true, createdAt: true },
    });
    for (const trackerModule of modules) {
      await ensureOwnerProgramEnrollment(trackerModule);
      enrollmentCount++;
    }
  }

  console.log(`workspaces_ready=${workspaceCount}`);
  console.log(`modules_backfilled=${moduleCount}`);
  console.log(`daily_plans_backfilled=${dailyPlanCount}`);
  console.log(`program_enrollments_ready=${enrollmentCount}`);
}

main().finally(() => prisma.$disconnect());
