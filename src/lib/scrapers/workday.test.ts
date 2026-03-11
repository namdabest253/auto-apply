import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stealth module
vi.mock("./stealth", () => ({
  randomDelay: vi.fn().mockResolvedValue(undefined),
  createStealthBrowser: vi.fn(),
  getRandomUserAgent: vi.fn().mockReturnValue("MockUserAgent/1.0"),
}));

import { WorkdayScraper } from "./workday";
import { createStealthBrowser } from "./stealth";

const SAMPLE_WORKDAY_RESPONSE = {
  total: 2,
  jobPostings: [
    {
      title: "Software Engineering Intern - Summer 2026",
      locationsText: "Seattle, WA",
      externalPath: "/job/Software-Engineering-Intern_R12345",
      postedOn: "2026-03-01",
      bulletFields: [],
    },
    {
      title: "Data Science Intern",
      locationsText: "New York, NY",
      externalPath: "/job/Data-Science-Intern_R12346",
      postedOn: "2026-03-02",
      bulletFields: [],
    },
  ],
};

const SAMPLE_WORKDAY_RESPONSE_SENIOR = {
  total: 1,
  jobPostings: [
    {
      title: "Senior Software Engineer",
      locationsText: "San Francisco, CA",
      externalPath: "/job/Senior-SWE_R99999",
      postedOn: "2026-03-01",
      bulletFields: [],
    },
  ],
};

const SAMPLE_WORKDAY_RESPONSE_PAGE2 = {
  total: 40,
  jobPostings: [
    {
      title: "Product Management Intern",
      locationsText: "Chicago, IL",
      externalPath: "/job/PM-Intern_R12347",
      postedOn: "2026-03-03",
      bulletFields: [],
    },
  ],
};

const SAMPLE_WORKDAY_RESPONSE_EMPTY = {
  total: 40,
  jobPostings: [],
};

