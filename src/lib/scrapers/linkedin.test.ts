import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stealth module
vi.mock("./stealth", () => ({
  randomDelay: vi.fn().mockResolvedValue(undefined),
  getRandomUserAgent: vi.fn().mockReturnValue("MockUserAgent/1.0"),
}));

import { LinkedInScraper } from "./linkedin";

const SAMPLE_LINKEDIN_HTML = `
<div class="base-card">
  <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/3901234567">
    <span class="sr-only">Software Engineering Intern</span>
  </a>
  <h3 class="base-search-card__title">Software Engineering Intern</h3>
  <h4 class="base-search-card__subtitle">
    <a class="hidden-nested-link">Google</a>
  </h4>
  <span class="job-search-card__location">Mountain View, CA</span>
  <time datetime="2026-03-01">March 1, 2026</time>
</div>
<div class="base-card">
  <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/3901234568">
    <span class="sr-only">Data Science Intern</span>
  </a>
  <h3 class="base-search-card__title">Data Science Intern</h3>
  <h4 class="base-search-card__subtitle">
    <a class="hidden-nested-link">Meta</a>
  </h4>
  <span class="job-search-card__location">New York, NY</span>
  <time datetime="2026-03-02">March 2, 2026</time>
</div>
`;

const BLOCKED_HTML = `
<html>
<head><title>Sign In</title></head>
<body>Please sign in to continue</body>
</html>
`;

describe("LinkedInScraper", () => {
  let scraper: LinkedInScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new LinkedInScraper();
    global.fetch = vi.fn();
  });

  it("implements ScraperAdapter interface (has platform='linkedin' and discover method)", () => {
    expect(scraper.platform).toBe("linkedin");
    expect(typeof scraper.discover).toBe("function");
  });

  it("constructs correct LinkedIn guest API URL with keywords=intern, location=United+States, f_JT=I", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    } as any);

    await scraper.discover({ keywords: [], locations: [], roleTypes: [] });

    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(0);

    const url = fetchCalls[0][0] as string;
    expect(url).toContain("linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search");
    expect(url).toContain("keywords=intern");
    expect(url).toContain("f_JT=I");
    expect(url).toMatch(/location=United[+%20]States/);
  });

  it("parses HTML response to extract job title, company, location, URL, and date", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(SAMPLE_LINKEDIN_HTML),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    expect(jobs.length).toBeGreaterThan(0);

    const googleJob = jobs.find((j) => j.company === "Google");
    expect(googleJob).toBeDefined();
    expect(googleJob!.title).toBe("Software Engineering Intern");
    expect(googleJob!.location).toBe("Mountain View, CA");
    expect(googleJob!.externalUrl).toContain("linkedin.com/jobs/view/");
    expect(googleJob!.datePosted).toEqual(new Date("2026-03-01"));
    expect(googleJob!.platform).toBe("linkedin");
  });

  it("paginates with start parameter (increments of 25), stops after max 5 pages", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(SAMPLE_LINKEDIN_HTML),
    } as any);

    await scraper.discover({ keywords: [], locations: [], roleTypes: [] });

    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    // Should make up to 5 page requests
    expect(fetchCalls.length).toBeLessThanOrEqual(5);

    // Check start parameters increment by 25
    const urls = fetchCalls.map((c) => c[0] as string);
    expect(urls[0]).toContain("start=0");
    if (urls.length > 1) {
      expect(urls[1]).toContain("start=25");
    }
  });

  it("uses randomDelay between requests (3000-5000ms for LinkedIn rate limit protection)", async () => {
    const { randomDelay } = await import("./stealth");

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(SAMPLE_LINKEDIN_HTML),
    } as any);

    await scraper.discover({ keywords: [], locations: [], roleTypes: [] });

    // randomDelay should be called between page requests
    expect(randomDelay).toHaveBeenCalled();
    // Verify it was called with LinkedIn-appropriate delay values
    const delayCalls = vi.mocked(randomDelay).mock.calls;
    if (delayCalls.length > 0) {
      expect(delayCalls[0][0]).toBeGreaterThanOrEqual(3000);
      expect(delayCalls[0][1]).toBeLessThanOrEqual(5000);
    }
  });

  it("detects login redirect / block response and stops early", async () => {
    let callCount = 0;
    vi.mocked(global.fetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve(SAMPLE_LINKEDIN_HTML),
        } as any;
      }
      // Second page returns login redirect
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(BLOCKED_HTML),
      } as any;
    });

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Should still return results from first page
    expect(jobs.length).toBeGreaterThan(0);
    // Should have stopped after detecting block (not all 5 pages)
    expect(callCount).toBeLessThanOrEqual(3);
  });

  it("returns empty array on complete failure (does not throw)", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(0);
  });
});
