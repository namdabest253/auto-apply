import type { Page } from "rebrowser-playwright";
import type { AgentAction } from "./types";
import { randomDelay } from "@/lib/scrapers/stealth";

export async function executeAction(
  page: Page,
  action: AgentAction,
  resumePath?: string | null
): Promise<void> {
  switch (action.action) {
    case "click": {
      await randomDelay(500, 1500);
      await page.locator(action.selector).click({ timeout: 10000 });
      await randomDelay(1000, 2000);
      break;
    }
    case "fill": {
      await randomDelay(500, 1000);
      const locator = page.locator(action.selector);
      await locator.click({ timeout: 10000 });
      await locator.fill(""); // Clear first
      // Type character by character for human-like behavior
      await locator.pressSequentially(action.value, { delay: 30 + Math.random() * 50 });
      await randomDelay(500, 1500);
      break;
    }
    case "select": {
      await randomDelay(500, 1000);
      await page.locator(action.selector).selectOption(action.value, { timeout: 10000 });
      await randomDelay(500, 1500);
      break;
    }
    case "upload_file": {
      if (!resumePath) {
        throw new Error("No resume file path available for upload");
      }
      await randomDelay(500, 1000);
      await page.locator(action.selector).setInputFiles(resumePath, { timeout: 10000 });
      await randomDelay(1000, 2000);
      break;
    }
    case "submit": {
      await randomDelay(1000, 2000);
      await page.locator(action.selector).click({ timeout: 10000 });
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
        // networkidle may not fire on SPAs, that's ok
      });
      await randomDelay(2000, 4000);
      break;
    }
    case "wait": {
      await page.waitForTimeout(action.ms);
      break;
    }
    case "done":
    case "needs_review":
      // No browser action needed
      break;
  }
}