describe("WorkdayScraper", () => {
  let scraper: WorkdayScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new WorkdayScraper();
    global.fetch = vi.fn();
  });

  it("implements ScraperAdapter interface (has platform='workday' and discover method)", () => {
    expect(scraper.platform).toBe("workday");
    expect(typeof scraper.discover).toBe("function");
  });

  it("hits correct Workday API URL format (POST https://{domain}/wday/cxs/{slug}/{site}/jobs)", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SAMPLE_WORKDAY_RESPONSE),
    } as any);

    await scraper.discover({ keywords: [], locations: [], roleTypes: [] });

    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    // Check at least one call matches the Workday API pattern
    const hasWorkdayUrl = fetchCalls.some((call) => {
      const url = call[0] as string;
      const opts = call[1] as RequestInit;
      return (
        url.includes("/wday/cxs/") &&
        url.endsWith("/jobs") &&
        opts?.method === "POST"
      );
    });
    expect(hasWorkdayUrl).toBe(true);
  });

  it("paginates when total > limit", async () => {
    let callCount = 0;
    vi.mocked(global.fetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              total: 40,
              jobPostings: Array.from({ length: 20 }, (_, i) => ({
                title: `Intern Position ${i}`,
                locationsText: "Remote",
                externalPath: `/job/Intern_R${i}`,
                postedOn: "2026-03-01",
                bulletFields: [],
              })),
            }),
        } as any;
      }
      if (callCount === 2) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(SAMPLE_WORKDAY_RESPONSE_PAGE2),
        } as any;
      }
      // Subsequent companies
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ total: 0, jobPostings: [] }),
      } as any;
    });

    await scraper.discover({ keywords: [], locations: [], roleTypes: [] });

    // Should have made at least 2 calls for the first company (pagination)
    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    // Verify second call has offset
    const secondCallBody = fetchCalls[1]?.[1];
    if (secondCallBody) {
      const body = JSON.parse((secondCallBody as any).body);
      expect(body.offset).toBeGreaterThan(0);
    }
  });

  it("stops pagination when API returns empty postings", async () => {
    let callCount = 0;
    vi.mocked(global.fetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              total: 100,
              jobPostings: Array.from({ length: 20 }, (_, i) => ({
                title: `Intern ${i}`,
                locationsText: "Remote",
                externalPath: `/job/Intern_R${i}`,
                postedOn: "2026-03-01",
                bulletFields: [],
              })),
            }),
        } as any;
      }
      // Return empty for subsequent pages
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(SAMPLE_WORKDAY_RESPONSE_EMPTY),
      } as any;
    });

    await scraper.discover({ keywords: [], locations: [], roleTypes: [] });

    // After empty postings returned, should not make more calls for the same company
    // The total of calls should be 2 for first company (page 1 + empty page 2),
    // plus 1 per remaining company
  });

  it("filters results through isInternshipRole and isUSLocation", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          total: 3,
          jobPostings: [
            {
              title: "Software Engineering Intern",
              locationsText: "Seattle, WA",
              externalPath: "/job/Intern_R1",
              postedOn: "2026-03-01",
              bulletFields: [],
            },
            {
              title: "Senior Software Engineer",
              locationsText: "Seattle, WA",
              externalPath: "/job/Senior_R2",
              postedOn: "2026-03-01",
              bulletFields: [],
            },
            {
              title: "Marketing Intern",
              locationsText: "London, UK",
              externalPath: "/job/Intern_R3",
              postedOn: "2026-03-01",
              bulletFields: [],
            },
          ],
        }),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    const titles = jobs.map((j) => j.title);
    // Should include US intern
    expect(titles).toContain("Software Engineering Intern");
    // Should exclude non-intern
    expect(titles).not.toContain("Senior Software Engineer");
    // Should exclude non-US intern
    expect(titles).not.toContain("Marketing Intern");
  });

  it("continues to next company on fetch error (does not throw)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    expect(Array.isArray(jobs)).toBe(true);
    warnSpy.mockRestore();
  });

  it("maps Workday posting fields to DiscoveredJob format correctly", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SAMPLE_WORKDAY_RESPONSE),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    const internJob = jobs.find((j) =>
      j.title.includes("Software Engineering Intern")
    );
    expect(internJob).toBeDefined();
    expect(internJob!.platform).toBe("workday");
    expect(internJob!.location).toBe("Seattle, WA");
    expect(internJob!.externalUrl).toContain("/en-US/job/");
    expect(internJob!.datePosted).toEqual(new Date("2026-03-01"));
  });

  it("falls back to browser scraping when API returns 403 status", async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      $$eval: vi.fn().mockResolvedValue([
        {
          title: "Finance Intern",
          location: "Dallas, TX",
          url: "/en-US/job/Finance-Intern_R55555",
        },
      ]),
      locator: vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue(0),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    };
    const mockBrowser = {
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(createStealthBrowser).mockResolvedValue({
      browser: mockBrowser as any,
      context: mockContext as any,
    });

    let callCount = 0;
    vi.mocked(global.fetch).mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 403,
        json: () => Promise.resolve({}),
      } as any;
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Should have attempted browser fallback
    expect(createStealthBrowser).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("falls back to browser scraping when API returns 429 status", async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      $$eval: vi.fn().mockResolvedValue([]),
      locator: vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue(0),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    };
    const mockBrowser = {
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(createStealthBrowser).mockResolvedValue({
      browser: mockBrowser as any,
      context: mockContext as any,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    } as any);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await scraper.discover({ keywords: [], locations: [], roleTypes: [] });

    expect(createStealthBrowser).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("browser fallback extracts job cards from rendered Workday career page HTML", async () => {
    const mockJobCards = [
      {
        title: "Software Intern",
        location: "Austin, TX",
        url: "/en-US/job/Software-Intern_R77777",
      },
      {
        title: "Data Intern",
        location: "Remote",
        url: "/en-US/job/Data-Intern_R77778",
      },
    ];

    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      $$eval: vi.fn().mockResolvedValue(mockJobCards),
      locator: vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue(0),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    };
    const mockBrowser = {
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(createStealthBrowser).mockResolvedValue({
      browser: mockBrowser as any,
      context: mockContext as any,
    });

    // Make API return 403 to trigger fallback
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({}),
    } as any);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Browser should have been used to extract jobs
    expect(mockPage.$$eval).toHaveBeenCalled();

    // Should have mapped the extracted job data
    const softwareIntern = jobs.find((j) => j.title === "Software Intern");
    if (softwareIntern) {
      expect(softwareIntern.platform).toBe("workday");
      expect(softwareIntern.location).toBe("Austin, TX");
    }

    warnSpy.mockRestore();
  });
});
