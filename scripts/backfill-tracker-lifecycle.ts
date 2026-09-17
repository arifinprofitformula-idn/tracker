import { DailyProgressStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { dateOnlyUtc, endDateForDuration, isoDateInTimeZone, progressFromChecklist } from "../src/lib/trackerLifecycle";

async function main() {
  const today = dateOnlyUtc(isoDateInTimeZone());
  const modules = await prisma.module.findMany({ include: { checks: true } });
  let trackerCount = 0;
  let progressCount = 0;

  for (const tracker of modules) {
    const startDate = dateOnlyUtc(tracker.startDate ?? today);
    const endDate = endDateForDuration(startDate, tracker.days);
    await prisma.module.update({ where: { id: tracker.id }, data: { startDate, endDate } });

    const rows = Array.from({ length: tracker.days }, (_, index) => {
      const day = index + 1;
      const date = new Date(startDate.getTime() + index * 86_400_000);
      const dayChecks = tracker.checks.filter((check) => check.day === day).map((check) => check.activityIdx);
      const submitted = dayChecks.length > 0;
      return {
        moduleId: tracker.id,
        userId: tracker.ownerId,
        day,
        date,
        progress: submitted ? progressFromChecklist(tracker.activities, dayChecks) : 0,
        status: submitted ? DailyProgressStatus.SUBMITTED : date < today ? DailyProgressStatus.MISSED : DailyProgressStatus.PENDING,
        submittedAt: submitted ? tracker.checks.find((check) => check.day === day)?.checkedAt ?? null : null,
      };
    });
    const result = await prisma.dailyProgress.createMany({ data: rows, skipDuplicates: true });
    trackerCount++;
    progressCount += result.count;
  }

  console.log(`tracker_lifecycle_backfill trackers=${trackerCount} progress_rows=${progressCount}`);
}

main().finally(() => prisma.$disconnect());
