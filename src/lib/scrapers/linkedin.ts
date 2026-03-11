import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { isUSLocation } from "./filters";
import { randomDelay, getRandomUserAgent } from "./stealth";

const LINKEDIN_BASE_URL =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

const MAX_PAGES = 5;
const PAGE_SIZE = 25;

// Regex patterns for parsing LinkedIn HTML job cards
const JOB_URL_RE =
  /href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/g;
const TITLE_RE =
  /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/g;
const COMPANY_RE =
  /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h4>/g;
const LOCATION_RE =
  /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/g;
const DATE_RE = /<time[^>]*datetime="([^"]+)"[^>]*>/g;

interface ParsedJob {
  url: string;
  title: string;
  company: string;
  location: string;
  datePosted: string | null;
}

function parseJobCards(html: string): ParsedJob[] {
  const urls: string[] = [];
  const titles: string[] = [];
  const companies: string[] = [];
  const locations: string[] = [];
  const dates: string[] = [];

  let match: RegExpExecArray | null;

  // Reset regex lastIndex for each parse
  JOB_URL_RE.lastIndex = 0;
  TITLE_RE.lastIndex = 0;
  COMPANY_RE.lastIndex = 0;
  LOCATION_RE.lastIndex = 0;
  DATE_RE.lastIndex = 0;

  while ((match = JOB_URL_RE.exec(html)) !== null) {
    urls.push(match[1]);
  }
  while ((match = TITLE_RE.exec(html)) !== null) {
    titles.push(match[1].trim());
  }
  while ((match = COMPANY_RE.exec(html)) !== null) {
    companies.push(match[1].trim());
  }
  while ((match = LOCATION_RE.exec(html)) !== null) {
    locations.push(match[1].trim());
  }
  while ((match = DATE_RE.exec(html)) !== null) {
    dates.push(match[1]);
  }

  const count = Math.min(urls.length, titles.length);
  const jobs: ParsedJob[] = [];

  for (let i = 0; i < count; i++) {
    jobs.push({
      url: urls[i],
      title: titles[i],
      company: companies[i] || "",
      location: locations[i] || "",
      datePosted: dates[i] || null,
    });
  }

  return jobs;
}

function isBlockedResponse(html: string): boolean {
  return html.includes("<title>Sign In</title>") || html.includes("<title>Login</title>");
}

export class LinkedInScraper implements ScraperAdapter {
  platform = "linkedin";

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const allJobs: DiscoveredJob[] = [];

    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const start = page * PAGE_SIZE;
        const url = `${LINKEDIN_BASE_URL}?keywords=intern&location=United+States&f_JT=I&f_TPR=r604800&start=${start}`;

        const res = await fetch(url, {
          headers: {
            "User-Agent": getRandomUserAgent(),
            Accept: "text/html",
          },
        });

        // Stop on rate limit / auth block
        if (res.status === 429 || res.status === 403) {
          console.warn(
            `[LinkedInScraper] Rate limited (${res.status}), stopping pagination`
          );
          break;
        }

        if (!res.ok) {
          console.warn(
            `[LinkedInScraper] Failed to fetch page ${page} (${res.status}), stopping`
          );
          break;
        }

        const html = await res.text();

        // Detect login redirect
        if (isBlockedResponse(html)) {
          console.warn(
            "[LinkedInScraper] Detected login redirect, stopping pagination"
          );
          break;
        }

        const parsed = parseJobCards(html);

        if (parsed.length === 0) {
          break;
        }

        for (const job of parsed) {
          if (!isUSLocation(job.location || null)) {
            continue;
          }

          allJobs.push({
            externalUrl: job.url,
            platform: "linkedin",
            title: job.title,
            company: job.company,
            location: job.location || null,
            datePosted: job.datePosted ? new Date(job.datePosted) : null,
            descriptionHtml: null,
            descriptionText: null,
            salary: null,
            metadata: {
              source: "linkedin-guest-api",
            },
          });
        }

        // Use longer delays for LinkedIn
        if (page < MAX_PAGES - 1) {
          await randomDelay(3000, 5000);
        }
      }
    } catch (error) {
      console.warn(
        "[LinkedInScraper] Fatal error:",
        (error as Error).message
      );
      return allJobs.length > 0 ? allJobs : [];
    }

    return allJobs;
  }
}
