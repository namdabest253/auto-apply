import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { createStealthBrowser, randomDelay } from "./stealth";

const BLOCK_INDICATORS = [
  "challenge-running",
  "captcha",
  "blocked",
  "unusual traffic",
  "verify you are a human",
  "please verify",
];

const MAX_PAGES = 5;

export class IndeedScraper implements ScraperAdapter {
  platform = "indeed";

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const allJobs: DiscoveredJob[] = [];
    let browser: any = null;

    try {
      const stealth = await createStealthBrowser();
      browser = stealth.browser;
      const context = stealth.context;

      const page = await context.newPage();

      for (let pageNum = 0; pageNum < MAX_PAGES; pageNum++) {
        const url = this.buildUrl(params, pageNum);

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await randomDelay(2000, 5000);

        const content = await page.content();

        // Check for block/CAPTCHA
        if (this.isBlocked(content)) {
          console.warn("[IndeedScraper] Block/CAPTCHA detected, stopping scrape");
          break;
        }

        const jobs = this.extractJobs(content);
        if (jobs.length === 0) {
          break; // No more results
        }

        allJobs.push(...jobs);
      }

      await page.close();
    } catch (error) {
      console.warn("[IndeedScraper] Error during scrape:", (error as Error).message);
    } finally {
      if (browser) {
        await browser.close();
      }
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

  private isBlocked(content: string): boolean {
    const lower = content.toLowerCase();
    return BLOCK_INDICATORS.some((indicator) => lower.includes(indicator));
  }

  private extractJobs(content: string): DiscoveredJob[] {
    const match = content.match(
      /window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]+?\});/
    );
    if (!match) {
      return [];
    }

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
      console.warn("[IndeedScraper] Failed to parse mosaic data:", (error as Error).message);
      return [];
    }
  }
}
