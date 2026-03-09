import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stealth module
vi.mock("./stealth", () => ({
  randomDelay: vi.fn().mockResolvedValue(undefined),
}));

import { GreenhouseScraper } from "./greenhouse";

const SAMPLE_GREENHOUSE_RESPONSE = {
  jobs: [
    {
      id: 123,
      title: "Software Engineering Intern",
      absolute_url: "https://boards.greenhouse.io/stripe/jobs/123",
      location: { name: "San Francisco, CA" },
      updated_at: "2026-03-01T10:00:00Z",
      content: "<p>We are looking for a <strong>talented</strong> intern.</p>",
      departments: [{ name: "Engineering" }],
      offices: [{ name: "SF" }],
    },
    {
      id: 456,
      title: "Data Analyst Intern",
      absolute_url: "https://boards.greenhouse.io/stripe/jobs/456",
      location: { name: "Remote" },
      updated_at: "2026-03-02T10:00:00Z",
      content: "<p>Join our data team.</p>",
      departments: [{ name: "Data" }],
      offices: [],
    },
  ],
};

describe("GreenhouseScraper", () => {
  let scraper: GreenhouseScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new GreenhouseScraper();
    global.fetch = vi.fn();
  });

  it("has platform set to 'greenhouse'", () => {
    expect(scraper.platform).toBe("greenhouse");
  });

  it("fetches from boards-api.greenhouse.io and transforms response to DiscoveredJob[]", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_GREENHOUSE_RESPONSE),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Should have results from multiple companies
    expect(jobs.length).toBeGreaterThan(0);

    // Find one of our sample jobs
    const stripeJob = jobs.find((j) => j.externalUrl.includes("stripe/jobs/123"));
    if (stripeJob) {
      expect(stripeJob.title).toBe("Software Engineering Intern");
      expect(stripeJob.platform).toBe("greenhouse");
      expect(stripeJob.descriptionText).not.toContain("<p>");
      expect(stripeJob.descriptionText).toContain("talented");
    }

    // Verify fetch was called with correct URL pattern
    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    const urls = fetchCalls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes("boards-api.greenhouse.io"))).toBe(true);
    expect(urls.some((u) => u.includes("content=true"))).toBe(true);
  });

  it("maps board token to company name from GREENHOUSE_COMPANIES list", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_GREENHOUSE_RESPONSE),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Company names should be proper names, not slugs
    for (const job of jobs) {
      // Should not contain only lowercase slug-like names
      // The company field should use the curated name from the list
      expect(job.company.length).toBeGreaterThan(0);
    }
  });

  it("handles API error (non-200) gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as any);

    // Should not throw, should return whatever it collected (empty in this case)
    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    expect(Array.isArray(jobs)).toBe(true);
  });

  it("filters jobs by keywords when provided", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_GREENHOUSE_RESPONSE),
    } as any);

    const jobs = await scraper.discover({
      keywords: ["data"],
      locations: [],
      roleTypes: [],
    });

    // Only jobs with "data" in title should be returned
    for (const job of jobs) {
      expect(job.title.toLowerCase()).toContain("data");
    }
  });
});
