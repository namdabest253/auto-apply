import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { prisma } from "@/lib/prisma";
import { isInternshipRole, isUSLocation } from "./filters";
import { createStealthBrowser, randomDelay, getRandomUserAgent } from "./stealth";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const JOB_LINK_PATTERNS = [
  /\/jobs?\//i,
  /\/positions?\//i,
  /\/careers?\//i,
  /\/openings?\//i,
  /\/apply\//i,
  /\/\d{4,}/,  // Numeric ID segments (4+ digits)
];

const jobExtractionSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      url: z.string().nullable(),
      location: z.string().nullable(),
      department: z.string().nullable(),
      datePosted: z.string().nullable(),
    })
  ),
});

/**
 * Strip non-essential HTML tags and content, collapse whitespace, cap at 30K chars.
 */
export function extractMainContent(html: string): string {
  let text = html;

  // Remove script, style, nav, footer, header tags and their content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[\s\S]*?<\/header>/gi, "");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Cap at 30K characters
  return text.slice(0, 30000);
}

/**
 * Detect JS-rendered pages that have minimal actual content.
 * Returns true if the page likely needs Playwright to render.
 */
export function isMinimalContent(html: string): boolean {
  // Check for SPA mount indicators with little other content
  const hasSpaMount =
    /<div\s+id=["'](root|app|__next)["']\s*>/.test(html);

  // Extract text content
  const textContent = extractMainContent(html);

  if (textContent.length < 200) return true;
  if (hasSpaMount && textContent.length < 500) return true;

  return false;
}

/**
 * Extract job-related links from HTML.
 */
export function identifyJobLinks(html: string, baseUrl: string): string[] {
  const hrefRegex = /href=["']([^"']+)["']/gi;
  const links = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }

    const matchesJobPattern = JOB_LINK_PATTERNS.some((p) => p.test(href));
    if (!matchesJobPattern) continue;

    try {
      const resolved = new URL(href, baseUrl).href;
      links.add(resolved);
    } catch {
      // Skip invalid URLs
    }
  }

  return Array.from(links).slice(0, 20);
}

export class CareerPageCrawler implements ScraperAdapter {
  platform = "career-page";
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const urls = await prisma.careerPageUrl.findMany({
      where: { userId: this.userId },
    });

    if (urls.length === 0) return [];

    const allJobs: DiscoveredJob[] = [];

    for (const entry of urls) {
      try {
        const jobs = await this.fetchAndExtract(entry.url, entry.label);
        allJobs.push(...jobs);
      } catch (err) {
        console.error(
          `[career-page] Error crawling ${entry.url}:`,
          err instanceof Error ? err.message : err
        );
        // Continue to next URL (partial-safe)
      }

      if (urls.indexOf(entry) < urls.length - 1) {
        await randomDelay(2000, 4000);
      }
    }

    // Filter through internship and US location checks
    return allJobs.filter(
      (job) =>
        isInternshipRole(job.title, job.metadata?.department as string | undefined) &&
        isUSLocation(job.location)
    );
  }

  private async fetchPage(url: string): Promise<string> {
    // Try HTTP fetch first
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    const html = await response.text();

    // If content is minimal, retry with Playwright
    if (isMinimalContent(html)) {
      return this.fetchWithPlaywright(url);
    }

    return html;
  }

  private async fetchWithPlaywright(url: string): Promise<string> {
    const { browser, context } = await createStealthBrowser();
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      return await page.content();
    } finally {
      await browser.close();
    }
  }

  private async extractJobsFromPage(
    text: string,
    companyName: string,
    pageUrl: string
  ): Promise<DiscoveredJob[]> {
    if (!text.trim()) return [];

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: jobExtractionSchema,
      prompt: `Extract all job/internship listings from this career page content. For each job, extract the title, URL (full or relative), location, department, and date posted if visible. Company: ${companyName}\n\nPage content:\n${text}`,
    });

    return object.jobs.map((job) => {
      let externalUrl = pageUrl;
      if (job.url) {
        try {
          externalUrl = new URL(job.url, pageUrl).href;
        } catch {
          externalUrl = pageUrl;
        }
      }

      return {
        externalUrl,
        platform: "career-page",
        title: job.title,
        company: companyName,
        location: job.location,
        datePosted: job.datePosted ? new Date(job.datePosted) : null,
        descriptionHtml: null,
        descriptionText: null,
        salary: null,
        metadata: {
          department: job.department,
          sourceUrl: pageUrl,
        },
      };
    });
  }

  private async fetchAndExtract(
    url: string,
    label: string
  ): Promise<DiscoveredJob[]> {
    const html = await this.fetchPage(url);
    const mainText = extractMainContent(html);

    // Extract jobs from the main page
    const mainJobs = await this.extractJobsFromPage(mainText, label, url);

    // Identify job-like links for 1-level-deep crawling
    const jobLinks = identifyJobLinks(html, url);

    const allJobs = [...mainJobs];
    let pagesVisited = 1;
    const maxPages = 20;

    for (const link of jobLinks) {
      if (pagesVisited >= maxPages) break;

      try {
        await randomDelay(1000, 2000);
        const subHtml = await this.fetchPage(link);
        const subText = extractMainContent(subHtml);
        const subJobs = await this.extractJobsFromPage(subText, label, link);
        allJobs.push(...subJobs);
        pagesVisited++;
      } catch (err) {
        console.error(
          `[career-page] Error fetching sub-page ${link}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // Deduplicate by externalUrl
    const seen = new Set<string>();
    return allJobs.filter((job) => {
      if (seen.has(job.externalUrl)) return false;
      seen.add(job.externalUrl);
      return true;
    });
  }
}
