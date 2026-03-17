import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { LEVER_COMPANIES } from "./constants";
import { isInternshipRole, isUSLocation } from "./filters";
import { randomDelay } from "./stealth";

const LEVER_API = "https://api.lever.co/v0/postings";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  description: string | null;
  descriptionPlain: string | null;
  categories: {
    location?: string;
    team?: string;
    department?: string;
    commitment?: string;
  };
  salaryRange?: {
    currency: string;
    interval: string;
    min: number;
    max: number;
  } | null;
  workplaceType?: string;
}

function formatSalary(
  salaryRange: LeverPosting["salaryRange"]
): string | null {
  if (!salaryRange) return null;
  return `${salaryRange.currency} ${salaryRange.min}-${salaryRange.max}/${salaryRange.interval}`;
}

export class LeverScraper implements ScraperAdapter {
  platform = "lever";

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const allJobs: DiscoveredJob[] = [];

    for (const company of LEVER_COMPANIES) {
      try {
        const url = `${LEVER_API}/${company.slug}?mode=json`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(
            `[LeverScraper] Failed to fetch ${company.name} (${res.status}), skipping`
          );
          continue;
        }

        const postings: LeverPosting[] = await res.json();

        const jobs: DiscoveredJob[] = postings.map((posting) => ({
          externalUrl: posting.hostedUrl,
          platform: "lever" as const,
          title: posting.text,
          company: company.name,
          location: posting.categories?.location ?? null,
          datePosted: posting.createdAt ? new Date(posting.createdAt) : null,
          descriptionHtml: posting.description ?? null,
          descriptionText: posting.descriptionPlain ?? null,
          salary: formatSalary(posting.salaryRange),
          metadata: {
            leverId: posting.id,
            commitment: posting.categories?.commitment ?? null,
            team: posting.categories?.team ?? null,
            department: posting.categories?.department ?? null,
            workplaceType: posting.workplaceType ?? null,
            leverSlug: company.slug,
          },
        }));

        // Filter for US internship roles
        const filtered = jobs.filter(
          (j) =>
            isInternshipRole(
              j.title,
              (j.metadata as any)?.team || (j.metadata as any)?.department
            ) && isUSLocation(j.location)
        );

        allJobs.push(...filtered);

        // Be respectful between API calls
        await randomDelay(500, 1500);
      } catch (error) {
        console.warn(
          `[LeverScraper] Error fetching ${company.name}:`,
          (error as Error).message
        );
        continue;
      }
    }

    return allJobs;
  }
}
