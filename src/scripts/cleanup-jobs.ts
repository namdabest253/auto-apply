/**
 * CLI script to delete non-CS job listings from the database.
 *
 * Usage:
 *   npx tsx src/scripts/cleanup-jobs.ts                  # dry-run (default)
 *   npx tsx src/scripts/cleanup-jobs.ts --delete         # actually delete
 *   npx tsx src/scripts/cleanup-jobs.ts --ids id1,id2    # delete specific IDs
 *
 * Prints removed jobs so the caller can see what was cleaned up.
 */

import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const doDelete = args.includes("--delete");
  const idsIdx = args.indexOf("--ids");

  if (idsIdx !== -1 && args[idsIdx + 1]) {
    // Delete specific IDs
    const ids = args[idsIdx + 1].split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      console.log("No IDs provided.");
      process.exit(0);
    }

    const jobs = await prisma.jobListing.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, company: true },
    });

    if (jobs.length === 0) {
      console.log("No matching jobs found.");
      process.exit(0);
    }

    for (const j of jobs) {
      console.log(`DELETE: "${j.title}" at ${j.company} (${j.id})`);
    }

    if (doDelete) {
      const result = await prisma.jobListing.deleteMany({
        where: { id: { in: ids } },
      });
      console.log(`\nDeleted ${result.count} jobs.`);
    } else {
      console.log(`\nDry run: would delete ${jobs.length} jobs. Pass --delete to confirm.`);
    }
    process.exit(0);
  }

  // List all jobs for review
  const jobs = await prisma.jobListing.findMany({
    select: { id: true, title: true, company: true, platform: true },
    orderBy: { title: "asc" },
  });

  console.log(JSON.stringify(jobs));
  console.log(`\nTotal: ${jobs.length} jobs in database.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
