import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock BullMQ
vi.mock("bullmq", () => {
  class QueueMock {
    constructor() {}
  }
  class WorkerMock {
    constructor() {}
    on() {}
  }
  return {
    Worker: WorkerMock,
    Queue: QueueMock,
    Job: class {},
  };
});

// Mock scrapers
const mockIndeedDiscover = vi.fn().mockResolvedValue([]);
const mockGreenhouseDiscover = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/scrapers/indeed", () => ({
  IndeedScraper: class {
    platform = "indeed";
    discover(...args: unknown[]) {
      return mockIndeedDiscover(...args);
    }
  },
}));

vi.mock("@/lib/scrapers/greenhouse", () => ({
  GreenhouseScraper: class {
    platform = "greenhouse";
    discover(...args: unknown[]) {
      return mockGreenhouseDiscover(...args);
    }
  },
}));

// Mock dedup
const mockFilterNewJobs = vi.fn().mockImplementation((_userId, jobs) => jobs);
vi.mock("@/lib/scrapers/dedup", () => ({
  filterNewJobs: (...args: unknown[]) => mockFilterNewJobs(...args),
}));

// Mock Prisma
const mockScrapeRunUpdate = vi.fn().mockResolvedValue({});
const mockJobListingCreate = vi.fn().mockResolvedValue({});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scrapeRun: {
      update: (...args: unknown[]) => mockScrapeRunUpdate(...args),
    },
    jobListing: {
      create: (...args: unknown[]) => mockJobListingCreate(...args),
    },
  },
}));

// Import processor after mocks are set up
// We need to import the module to get the processor function
const { processScrapeJob } = await import("./scrape.worker");

function createMockJob(data: Record<string, unknown>) {
  return {
    data: {
      userId: "user-1",
      runId: "run-1",
      searchParams: {
        keywords: ["software intern"],
        locations: ["Remote"],
        roleTypes: ["internship"],
      },
      ...data,
    },
    id: "job-1",
    attemptsMade: 0,
    opts: { attempts: 4 },
    timestamp: Date.now(),
  };
}

describe("scrape.worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndeedDiscover.mockResolvedValue([]);
    mockGreenhouseDiscover.mockResolvedValue([]);
    mockFilterNewJobs.mockImplementation((_userId: string, jobs: unknown[]) => jobs);
  });

  it("updates ScrapeRun to 'running' at start", async () => {
    const job = createMockJob({});
    await processScrapeJob(job as any);

    expect(mockScrapeRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: { status: "running" },
      })
    );
  });

  it("calls both scrapers and saves results", async () => {
    const indeedJobs = [
      {
        externalUrl: "https://indeed.com/job/1",
        platform: "indeed",
        title: "Software Intern",
        company: "Acme",
        location: "Remote",
        datePosted: null,
        descriptionHtml: "<p>Job</p>",
        descriptionText: "Job",
        salary: null,
        metadata: {},
      },
    ];
    const greenhouseJobs = [
      {
        externalUrl: "https://greenhouse.io/job/2",
        platform: "greenhouse",
        title: "Engineering Intern",
        company: "TechCo",
        location: "NYC",
        datePosted: null,
        descriptionHtml: "<p>Role</p>",
        descriptionText: "Role",
        salary: null,
        metadata: {},
      },
    ];

    mockIndeedDiscover.mockResolvedValue(indeedJobs);
    mockGreenhouseDiscover.mockResolvedValue(greenhouseJobs);

    const job = createMockJob({});
    await processScrapeJob(job as any);

    expect(mockIndeedDiscover).toHaveBeenCalledOnce();
    expect(mockGreenhouseDiscover).toHaveBeenCalledOnce();
    expect(mockFilterNewJobs).toHaveBeenCalledWith("user-1", [...indeedJobs, ...greenhouseJobs]);
    expect(mockJobListingCreate).toHaveBeenCalledTimes(2);
  });

  it("updates ScrapeRun to 'completed' with correct jobsFound count", async () => {
    const fakeJobs = [
      {
        externalUrl: "https://indeed.com/job/1",
        platform: "indeed",
        title: "Intern",
        company: "Co",
        location: null,
        datePosted: null,
        descriptionHtml: null,
        descriptionText: null,
        salary: null,
        metadata: {},
      },
    ];
    mockIndeedDiscover.mockResolvedValue(fakeJobs);

    const job = createMockJob({});
    await processScrapeJob(job as any);

    // The last update should be the completion update
    const calls = mockScrapeRunUpdate.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.data.status).toBe("completed");
    expect(lastCall.data.jobsFound).toBe(1);
    expect(lastCall.data.completedAt).toBeInstanceOf(Date);
    expect(typeof lastCall.data.duration).toBe("number");
  });

  it("continues with other scraper when one fails (partial-safe)", async () => {
    mockIndeedDiscover.mockRejectedValue(new Error("Indeed blocked"));
    const greenhouseJobs = [
      {
        externalUrl: "https://greenhouse.io/job/3",
        platform: "greenhouse",
        title: "Intern",
        company: "Co",
        location: null,
        datePosted: null,
        descriptionHtml: null,
        descriptionText: null,
        salary: null,
        metadata: {},
      },
    ];
    mockGreenhouseDiscover.mockResolvedValue(greenhouseJobs);

    const job = createMockJob({});
    await processScrapeJob(job as any);

    // Greenhouse jobs should still be saved
    expect(mockJobListingCreate).toHaveBeenCalledTimes(1);
    // Status should reflect partial errors
    const calls = mockScrapeRunUpdate.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.data.status).toBe("completed_with_errors");
    expect(lastCall.data.errors).toEqual({ indeed: "Indeed blocked" });
  });

  it("marks ScrapeRun as completed_with_errors when all scrapers fail but processor succeeds", async () => {
    mockIndeedDiscover.mockRejectedValue(new Error("Indeed down"));
    mockGreenhouseDiscover.mockRejectedValue(new Error("Greenhouse down"));

    const job = createMockJob({});
    await processScrapeJob(job as any);

    const calls = mockScrapeRunUpdate.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.data.status).toBe("completed_with_errors");
    expect(lastCall.data.errors).toEqual({
      indeed: "Indeed down",
      greenhouse: "Greenhouse down",
    });
    expect(lastCall.data.jobsFound).toBe(0);
  });
});
