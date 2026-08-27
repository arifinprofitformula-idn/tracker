import { prisma } from "../src/lib/prisma";
import { seedPlans } from "../src/lib/plans";

async function main() {
  const plans = await seedPlans();
  console.log(`plans_ready=${plans.length}`);
}

main().finally(() => prisma.$disconnect());
