import { prisma } from "@/lib/prisma";
import { decrypt, getEncryptionKey } from "@/lib/crypto";
import { createStealthBrowser, randomDelay } from "./stealth";
import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import type { Page } from "rebrowser-playwright";

const MAX_PAGES = 10;
const SSO_TIMEOUT = 60_000;

export class HandshakeScraper implements ScraperAdapter {
  platform = "handshake";
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    // Load encrypted credentials
    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId: this.userId,
          key: "handshake_credentials",
        },
      },
    });

    if (!setting) {
      console.warn(
        `[HandshakeScraper] No credentials stored for user ${this.userId}`
      );
      return [];
    }

    // Decrypt credentials
    const key = getEncryptionKey();
    const creds = JSON.parse(decrypt(setting.value, key)) as {
      university: string;
      email: string;
      password: string;
    };

    return this.loginAndSearch(creds, params);
  }

  private async loginAndSearch(
    creds: { university: string; email: string; password: string },
    params: SearchParams
  ): Promise<DiscoveredJob[]> {
    const { browser, context } = await createStealthBrowser();

    try {
      const page = await context.newPage();

      // Navigate to Handshake login
      await page.goto("https://app.joinhandshake.com/login", {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await randomDelay(1000, 2000);

      // Enter university name in school search
      await page.fill(
        'input[aria-label="Search for your school"], input[name="school"], input[placeholder*="school"], input[type="text"]',
        creds.university
      );
      await randomDelay(1000, 2000);

      // Select from dropdown
      const schoolOption = page.locator(
        `[role="option"], [role="listbox"] li, .school-result, .autocomplete-result`
      );
      if ((await schoolOption.count()) > 0) {
        await schoolOption.first().click();
        await randomDelay(500, 1000);
      }

      // Click continue/next button
      const continueBtn = page.locator(
        'button:has-text("Continue"), button:has-text("Next"), button[type="submit"]'
      );
      if ((await continueBtn.count()) > 0) {
        await continueBtn.first().click();
      }
      await randomDelay(2000, 4000);

      // Handle SSO login -- detect common providers
      await this.handleSSOLogin(page, creds);

      // Wait for redirect back to Handshake
      try {
        await page.waitForURL("**/app.joinhandshake.com/**", {
          timeout: SSO_TIMEOUT,
        });
      } catch {
        console.warn("[HandshakeScraper] SSO redirect timeout, checking URL...");
        if (!page.url().includes("app.joinhandshake.com")) {
          console.error("[HandshakeScraper] SSO login failed -- not redirected to Handshake");
          return [];
        }
      }

      await randomDelay(2000, 3000);

      // Navigate to internship search with filters
      const searchUrl = new URL(
        "https://app.joinhandshake.com/postings"
      );
      searchUrl.searchParams.set("category", "Internship");
      searchUrl.searchParams.set("page", "1");

      // Add location filter if specified
      if (params.locations.length > 0) {
        searchUrl.searchParams.set("location", params.locations[0]);
      }

      // Add keyword search
      if (params.keywords.length > 0) {
        searchUrl.searchParams.set("query", params.keywords.join(" "));
      }

      await page.goto(searchUrl.toString(), {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await randomDelay(2000, 4000);

      // Extract jobs from search results
      const jobs: DiscoveredJob[] = [];
      let currentPage = 1;

      while (currentPage <= MAX_PAGES) {
        const pageJobs = await this.extractJobsFromPage(page);
        jobs.push(...pageJobs);

        // Check for next page
        const nextButton = page.locator(
          'a[aria-label="Next"], button[aria-label="Next page"], a:has-text("Next"), [class*="next"]'
        );

        if (
          currentPage >= MAX_PAGES ||
          (await nextButton.count()) === 0
        ) {
          break;
        }

        await nextButton.first().click();
        await randomDelay(2000, 4000);
        await page.waitForLoadState("domcontentloaded");
        currentPage++;
      }

      return jobs;
    } catch (error) {
      console.error("[HandshakeScraper] Error during scraping:", error);
      return [];
    } finally {
      await browser.close();
    }
  }

  private async handleSSOLogin(
    page: Page,
    creds: { email: string; password: string }
  ): Promise<void> {
    const currentUrl = page.url();

    // Detect and handle common SSO providers
    if (currentUrl.includes("okta.com") || currentUrl.includes("okta")) {
      // Okta SSO
      await page.fill(
        'input[name="identifier"], input[name="username"], #okta-signin-username',
        creds.email
      );
      await page.fill(
        'input[name="credentials.passcode"], input[name="password"], #okta-signin-password',
        creds.password
      );
      await randomDelay(500, 1000);
      const oktaSubmit = page.locator(
        'input[type="submit"], button[type="submit"], #okta-signin-submit'
      );
      if ((await oktaSubmit.count()) > 0) {
        await oktaSubmit.first().click();
      }
    } else if (currentUrl.includes("/cas/") || currentUrl.includes("cas.")) {
      // CAS SSO
      await page.fill(
        'input[name="username"], #username',
        creds.email
      );
      await page.fill(
        'input[name="password"], #password',
        creds.password
      );
      await randomDelay(500, 1000);
      const casSubmit = page.locator(
        'input[type="submit"], button[type="submit"], .btn-submit'
      );
      if ((await casSubmit.count()) > 0) {
        await casSubmit.first().click();
      }
    } else {
      // Generic SSO -- look for common input patterns
      const emailInput = page.locator(
        'input[type="email"], input[name="email"], input[name="username"], input[name="loginfmt"], input[id*="email"], input[id*="user"]'
      );
      const passwordInput = page.locator(
        'input[type="password"], input[name="password"], input[name="passwd"]'
      );

      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill(creds.email);
      }
      await randomDelay(500, 1000);

      if ((await passwordInput.count()) > 0) {
        await passwordInput.first().fill(creds.password);
      }
      await randomDelay(500, 1000);

      const submitBtn = page.locator(
        'button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in")'
      );
      if ((await submitBtn.count()) > 0) {
        await submitBtn.first().click();
      }
    }

    // Wait for potential MFA/Duo prompt -- give user time to complete
    await randomDelay(3000, 5000);

    // Check for Duo iframe or MFA prompt
    const duoFrame = page.locator(
      'iframe[id="duo_iframe"], iframe[src*="duosecurity"], [class*="duo"], [id*="mfa"]'
    );
    if ((await duoFrame.count()) > 0) {
      console.warn(
        "[HandshakeScraper] MFA/Duo prompt detected -- waiting up to 60s for manual completion"
      );
      try {
        await page.waitForURL("**/app.joinhandshake.com/**", {
          timeout: SSO_TIMEOUT,
        });
      } catch {
        // MFA timeout -- will be caught by outer handler
      }
    }
  }

  private async extractJobsFromPage(page: Page): Promise<DiscoveredJob[]> {
    return page.evaluate(() => {
      const jobs: Array<{
        externalUrl: string;
        platform: string;
        title: string;
        company: string;
        location: string | null;
        datePosted: Date | null;
        descriptionHtml: string | null;
        descriptionText: string | null;
        salary: string | null;
        metadata: Record<string, unknown>;
      }> = [];

      // Handshake job cards typically appear in a list
      const jobCards = document.querySelectorAll(
        '[data-hook="jobs-card"], [class*="job-card"], [class*="posting-card"], a[href*="/postings/"], [role="listitem"]'
      );

      for (const card of jobCards) {
        const linkEl =
          card.querySelector("a[href*='/postings/']") ||
          (card.tagName === "A" ? card : null);
        const href = linkEl?.getAttribute("href");
        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://app.joinhandshake.com${href}`;

        const titleEl = card.querySelector(
          '[class*="title"], [data-hook="job-title"], h3, h4, [role="heading"]'
        );
        const companyEl = card.querySelector(
          '[class*="company"], [data-hook="company-name"], [class*="employer"]'
        );
        const locationEl = card.querySelector(
          '[class*="location"], [data-hook="job-location"]'
        );
        const dateEl = card.querySelector(
          '[class*="date"], [data-hook="posted-date"], time'
        );

        const title = titleEl?.textContent?.trim() ?? "";
        const company = companyEl?.textContent?.trim() ?? "";

        if (!title) continue;

        jobs.push({
          externalUrl: url,
          platform: "handshake",
          title,
          company,
          location: locationEl?.textContent?.trim() ?? null,
          datePosted: dateEl?.getAttribute("datetime")
            ? new Date(dateEl.getAttribute("datetime")!)
            : null,
          descriptionHtml: null,
          descriptionText: null,
          salary: null,
          metadata: { source: "handshake-search" },
        });
      }

      return jobs;
    });
  }
}
