import { chromium } from "rebrowser-playwright";
import { getRandomUserAgent } from "@/lib/scrapers/stealth";

/**
 * Creates a stealth browser in headless mode for auto-apply.
 * Uses "new" headless mode which fully renders pages (needed for screenshots).
 * The scraper's createStealthBrowser uses headless:false which requires a display.
 */
export async function createApplyBrowser() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromium.executablePath(),
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-size=1920,1080",
    ],
  });

  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    permissions: ["geolocation"],
    geolocation: { latitude: 40.7128, longitude: -74.006 },
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    (window as any).chrome = { runtime: {}, loadTimes: () => ({}) };
  });

  return { browser, context };
}
