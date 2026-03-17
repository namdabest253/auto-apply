import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { getRandomUserAgent, randomDelay } from "./stealth";

const MAX_PAGES = 3;

export class IndeedScraper implements ScraperAdapter {
  platform = "indeed";

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const allJobs: DiscoveredJob[] = [];

    try {
      for (let pageNum = 0; pageNum < MAX_PAGES; pageNum++) {
        const url = this.buildUrl(params, pageNum);

        if (pageNum > 0) {
          await randomDelay(2000, 4000);
        }

        const res = await fetch(url, {
          headers: {
            "User-Agent": getRandomUserAgent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.indeed.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
          },
        });

        if (!res.ok) {
          console.warn(`[IndeedScraper] HTTP ${res.status} on page ${pageNum + 1}`);
          break;
        }

        const html = await res.text();

        // Check for CAPTCHA/block
        const lower = html.toLowerCase();
        if (
          lower.includes("captcha") ||
          lower.includes("challenge-running") ||
          lower.includes("unusual traffic") ||
          lower.includes("verify you are a human")
        ) {
          console.warn(
            `[IndeedScraper] Block detected on page ${pageNum + 1}, stopping with ${allJobs.length} jobs`
          );
          break;
        }

        const jobs = this.extractJobs(html);
        if (jobs.length === 0) break;

        allJobs.push(...jobs);
        console.log(
          `[IndeedScraper] Page ${pageNum + 1}: found ${jobs.length} jobs (${allJobs.length} total)`
        );
      }
    } catch (error) {
      console.warn("[IndeedScraper] Error:", (error as Error).message);
    }

    return allJobs;
  }

  private buildUrl(params: SearchParams, page: number): string {
    const query = params.keywords.join(" ");
    const location = params.locations[0] || "";
    const url = new URL("https://www.indeed.com/jobs");
    url.searchParams.set("q", query);
    if (location) {
      url.searchParams.set("l", location);
    }
    url.searchParams.set("jt", "internship");
    if (page > 0) {
      url.searchParams.set("start", String(page * 10));
    }
    return url.toString();
  }

  private extractJobs(content: string): DiscoveredJob[] {
    const match = content.match(
      /window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]+?\});/
    );
    if (!match) return [];

    try {
      const data = JSON.parse(match[1]);
      const results =
        data?.metaData?.mosaicProviderJobCardsModel?.results || [];

      return results
        .filter((r: any) => r.jobkey && r.title)
        .map((r: any) => ({
          externalUrl: `https://www.indeed.com/viewjob?jk=${r.jobkey}`,
          platform: "indeed" as const,
          title: r.displayTitle || r.title,
          company: r.company || "Unknown",
          location: r.formattedLocation || null,
          datePosted: r.datePosted ? new Date(r.datePosted) : null,
          descriptionHtml: null,
          descriptionText: null,
          salary: r.salary || null,
          metadata: {
            jobkey: r.jobkey,
            extractedSalary: r.extractedSalary || null,
          },
        }));
    } catch (error) {
      console.warn("[IndeedScraper] Parse error:", (error as Error).message);
      return [];
    }
  }
}
