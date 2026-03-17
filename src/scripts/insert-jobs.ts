/**
 * CLI script to insert discovered jobs into the database.
 *
 * Usage:
 *   npx tsx src/scripts/insert-jobs.ts '<JSON array of jobs>'
 *   npx tsx src/scripts/insert-jobs.ts --run-id <scrapeRunId> '<JSON array of jobs>'
 *
 * When --run-id is provided, jobs are linked to that ScrapeRun and
 * the run's jobsFound count is updated after insertion.
 *
 * Each job object should have:
 *   - externalUrl (string, required)
 *   - platform (string, defaults to "ai-discovery")
 *   - title (string, required)
 *   - company (string, required)
 *   - location (string | null)
 *   - datePosted (ISO string | null)
 *   - descriptionText (string | null)
 *   - salary (string | null)
 *
 * Automatically deduplicates against existing jobs in the DB.
 * Uses the first user in the database (single-user app).
 */

import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface JobInput {
  externalUrl: string;
  platform?: string;
  title: string;
  company: string;
  location?: string | null;
  datePosted?: string | null;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  salary?: string | null;
  metadata?: Record<string, unknown>;
}

function parseArgs(): { runId: string | null; jsonArg: string | null } {
  const args = process.argv.slice(2);
  let runId: string | null = null;
  let jsonArg: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--run-id" && args[i + 1]) {
      runId = args[++i];
    } else {
      jsonArg = args[i];
    }
  }

  return { runId, jsonArg };
}

async function main() {
  const { runId, jsonArg } = parseArgs();

  if (!jsonArg) {
    console.error("Usage: npx tsx src/scripts/insert-jobs.ts [--run-id <id>] '<JSON array>'");
    process.exit(1);
  }

  let jobs: JobInput[];
  try {
    jobs = JSON.parse(jsonArg);
  } catch {
    console.error("Invalid JSON input");
    process.exit(1);
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("No jobs to insert.");
    process.exit(0);
  }

  // Get first user (single-user app)
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in database. Register a user first.");
    process.exit(1);
  }

  const userId = user.id;

  // Filter out jobs that already exist
  const urls = jobs.map((j) => j.externalUrl).filter(Boolean);
  const existing = await prisma.jobListing.findMany({
    where: { userId, externalUrl: { in: urls } },
    select: { externalUrl: true },
  });
  const existingUrls = new Set(existing.map((r) => r.externalUrl));

  const newJobs = jobs.filter(
    (j) => j.externalUrl && j.title && j.company && !existingUrls.has(j.externalUrl)
  );

  if (newJobs.length === 0) {
    console.log(`All ${jobs.length} jobs already exist in the database.`);
    process.exit(0);
  }

  let inserted = 0;
  for (const job of newJobs) {
    try {
      await prisma.jobListing.create({
        data: {
          userId,
          externalUrl: job.externalUrl,
          platform: job.platform ?? "ai-discovery",
          title: job.title,
          company: job.company,
          location: job.location ?? null,
          datePosted: job.datePosted ? new Date(job.datePosted) : null,
          descriptionHtml: job.descriptionHtml ?? null,
          descriptionText: job.descriptionText ?? null,
          salary: job.salary ?? null,
          metadata: job.metadata ? JSON.parse(JSON.stringify(job.metadata)) : undefined,
          scrapeRunId: runId ?? undefined,
        },
      });
      inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to insert "${job.title}" at ${job.company}: ${msg}`);
    }
  }

  // Update ScrapeRun jobsFound count if linked
  if (runId) {
    const totalJobs = await prisma.jobListing.count({
      where: { scrapeRunId: runId },
    });
    await prisma.scrapeRun.update({
      where: { id: runId },
      data: { jobsFound: totalJobs },
    });
  }

  console.log(
    `Inserted ${inserted} new jobs (${jobs.length - newJobs.length} duplicates skipped).`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
