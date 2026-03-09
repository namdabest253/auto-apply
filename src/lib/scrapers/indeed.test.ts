import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock rebrowser-playwright
vi.mock("rebrowser-playwright", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

// Mock stealth module
vi.mock("./stealth", () => ({
  createStealthBrowser: vi.fn(),
  randomDelay: vi.fn().mockResolvedValue(undefined),
}));

import { IndeedScraper } from "./indeed";
import { createStealthBrowser } from "./stealth";

const SAMPLE_MOSAIC_DATA = {
  metaData: { mosaicProviderJobCardsModel: { results: [
    {
      title: "Software Engineering Intern",
      company: "Acme Corp",
      formattedLocation: "San Francisco, CA",
      datePosted: "2026-03-01",
      jobLocationCity: "San Francisco",
      jobLocationState: "CA",
      salary: "$25/hr",
      jobkey: "abc123",
      displayTitle: "Software Engineering Intern",
      extractedSalary: { max: 25, min: 20, type: "hourly" },
    },
    {
      title: "Data Science Intern",
      company: "Beta Inc",
      formattedLocation: "Remote",
      datePosted: "2026-03-02",
      jobLocationCity: "",
      jobLocationState: "",
      salary: "",
      jobkey: "def456",
      displayTitle: "Data Science Intern",
    },
  ] } },
};

const SAMPLE_HTML = `
<html><head></head><body>
<script>window.mosaic.providerData["mosaic-provider-jobcards"]=${JSON.stringify(SAMPLE_MOSAIC_DATA)};</script>
</body></html>
`;

const BLOCK_HTML = `
<html><head></head><body>
<div id="challenge-running">Please verify you are a human</div>
</body></html>
`;

const EMPTY_MOSAIC_HTML = `
<html><head></head><body>
<script>window.mosaic.providerData["mosaic-provider-jobcards"]={"metaData":{"mosaicProviderJobCardsModel":{"results":[]}}};</script>
</body></html>
`;

describe("IndeedScraper", () => {
  let scraper: IndeedScraper;
  let mockPage: any;
  let mockContext: any;
  let mockBrowser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new IndeedScraper();

    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      content: vi.fn()
        .mockResolvedValueOnce(SAMPLE_HTML)
        .mockResolvedValue(EMPTY_MOSAIC_HTML),
      close: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue("https://www.indeed.com/jobs?q=software+intern&l=San+Francisco"),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      close: vi.fn().mockResolvedValue(undefined),
      newContext: vi.fn().mockResolvedValue(mockContext),
    };

    vi.mocked(createStealthBrowser).mockResolvedValue({
      browser: mockBrowser,
      context: mockContext,
    });
  });

  it("has platform set to 'indeed'", () => {
    expect(scraper.platform).toBe("indeed");
  });

  it("parses embedded JSON from window.mosaic.providerData and returns DiscoveredJob[]", async () => {
    const jobs = await scraper.discover({
      keywords: ["software intern"],
      locations: ["San Francisco, CA"],
      roleTypes: [],
    });

    expect(jobs.length).toBe(2);
    expect(jobs[0].title).toBe("Software Engineering Intern");
    expect(jobs[0].company).toBe("Acme Corp");
    expect(jobs[0].platform).toBe("indeed");
    expect(jobs[0].externalUrl).toContain("indeed.com");
    expect(jobs[0].externalUrl).toContain("abc123");
    expect(jobs[1].title).toBe("Data Science Intern");
  });

  it("constructs correct Indeed URL from keywords and locations", async () => {
    await scraper.discover({
      keywords: ["data science", "machine learning"],
      locations: ["New York, NY"],
      roleTypes: ["internship"],
    });

    const gotoCall = mockPage.goto.mock.calls[0][0];
    expect(gotoCall).toContain("indeed.com/jobs");
    expect(gotoCall).toContain("q=");
    expect(gotoCall).toContain("l=");
  });

  it("handles empty/missing mosaic data gracefully (returns empty array)", async () => {
    mockPage.content.mockReset().mockResolvedValue(EMPTY_MOSAIC_HTML);

    const jobs = await scraper.discover({
      keywords: ["software"],
      locations: ["Remote"],
      roleTypes: [],
    });

    expect(jobs).toEqual([]);
  });

  it("handles CAPTCHA/block page detection (returns empty with warning)", async () => {
    mockPage.content.mockReset().mockResolvedValue(BLOCK_HTML);

    const jobs = await scraper.discover({
      keywords: ["software"],
      locations: ["Remote"],
      roleTypes: [],
    });

    expect(jobs).toEqual([]);
  });

  it("closes browser in finally block even on error", async () => {
    mockPage.content.mockReset().mockRejectedValue(new Error("Network error"));

    const jobs = await scraper.discover({
      keywords: ["software"],
      locations: ["Remote"],
      roleTypes: [],
    });

    expect(mockBrowser.close).toHaveBeenCalled();
    expect(jobs).toEqual([]);
  });
});
