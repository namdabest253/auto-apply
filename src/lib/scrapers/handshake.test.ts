import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSetting: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock crypto
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn(),
  getEncryptionKey: vi.fn(() => Buffer.alloc(32)),
}));

// Mock stealth browser
const mockPage = {
  goto: vi.fn(),
  waitForURL: vi.fn(),
  fill: vi.fn(),
  click: vi.fn(),
  waitForSelector: vi.fn(),
  locator: vi.fn(() => ({
    fill: vi.fn(),
    click: vi.fn(),
    first: vi.fn(() => ({ click: vi.fn() })),
    count: vi.fn(() => 0),
    nth: vi.fn(() => ({
      textContent: vi.fn(() => ""),
      getAttribute: vi.fn(() => ""),
      locator: vi.fn(() => ({
        textContent: vi.fn(() => ""),
        getAttribute: vi.fn(() => ""),
      })),
    })),
  })),
  url: vi.fn(() => "https://app.joinhandshake.com/postings"),
  $$: vi.fn(() => []),
  $: vi.fn(),
  evaluate: vi.fn(() => []),
  waitForLoadState: vi.fn(),
  content: vi.fn(() => ""),
};

const mockContext = {
  newPage: vi.fn(() => mockPage),
  close: vi.fn(),
};

const mockBrowser = {
  close: vi.fn(),
};

vi.mock("./stealth", () => ({
  createStealthBrowser: vi.fn(() =>
    Promise.resolve({ browser: mockBrowser, context: mockContext })
  ),
  randomDelay: vi.fn(() => Promise.resolve()),
  getRandomUserAgent: vi.fn(() => "test-agent"),
}));

describe("HandshakeScraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has platform='handshake'", async () => {
    const { HandshakeScraper } = await import("./handshake");
    const scraper = new HandshakeScraper("user-123");
    expect(scraper.platform).toBe("handshake");
  });

  it("constructor accepts userId", async () => {
    const { HandshakeScraper } = await import("./handshake");
    const scraper = new HandshakeScraper("user-456");
    expect(scraper).toBeDefined();
  });

  it("returns empty array when no credentials stored for userId", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.userSetting.findUnique).mockResolvedValue(null);

    const { HandshakeScraper } = await import("./handshake");
    const scraper = new HandshakeScraper("user-789");
    const results = await scraper.discover({
      keywords: ["software"],
      locations: ["New York"],
      roleTypes: ["Internship"],
    });
    expect(results).toEqual([]);
  });

  it("calls createStealthBrowser and navigates to Handshake login", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { decrypt } = await import("@/lib/crypto");
    const { createStealthBrowser } = await import("./stealth");

    vi.mocked(prisma.userSetting.findUnique).mockResolvedValue({
      id: "setting-1",
      userId: "user-123",
      key: "handshake_credentials",
      value: "encrypted-data",
    });
    vi.mocked(decrypt).mockReturnValue(
      JSON.stringify({
        university: "MIT",
        email: "test@mit.edu",
        password: "pass123",
      })
    );

    // Mock page.goto to simulate being redirected back to Handshake
    mockPage.url.mockReturnValue("https://app.joinhandshake.com/postings");
    mockPage.evaluate.mockResolvedValue([]);

    const { HandshakeScraper } = await import("./handshake");
    const scraper = new HandshakeScraper("user-123");
    await scraper.discover({
      keywords: ["software"],
      locations: ["New York"],
      roleTypes: ["Internship"],
    });

    expect(createStealthBrowser).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining("joinhandshake.com"),
      expect.any(Object)
    );
  });

  it("browser is always closed in finally block (even on error)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { decrypt } = await import("@/lib/crypto");

    vi.mocked(prisma.userSetting.findUnique).mockResolvedValue({
      id: "setting-1",
      userId: "user-123",
      key: "handshake_credentials",
      value: "encrypted-data",
    });
    vi.mocked(decrypt).mockReturnValue(
      JSON.stringify({
        university: "MIT",
        email: "test@mit.edu",
        password: "pass123",
      })
    );

    // Make page.goto throw an error
    mockPage.goto.mockRejectedValueOnce(new Error("Navigation failed"));

    const { HandshakeScraper } = await import("./handshake");
    const scraper = new HandshakeScraper("user-123");

    // Should not throw -- errors are caught internally
    const results = await scraper.discover({
      keywords: ["software"],
      locations: ["New York"],
      roleTypes: ["Internship"],
    });

    expect(results).toEqual([]);
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
