/**
 * Marks a ScrapeRun as completed or failed.
 *
 * Usage:
 *   npx tsx src/scripts/complete-run.ts <runId> [--failed "error message"]
 */

import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error("Usage: npx tsx src/scripts/complete-run.ts <runId> [--failed 'error']");
    process.exit(1);
  }

  const failedIdx = process.argv.indexOf("--failed");
  const isFailed = failedIdx !== -1;
  const errorMsg = isFailed ? process.argv[failedIdx + 1] || "Unknown error" : null;

  const run = await prisma.scrapeRun.findUnique({ where: { id: runId } });
  if (!run) {
    console.error(`ScrapeRun ${runId} not found`);
    process.exit(1);
  }

  const duration = Math.round((Date.now() - run.startedAt.getTime()) / 1000);
  const totalJobs = await prisma.jobListing.count({ where: { scrapeRunId: runId } });

  await prisma.scrapeRun.update({
    where: { id: runId },
    data: {
      status: isFailed ? "failed" : totalJobs > 0 ? "completed" : "completed_with_errors",
      jobsFound: totalJobs,
      completedAt: new Date(),
      duration,
      errors: isFailed ? { fatal: errorMsg } : undefined,
    },
  });

  console.log(
    isFailed
      ? `Run ${runId} marked as failed: ${errorMsg}`
      : `Run ${runId} completed with ${totalJobs} jobs in ${duration}s`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
