import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { WORKDAY_COMPANIES, type WorkdayCompany } from "./constants";
import { isInternshipRole, isUSLocation } from "./filters";
import { randomDelay, createStealthBrowser } from "./stealth";

const PAGE_LIMIT = 20;

export class WorkdayScraper implements ScraperAdapter {
  platform = "workday";

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const allJobs: DiscoveredJob[] = [];

    for (const company of WORKDAY_COMPANIES) {
      try {
        const jobs = await this.fetchCompanyJobs(company);
        allJobs.push(...jobs);
        await randomDelay(1000, 3000);
      } catch (error) {
        console.warn(
          `[WorkdayScraper] Error fetching ${company.name}:`,
          (error as Error).message
        );
        continue;
      }
    }

    return allJobs;
  }

  private async fetchCompanyJobs(
    company: WorkdayCompany
  ): Promise<DiscoveredJob[]> {
    const allPostings: DiscoveredJob[] = [];
    let offset = 0;

    while (true) {
      const url = `https://${company.domain}/wday/cxs/${company.slug}/${company.site}/jobs`;
      const body = JSON.stringify({
        appliedFacets: {},
        limit: PAGE_LIMIT,
        offset,
        searchText: "",
      });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Fall back to browser on 403/429
      if (res.status === 403 || res.status === 429) {
        console.warn(
          `[WorkdayScraper] API blocked for ${company.name} (${res.status}), falling back to browser`
        );
        return this.fetchCompanyJobsBrowser(company);
      }

      if (!res.ok) {
        console.warn(
          `[WorkdayScraper] Failed to fetch ${company.name} (${res.status}), skipping`
        );
        return allPostings;
      }

      const data = await res.json();
      const postings = data.jobPostings || [];

      if (postings.length === 0) {
        break;
      }

      for (const posting of postings) {
        const title = posting.title || "";
        const location = posting.locationsText || null;

        if (!isInternshipRole(title) || !isUSLocation(location)) {
          continue;
        }

        allPostings.push({
          externalUrl: `https://${company.domain}/en-US/job/${posting.externalPath || ""}`,
          platform: "workday",
          title,
          company: company.name,
          location,
          datePosted: posting.postedOn ? new Date(posting.postedOn) : null,
          descriptionHtml: null,
          descriptionText: null,
          salary: null,
          metadata: {
            workdayDomain: company.domain,
            workdaySlug: company.slug,
          },
        });
      }

      offset += PAGE_LIMIT;

      if (offset >= (data.total || 0)) {
        break;
      }

      await randomDelay(500, 1500);
    }

    return allPostings;
  }

  private async fetchCompanyJobsBrowser(
    company: WorkdayCompany
  ): Promise<DiscoveredJob[]> {
    let browser: any = null;
    try {
      const stealth = await createStealthBrowser();
      browser = stealth.browser;
      const page = await stealth.context.newPage();

      try {
        const careerUrl = `https://${company.domain}/${company.slug}/${company.site}`;
        await page.goto(careerUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

        // Wait for job cards to render
        await page.waitForSelector(
          '[data-automation-id="jobItem"], .WDGD .WDP8',
          { timeout: 10000 }
        ).catch(() => {
          // Selector might not match exactly; continue anyway
        });

        const jobCards: Array<{
          title: string;
          location: string;
          url: string;
        }> = await page.$$eval(
          '[data-automation-id="jobItem"], .WDGD .WDP8, [data-automation-id="compositeContainer"]',
          (elements: Element[]) =>
            elements.map((el) => {
              const heading = el.querySelector("h3, a, [data-automation-id='jobTitle']");
              const locationEl = el.querySelector(
                '[data-automation-id="locations"], dd, .css-129m7dg'
              );
              const linkEl = el.querySelector("a");
              return {
                title: heading?.textContent?.trim() || "",
                location: locationEl?.textContent?.trim() || "",
                url: linkEl?.getAttribute("href") || "",
              };
            })
        );

        // Paginate up to 10 pages by clicking "Show More"
        let pageCount = 1;
        while (pageCount < 10) {
          const showMore = page.locator(
            '[data-automation-id="loadMoreButton"], button:has-text("Show More")'
          );
          const count = await showMore.count();
          if (count === 0) break;

          await showMore.first().click().catch(() => {});
          await randomDelay(1000, 2000);
          pageCount++;

          const moreCards = await page.$$eval(
            '[data-automation-id="jobItem"], .WDGD .WDP8, [data-automation-id="compositeContainer"]',
            (elements: Element[]) =>
              elements.map((el) => {
                const heading = el.querySelector("h3, a, [data-automation-id='jobTitle']");
                const locationEl = el.querySelector(
                  '[data-automation-id="locations"], dd, .css-129m7dg'
                );
                const linkEl = el.querySelector("a");
                return {
                  title: heading?.textContent?.trim() || "",
                  location: locationEl?.textContent?.trim() || "",
                  url: linkEl?.getAttribute("href") || "",
                };
              })
          );

          // Add only new cards (by URL)
          const existingUrls = new Set(jobCards.map((c) => c.url));
          for (const card of moreCards) {
            if (!existingUrls.has(card.url)) {
              jobCards.push(card);
              existingUrls.add(card.url);
            }
          }
        }

        await page.close();

        // Filter and map to DiscoveredJob
        return jobCards
          .filter(
            (card) =>
              card.title &&
              isInternshipRole(card.title) &&
              isUSLocation(card.location || null)
          )
          .map((card) => ({
            externalUrl: card.url.startsWith("http")
              ? card.url
              : `https://${company.domain}${card.url}`,
            platform: "workday" as const,
            title: card.title,
            company: company.name,
            location: card.location || null,
            datePosted: null,
            descriptionHtml: null,
            descriptionText: null,
            salary: null,
            metadata: {
              workdayDomain: company.domain,
              workdaySlug: company.slug,
              source: "browser-fallback",
            },
          }));
      } catch (pageError) {
        console.warn(
          `[WorkdayScraper] Browser fallback failed for ${company.name}:`,
          (pageError as Error).message
        );
        return [];
      }
    } catch (browserError) {
      console.warn(
        `[WorkdayScraper] Could not launch browser for ${company.name}:`,
        (browserError as Error).message
      );
      return [];
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }
}
