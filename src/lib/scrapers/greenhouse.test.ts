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
    {
      id: 789,
      title: "Senior Software Engineer",
      absolute_url: "https://boards.greenhouse.io/stripe/jobs/789",
      location: { name: "New York, NY" },
      updated_at: "2026-03-03T10:00:00Z",
      content: "<p>Senior role.</p>",
      departments: [{ name: "Engineering" }],
      offices: [{ name: "NYC" }],
    },
    {
      id: 101,
      title: "Product Manager",
      absolute_url: "https://boards.greenhouse.io/stripe/jobs/101",
      location: { name: "Remote" },
      updated_at: "2026-03-04T10:00:00Z",
      content: "<p>PM role.</p>",
      departments: [{ name: "Product" }],
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

    // Should have results (only intern jobs)
    expect(jobs.length).toBeGreaterThan(0);

    // Find one of our sample intern jobs
    const stripeJob = jobs.find((j) =>
      j.externalUrl.includes("stripe/jobs/123")
    );
    if (stripeJob) {
      expect(stripeJob.title).toBe("Software Engineering Intern");
      expect(stripeJob.platform).toBe("greenhouse");
      expect(stripeJob.descriptionText).not.toContain("<p>");
      expect(stripeJob.descriptionText).toContain("talented");
    }

    // Verify fetch was called with correct URL pattern
    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    const urls = fetchCalls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes("boards-api.greenhouse.io"))).toBe(
      true
    );
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

    for (const job of jobs) {
      expect(job.company.length).toBeGreaterThan(0);
    }
  });

  it("handles API error (non-200) gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    expect(Array.isArray(jobs)).toBe(true);
  });

  it("filters for internship roles only (excludes non-intern jobs)", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_GREENHOUSE_RESPONSE),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Should only return intern jobs, not senior or PM roles
    const titles = jobs.map((j) => j.title);
    expect(titles).toContain("Software Engineering Intern");
    expect(titles).toContain("Data Analyst Intern");
    expect(titles).not.toContain("Senior Software Engineer");
    expect(titles).not.toContain("Product Manager");
  });

  it("uses department metadata for internship detection", async () => {
    const responseWithDeptIntern = {
      jobs: [
        {
          id: 200,
          title: "Software Engineer",
          absolute_url: "https://boards.greenhouse.io/test/jobs/200",
          location: { name: "Remote" },
          updated_at: "2026-03-01T10:00:00Z",
          content: "<p>Role description.</p>",
          departments: [{ name: "Internship Program" }],
          offices: [],
        },
        {
          id: 201,
          title: "Software Engineer",
          absolute_url: "https://boards.greenhouse.io/test/jobs/201",
          location: { name: "Remote" },
          updated_at: "2026-03-01T10:00:00Z",
          content: "<p>Role description.</p>",
          departments: [{ name: "Engineering" }],
          offices: [],
        },
      ],
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithDeptIntern),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Should include the one in "Internship Program" department
    const urls = jobs.map((j) => j.externalUrl);
    expect(urls.some((u) => u.includes("jobs/200"))).toBe(true);
    // Should NOT include the generic engineering one
    expect(urls.some((u) => u.includes("jobs/201"))).toBe(false);
  });
});
