import type { Page, Frame, Locator } from "rebrowser-playwright";
import type { AgentAction } from "./types";

type ActionTarget = Page | Frame;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Small random pause to avoid looking fully scripted. */
function humanDelay(): Promise<void> {
  return delay(200 + Math.random() * 300);
}

async function dismissOverlays(target: ActionTarget): Promise<void> {
  await target.evaluate(`(() => {
    const dismissSelectors = [
      '[data-automation-id="legalNoticeAcceptButton"]',
      '[id="onetrust-accept-btn-handler"]',
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      '[data-dismiss="modal"]',
      '.cookie-consent-accept',
      '.modal-close',
      'button.close',
    ];
    for (const sel of dismissSelectors) {
      const el = document.querySelector(sel);
      if (el) { el.click(); return; }
    }
    document.querySelectorAll('[data-behavior-click-outside-close]').forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'absolute') {
        el.remove();
      }
    });
  })()`);
  await delay(300);
}

async function resilientClick(locator: Locator, target: ActionTarget, timeout = 8000): Promise<void> {
  try {
    await locator.click({ timeout });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("intercepts pointer events") || msg.includes("Timeout")) {
      await dismissOverlays(target);
      try {
        await locator.click({ timeout: 3000, force: true });
      } catch {
        await locator.evaluate((el: HTMLElement) => el.click());
      }
    } else {
      throw err;
    }
  }
}

export async function executeAction(
  page: Page,
  action: AgentAction,
  resumePath?: string | null,
  actionTarget?: ActionTarget
): Promise<void> {
  const target = actionTarget || page;
  const sel = action.selector;

  switch (action.action) {
    case "click": {
      if (!sel) throw new Error("click action missing selector");
      await humanDelay();
      await resilientClick(target.locator(sel), target);
      await delay(300);
      break;
    }
    case "fill": {
      if (!sel) throw new Error("fill action missing selector");
      if (!action.value) throw new Error("fill action missing value");
      await humanDelay();
      const locator = target.locator(sel);
      await resilientClick(locator, target);
      await locator.fill(action.value);
      await delay(200);
      break;
    }
    case "select": {
      if (!sel) throw new Error("select action missing selector");
      if (!action.value) throw new Error("select action missing value");
      await humanDelay();
      await target.locator(sel).selectOption(action.value, { timeout: 8000 });
      await delay(200);
      break;
    }
    case "upload_file": {
      if (!sel) throw new Error("upload_file action missing selector");
      if (!resumePath) throw new Error("No resume file path available for upload");
      await humanDelay();
      const uploadEl = target.locator(sel);
      const tagName = await uploadEl.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === "input") {
        await uploadEl.setInputFiles(resumePath, { timeout: 10000 });
      } else {
        // Workday-style: button triggers a hidden file input.
        // Find the nearest hidden input[type="file"] and use that.
        const fileInput = await target.evaluateHandle((selector: string) => {
          const btn = document.querySelector(selector);
          if (!btn) return null;
          // Check siblings, parent's children, or nearby inputs
          const container = btn.closest("div") || btn.parentElement;
          if (container) {
            const input = container.querySelector('input[type="file"]');
            if (input) return input;
          }
          // Fallback: find any file input on the page
          return document.querySelector('input[type="file"]');
        }, sel);
        if (fileInput && fileInput.asElement()) {
          await (fileInput.asElement() as any).setInputFiles(resumePath);
        } else {
          // Last resort: click the button to open dialog, then intercept
          await page.setInputFiles('input[type="file"]', resumePath).catch(async () => {
            const [fileChooser] = await Promise.all([
              page.waitForEvent("filechooser", { timeout: 5000 }),
              resilientClick(uploadEl, target),
            ]);
            await fileChooser.setFiles(resumePath);
          });
        }
      }
      await delay(1000);
      break;
    }
    case "submit": {
      if (!sel) throw new Error("submit action missing selector");
      await humanDelay();
      await resilientClick(target.locator(sel), target);
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await delay(1000);
      break;
    }
    case "wait": {
      await page.waitForTimeout(action.ms ?? 2000);
      break;
    }
    case "done":
    case "needs_review":
      break;
  }
}
