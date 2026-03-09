import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stealth module
vi.mock("./stealth", () => ({
  randomDelay: vi.fn().mockResolvedValue(undefined),
}));

import { LeverScraper } from "./lever";

const SAMPLE_LEVER_POSTINGS = [
  {
    id: "aaa-111",
    text: "Software Engineering Intern - Summer 2026",
    hostedUrl: "https://jobs.lever.co/palantir/aaa-111",
    createdAt: 1709290800000, // 2024-03-01T10:00:00Z
    description: "<p>Join our team as an <strong>intern</strong>.</p>",
    descriptionPlain: "Join our team as an intern.",
    categories: {
      location: "New York, NY",
      team: "Engineering",
      department: "Product",
      commitment: "Intern",
    },
    salaryRange: {
      currency: "USD",
      interval: "year",
      min: 50000,
      max: 70000,
    },
    workplaceType: "unspecified",
  },
  {
    id: "bbb-222",
    text: "Data Science Co-op",
    hostedUrl: "https://jobs.lever.co/palantir/bbb-222",
    createdAt: 1709377200000,
    description: "<p>Data role.</p>",
    descriptionPlain: "Data role.",
    categories: {
      location: "Remote",
      team: "Data",
      department: "Analytics",
    },
    salaryRange: null,
    workplaceType: "remote",
  },
  {
    id: "ccc-333",
    text: "Senior Software Engineer",
    hostedUrl: "https://jobs.lever.co/palantir/ccc-333",
    createdAt: 1709463600000,
    description: "<p>Senior role.</p>",
    descriptionPlain: "Senior role.",
    categories: {
      location: "San Francisco, CA",
      team: "Platform",
      department: "Engineering",
    },
    salaryRange: null,
    workplaceType: "onsite",
  },
  {
    id: "ddd-444",
    text: "Product Manager",
    hostedUrl: "https://jobs.lever.co/palantir/ddd-444",
    createdAt: 1709550000000,
    description: "<p>PM role.</p>",
    descriptionPlain: "PM role.",
    categories: {
      location: "London, UK",
      team: "Product",
    },
    salaryRange: null,
    workplaceType: "onsite",
  },
];

describe("LeverScraper", () => {
  let scraper: LeverScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new LeverScraper();
    global.fetch = vi.fn();
  });

  it("has platform set to 'lever'", () => {
    expect(scraper.platform).toBe("lever");
  });

  it("maps Lever API fields to DiscoveredJob correctly", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_LEVER_POSTINGS),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    // Find the intern posting
    const internJob = jobs.find((j) => j.externalUrl.includes("aaa-111"));
    expect(internJob).toBeDefined();
    expect(internJob!.title).toBe(
      "Software Engineering Intern - Summer 2026"
    );
    expect(internJob!.externalUrl).toBe(
      "https://jobs.lever.co/palantir/aaa-111"
    );
    expect(internJob!.platform).toBe("lever");
    expect(internJob!.company).toBe("Palantir");
    expect(internJob!.location).toBe("New York, NY");
    expect(internJob!.datePosted).toEqual(new Date(1709290800000));
    expect(internJob!.descriptionHtml).toBe(
      "<p>Join our team as an <strong>intern</strong>.</p>"
    );
    expect(internJob!.descriptionText).toBe("Join our team as an intern.");
  });

  it("formats salaryRange as readable string", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_LEVER_POSTINGS),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    const internJob = jobs.find((j) => j.externalUrl.includes("aaa-111"));
    expect(internJob).toBeDefined();
    expect(internJob!.salary).toBe("USD 50000-70000/year");
  });

  it("sets salary to null when salaryRange is absent", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_LEVER_POSTINGS),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    const coopJob = jobs.find((j) => j.externalUrl.includes("bbb-222"));
    expect(coopJob).toBeDefined();
    expect(coopJob!.salary).toBeNull();
  });

  it("stores metadata fields (leverId, commitment, team, department, workplaceType, leverSlug)", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_LEVER_POSTINGS),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    const internJob = jobs.find((j) => j.externalUrl.includes("aaa-111"));
    expect(internJob).toBeDefined();
    expect(internJob!.metadata.leverId).toBe("aaa-111");
    expect(internJob!.metadata.commitment).toBe("Intern");
    expect(internJob!.metadata.team).toBe("Engineering");
    expect(internJob!.metadata.department).toBe("Product");
    expect(internJob!.metadata.workplaceType).toBe("unspecified");
    expect(internJob!.metadata.leverSlug).toBe("palantir");
  });

  it("filters for internship roles only (excludes non-intern jobs)", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_LEVER_POSTINGS),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    const titles = jobs.map((j) => j.title);
    expect(titles).toContain("Software Engineering Intern - Summer 2026");
    expect(titles).toContain("Data Science Co-op");
    expect(titles).not.toContain("Senior Software Engineer");
    expect(titles).not.toContain("Product Manager");
  });

  it("handles non-200 responses gracefully (warns, continues)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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
    expect(jobs.length).toBe(0);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("handles fetch errors gracefully (warns, continues)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(0);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("returns empty array when API returns empty array", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    const jobs = await scraper.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    });

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(0);
  });
});
