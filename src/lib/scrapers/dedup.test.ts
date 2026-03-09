import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobListing: {
      findMany: vi.fn(),
    },
  },
}));

import { filterNewJobs } from "./dedup";
import { prisma } from "@/lib/prisma";
import type { DiscoveredJob } from "./types";

const makeJob = (url: string, title = "Test Job"): DiscoveredJob => ({
  externalUrl: url,
  platform: "indeed",
  title,
  company: "Test Corp",
  location: "Remote",
  datePosted: new Date(),
  descriptionHtml: "<p>Test</p>",
  descriptionText: "Test",
  salary: null,
  metadata: {},
});

describe("filterNewJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only jobs whose externalUrl is not already in the database for the given userId", async () => {
    const jobs = [
      makeJob("https://indeed.com/job/1"),
      makeJob("https://indeed.com/job/2"),
      makeJob("https://indeed.com/job/3"),
    ];

    // Simulate that job/1 and job/3 already exist
    vi.mocked(prisma.jobListing.findMany).mockResolvedValue([
      { externalUrl: "https://indeed.com/job/1" },
      { externalUrl: "https://indeed.com/job/3" },
    ] as any);

    const result = await filterNewJobs("user-123", jobs);

    expect(result).toHaveLength(1);
    expect(result[0].externalUrl).toBe("https://indeed.com/job/2");
  });

  it("returns all jobs when database has no matching URLs", async () => {
    const jobs = [
      makeJob("https://indeed.com/job/10"),
      makeJob("https://indeed.com/job/20"),
    ];

    vi.mocked(prisma.jobListing.findMany).mockResolvedValue([] as any);

    const result = await filterNewJobs("user-123", jobs);

    expect(result).toHaveLength(2);
  });

  it("returns empty array when all jobs already exist", async () => {
    const jobs = [
      makeJob("https://indeed.com/job/1"),
      makeJob("https://indeed.com/job/2"),
    ];

    vi.mocked(prisma.jobListing.findMany).mockResolvedValue([
      { externalUrl: "https://indeed.com/job/1" },
      { externalUrl: "https://indeed.com/job/2" },
    ] as any);

    const result = await filterNewJobs("user-123", jobs);

    expect(result).toHaveLength(0);
  });

  it("queries prisma with correct userId and URL list", async () => {
    const jobs = [
      makeJob("https://indeed.com/job/a"),
      makeJob("https://indeed.com/job/b"),
    ];

    vi.mocked(prisma.jobListing.findMany).mockResolvedValue([] as any);

    await filterNewJobs("user-xyz", jobs);

    expect(prisma.jobListing.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-xyz",
        externalUrl: {
          in: ["https://indeed.com/job/a", "https://indeed.com/job/b"],
        },
      },
      select: { externalUrl: true },
    });
  });

  it("returns empty array when given empty jobs array", async () => {
    const result = await filterNewJobs("user-123", []);
    expect(result).toHaveLength(0);
  });
});
