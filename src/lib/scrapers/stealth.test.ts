import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock rebrowser-playwright before imports
vi.mock("rebrowser-playwright", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

import { createStealthBrowser, randomDelay, getRandomUserAgent } from "./stealth";
import { chromium } from "rebrowser-playwright";
import { GREENHOUSE_COMPANIES } from "./constants";

describe("stealth browser config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createStealthBrowser", () => {
    it("launches browser with anti-fingerprinting args and returns browser + context", async () => {
      const mockContext = { close: vi.fn() };
      const mockBrowser = {
        newContext: vi.fn().mockResolvedValue(mockContext),
        close: vi.fn(),
      };
      vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);

      const result = await createStealthBrowser();

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining([
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
          ]),
        })
      );

      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          viewport: { width: 1920, height: 1080 },
          locale: "en-US",
          timezoneId: "America/New_York",
        })
      );

      // Verify userAgent was passed (any string)
      const contextArgs = mockBrowser.newContext.mock.calls[0][0];
      expect(contextArgs.userAgent).toBeDefined();
      expect(typeof contextArgs.userAgent).toBe("string");

      expect(result.browser).toBe(mockBrowser);
      expect(result.context).toBe(mockContext);
    });
  });

  describe("randomDelay", () => {
    it("waits between min and max milliseconds", async () => {
      const start = Date.now();
      await randomDelay(50, 100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // small buffer for timer precision
      expect(elapsed).toBeLessThan(200);
    });

    it("uses default values when no args provided", async () => {
      // Just verify it returns a promise (don't wait for 2-5s)
      const promise = randomDelay();
      expect(promise).toBeInstanceOf(Promise);
      // Cancel by resolving quickly - the function itself uses setTimeout
    });
  });

  describe("getRandomUserAgent", () => {
    it("returns a string containing Mozilla", () => {
      const ua = getRandomUserAgent();
      expect(typeof ua).toBe("string");
      expect(ua).toContain("Mozilla");
    });

    it("returns different agents across multiple calls (randomized)", () => {
      const agents = new Set<string>();
      for (let i = 0; i < 50; i++) {
        agents.add(getRandomUserAgent());
      }
      // Should have at least 2 different agents from 50 calls
      expect(agents.size).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("GREENHOUSE_COMPANIES", () => {
  it("has at least 10 entries with slug and name fields", () => {
    expect(GREENHOUSE_COMPANIES.length).toBeGreaterThanOrEqual(10);

    for (const company of GREENHOUSE_COMPANIES) {
      expect(company).toHaveProperty("slug");
      expect(company).toHaveProperty("name");
      expect(typeof company.slug).toBe("string");
      expect(typeof company.name).toBe("string");
      expect(company.slug.length).toBeGreaterThan(0);
      expect(company.name.length).toBeGreaterThan(0);
    }
  });
});
