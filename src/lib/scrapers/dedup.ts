import { prisma } from "@/lib/prisma";
import type { DiscoveredJob } from "./types";

/**
 * Filters out jobs whose externalUrl already exists in the database for the given user.
 * Returns only new (not yet stored) jobs.
 */
export async function filterNewJobs(
  userId: string,
  jobs: DiscoveredJob[]
): Promise<DiscoveredJob[]> {
  if (jobs.length === 0) {
    return [];
  }

  const existingRecords = await prisma.jobListing.findMany({
    where: {
      userId,
      externalUrl: {
        in: jobs.map((j) => j.externalUrl),
      },
    },
    select: { externalUrl: true },
  });

  const existingUrls = new Set(existingRecords.map((r) => r.externalUrl));

  return jobs.filter((j) => !existingUrls.has(j.externalUrl));
}
