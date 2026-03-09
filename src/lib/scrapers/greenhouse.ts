import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { GREENHOUSE_COMPANIES } from "./constants";
import { randomDelay } from "./stealth";

const GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards";

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export class GreenhouseScraper implements ScraperAdapter {
  platform = "greenhouse";

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const allJobs: DiscoveredJob[] = [];

    for (const company of GREENHOUSE_COMPANIES) {
      try {
        const url = `${GREENHOUSE_API}/${company.slug}/jobs?content=true`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(
            `[GreenhouseScraper] Failed to fetch ${company.name} (${res.status}), skipping`
          );
          continue;
        }

        const data = await res.json();
        const jobs: DiscoveredJob[] = (data.jobs || []).map((job: any) => ({
          externalUrl: job.absolute_url,
          platform: "greenhouse" as const,
          title: job.title,
          company: company.name,
          location: job.location?.name ?? null,
          datePosted: job.updated_at ? new Date(job.updated_at) : null,
          descriptionHtml: job.content ?? null,
          descriptionText: stripHtml(job.content),
          salary: null,
          metadata: {
            greenhouseId: job.id,
            departments: job.departments || [],
            offices: job.offices || [],
            boardSlug: company.slug,
          },
        }));

        // Filter by keywords if provided
        const filtered =
          params.keywords.length > 0
            ? jobs.filter((j) =>
                params.keywords.some((kw) =>
                  j.title.toLowerCase().includes(kw.toLowerCase())
                )
              )
            : jobs;

        allJobs.push(...filtered);

        // Be respectful between API calls
        await randomDelay(500, 1500);
      } catch (error) {
        console.warn(
          `[GreenhouseScraper] Error fetching ${company.name}:`,
          (error as Error).message
        );
        continue;
      }
    }

    return allJobs;
  }
}
