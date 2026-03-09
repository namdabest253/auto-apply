import "dotenv/config";
import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "./queue";
import { IndeedScraper } from "@/lib/scrapers/indeed";
import { GreenhouseScraper } from "@/lib/scrapers/greenhouse";
import { LeverScraper } from "@/lib/scrapers/lever";
import { filterNewJobs } from "@/lib/scrapers/dedup";
import { prisma } from "@/lib/prisma";
import type { SearchParams, DiscoveredJob } from "@/lib/scrapers/types";

interface ScrapeJobData {
  userId: string;
  runId: string;
  searchParams: SearchParams;
}

/**
 * Custom backoff strategy: 30s, 60s, 5min for attempts 1-3.
 */
function customBackoff(attemptsMade: number): number {
  const delays = [30_000, 60_000, 300_000];
  return delays[Math.min(attemptsMade - 1, delays.length - 1)];
}

async function processScrapeJob(job: Job<ScrapeJobData>): Promise<void> {
  const { userId, runId, searchParams } = job.data;
  const startTime = Date.now();

  // Update ScrapeRun status to "running"
  await prisma.scrapeRun.update({
    where: { id: runId },
    data: { status: "running" },
  });

  const allDiscovered: DiscoveredJob[] = [];
  const errors: Record<string, string> = {};

  // Indeed requires residential proxies (403/CAPTCHA from server IPs) — disabled for now
  const scrapers = [new GreenhouseScraper(), new LeverScraper()];

  for (const scraper of scrapers) {
    try {
      const jobs = await scraper.discover(searchParams);
      allDiscovered.push(...jobs);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      errors[scraper.platform] = message;
      console.error(`[scrape-worker] ${scraper.platform} failed:`, message);
      // Continue with other scrapers (partial-safe saving)
    }
  }

  // Deduplicate against existing DB entries
  const newJobs = await filterNewJobs(userId, allDiscovered);

  // Save new jobs to database
  for (const discoveredJob of newJobs) {
    await prisma.jobListing.create({
      data: {
        userId,
        scrapeRunId: runId,
        externalUrl: discoveredJob.externalUrl,
        platform: discoveredJob.platform,
        title: discoveredJob.title,
        company: discoveredJob.company,
        location: discoveredJob.location,
        datePosted: discoveredJob.datePosted,
        descriptionHtml: discoveredJob.descriptionHtml,
        descriptionText: discoveredJob.descriptionText,
        salary: discoveredJob.salary,
        metadata: JSON.parse(JSON.stringify(discoveredJob.metadata)),
      },
    });
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Update ScrapeRun to "completed"
  await prisma.scrapeRun.update({
    where: { id: runId },
    data: {
      status: Object.keys(errors).length > 0 ? "completed_with_errors" : "completed",
      jobsFound: newJobs.length,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      completedAt: new Date(),
      duration,
    },
  });
}

// Create worker with custom backoff
const connection = getRedisConnectionOptions();

const worker = new Worker<ScrapeJobData>("scrape", processScrapeJob, {
  connection,
  concurrency: 1, // One scrape at a time (browser resource constraint)
  settings: {
    backoffStrategy: customBackoff,
  },
});

// Event handlers for logging
worker.on("completed", (job) => {
  console.log(`[scrape-worker] Job ${job.id} completed`);
});

worker.on("failed", async (job, err) => {
  console.error(`[scrape-worker] Job ${job?.id} failed:`, err.message);

  // If all retries exhausted, mark ScrapeRun as failed
  if (job && job.attemptsMade >= (job.opts?.attempts ?? 1)) {
    try {
      await prisma.scrapeRun.update({
        where: { id: job.data.runId },
        data: {
          status: "failed",
          errors: { fatal: err.message },
          completedAt: new Date(),
          duration: Math.round((Date.now() - job.timestamp) / 1000),
        },
      });
    } catch (dbErr) {
      console.error("[scrape-worker] Failed to update ScrapeRun:", dbErr);
    }
  }
});

console.log("[scrape-worker] Worker started, waiting for jobs...");

export { worker, processScrapeJob };
