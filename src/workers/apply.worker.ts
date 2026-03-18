import "dotenv/config";
import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "./queue";
import { prisma } from "@/lib/prisma";
import { createApplyBrowser } from "@/lib/auto-apply/browser";
import { extractInteractiveElements } from "@/lib/auto-apply/dom-utils";
import { getNextAction } from "@/lib/auto-apply/claude-agent";
import { executeAction } from "@/lib/auto-apply/form-filler";
import type { ApplyJobData, StepLog, AgentAction } from "@/lib/auto-apply/types";
import * as fs from "fs";
import * as path from "path";

const MAX_STEPS = 50;
const DEBUG_DIR = path.join(process.cwd(), "tmp", "apply-debug");

async function processApplyJob(job: Job<ApplyJobData>): Promise<void> {
  const { applicationRunId, jobListingId, externalUrl, profile } = job.data;

  // Create debug directory for this run
  const runDebugDir = path.join(DEBUG_DIR, applicationRunId);
  fs.mkdirSync(runDebugDir, { recursive: true });
  console.log(`[apply-worker] Debug output: ${runDebugDir}`);

  // Update status to running
  await prisma.applicationRun.update({
    where: { id: applicationRunId },
    data: { status: "running" },
  });
  await prisma.jobListing.update({
    where: { id: jobListingId },
    data: { autoApplyStatus: "running" },
  });

  const steps: StepLog[] = [];
  let finalStatus: string = "failed";
  let errorMessage: string | undefined;

  const { browser, context } = await createApplyBrowser();

  try {
    let page = await context.newPage();
    await page.goto(externalUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Wait for network to settle
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    // Wait for body to have actual content (JS-rendered pages)
    await page.waitForFunction(
      () => document.body && document.body.innerText.trim().length > 50,
      { timeout: 15000 }
    ).catch(() => {});
    // Extra settle time for late-loading JS frameworks
    await page.waitForTimeout(2000);

    for (let step = 1; step <= MAX_STEPS; step++) {
      // Switch to newest page if a new tab/popup was opened
      const allPages = context.pages();
      if (allPages.length > 1) {
        const newest = allPages[allPages.length - 1];
        if (newest !== page) {
          console.log("[apply-worker] New tab detected, switching to it");
          page = newest;
          await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
          await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
          // Close old tabs
          for (const p of allPages) {
            if (p !== page) {
              await p.close().catch(() => {});
            }
          }
        }
      }
      // Check if cancelled
      const currentRun = await prisma.applicationRun.findUnique({
        where: { id: applicationRunId },
        select: { status: true },
      });
      if (currentRun?.status === "failed") {
        finalStatus = "failed";
        errorMessage = "Cancelled by user";
        break;
      }

      // Take screenshot
      const screenshot = await page.screenshot({
        type: "png",
        fullPage: true,
      });

      // Extract interactive DOM elements (including iframes)
      const { elements: domElements, selectorFrameMap } = await extractInteractiveElements(page);

      // Get current URL
      const currentUrl = page.url();

      // Save debug info for this step
      try {
        fs.writeFileSync(path.join(runDebugDir, `step-${String(step).padStart(2, "0")}.png`), screenshot);
        fs.writeFileSync(path.join(runDebugDir, `step-${String(step).padStart(2, "0")}-dom.json`), JSON.stringify({
          url: currentUrl,
          elementCount: domElements.length,
          elements: domElements,
        }, null, 2));
      } catch {}

      // Detect loops: if the last N actions repeat the same pattern, we're stuck
      if (steps.length >= 4) {
        const recent = steps.slice(-4);
        const actions = recent.map((s) => `${s.action.action}:${s.action.selector}`);
        const unique = new Set(actions);
        if (unique.size <= 2) {
          console.warn("[apply-worker] Loop detected — same actions repeating");
          // Try scrolling down to find a submit button
          try {
            await page.evaluate("window.scrollBy(0, 500)");
            await page.waitForTimeout(500);
          } catch {}

          // If we've been looping for 6+ steps, bail out
          if (steps.length >= 6) {
            const last6 = steps.slice(-6).map((s) => `${s.action.action}:${s.action.selector}`);
            const unique8 = new Set(last6);
            if (unique8.size <= 3) {
              steps.push({
                step,
                action: { action: "needs_review" as const, selector: null, value: null, ms: null, description: null, reason: "Agent stuck in a loop repeating the same actions" },
                result: "error",
                timestamp: new Date().toISOString(),
              });
              finalStatus = "needs_review";
              errorMessage = "Agent stuck in a loop — needs manual intervention";
              break;
            }
          }
        }
      }

      // Ask the model what to do next
      let action: AgentAction;
      try {
        action = await getNextAction(
          screenshot,
          domElements,
          currentUrl,
          profile,
          steps
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        steps.push({
          step,
          action: { action: "needs_review" as const, selector: null, value: null, ms: null, description: null, reason: `Claude error: ${msg}` },
          result: "error",
          error: msg,
          timestamp: new Date().toISOString(),
        });
        errorMessage = `Claude agent error at step ${step}: ${msg}`;
        finalStatus = "failed";
        break;
      }

      // Validate selector exists in the extracted DOM (prevent hallucinated selectors)
      if (action.selector && action.action !== "done" && action.action !== "needs_review" && action.action !== "wait") {
        const knownSelectors = new Set(domElements.map((el) => el.selector));
        if (!knownSelectors.has(action.selector)) {
          console.warn(`[apply-worker] Step ${step}: Agent hallucinated selector "${action.selector}" — not in DOM`);
          // Find closest match by text similarity or just skip
          steps.push({
            step,
            action,
            result: "error",
            error: `Selector not found in DOM: ${action.selector}`,
            timestamp: new Date().toISOString(),
          });
          // Persist and continue — the agent will see the error in history
          await prisma.applicationRun.update({
            where: { id: applicationRunId },
            data: { steps: JSON.parse(JSON.stringify(steps)) },
          });
          continue;
        }
      }

      // Log action to console and save debug
      const desc = action.description || action.reason || "";
      const val = action.value ? ` → "${action.value}"` : "";
      console.log(`[apply-worker] Step ${step}: ${action.action}${val} (${desc})`);
      try {
        fs.writeFileSync(path.join(runDebugDir, `step-${String(step).padStart(2, "0")}-action.json`), JSON.stringify(action, null, 2));
      } catch {}

      // Execute the action
      let result: "success" | "error" = "success";
      let stepError: string | undefined;

      try {
        // Resolve which frame the target element lives in
        const targetFrame = action.selector ? selectorFrameMap.get(action.selector) : undefined;
        await executeAction(page, action, profile.resumeFilePath, targetFrame || page);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // If page/context was closed, a new tab likely opened — switch to it
        if (msg.includes("has been closed") || msg.includes("Target closed")) {
          const allPages = context.pages();
          if (allPages.length > 0) {
            page = allPages[allPages.length - 1];
            console.log("[apply-worker] Page closed after click, switched to new page:", page.url());
            await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
            // Not actually an error — the click worked, it just navigated
            result = "success";
          } else {
            result = "error";
            stepError = msg;
          }
        } else {
          result = "error";
          stepError = msg;
          console.error(`[apply-worker] Step ${step} error:`, stepError);
        }
      }

      steps.push({
        step,
        action,
        result,
        error: stepError,
        timestamp: new Date().toISOString(),
      });

      // Persist steps incrementally
      await prisma.applicationRun.update({
        where: { id: applicationRunId },
        data: { steps: JSON.parse(JSON.stringify(steps)) },
      });

      // Check terminal actions
      if (action.action === "done") {
        finalStatus = "succeeded";
        break;
      }
      if (action.action === "needs_review") {
        finalStatus = "needs_review";
        errorMessage = action.reason ?? undefined;
        break;
      }

      // If action execution failed, continue trying (Claude will see the state)
      if (result === "error") {
        console.warn(
          `[apply-worker] Step ${step} action failed: ${stepError}`
        );
        // After 3 consecutive errors, bail
        const recentErrors = steps.slice(-3);
        if (
          recentErrors.length === 3 &&
          recentErrors.every((s) => s.result === "error")
        ) {
          finalStatus = "failed";
          errorMessage = "Too many consecutive action failures";
          break;
        }
      }

      // If we hit max steps without completing
      if (step === MAX_STEPS) {
        finalStatus = "needs_review";
        errorMessage = "Reached maximum steps without completing application";
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    finalStatus = "failed";
    console.error(`[apply-worker] Fatal error:`, errorMessage);
  } finally {
    await browser.close().catch(() => {});
  }

  // Update ApplicationRun final status
  await prisma.applicationRun.update({
    where: { id: applicationRunId },
    data: {
      status: finalStatus,
      steps: JSON.parse(JSON.stringify(steps)),
      errorMessage,
      completedAt: new Date(),
    },
  });

  // Update JobListing
  const jobUpdate: Record<string, unknown> = {
    autoApplyStatus: finalStatus,
  };
  if (finalStatus === "succeeded") {
    jobUpdate.appliedAt = new Date();
  }
  await prisma.jobListing.update({
    where: { id: jobListingId },
    data: jobUpdate,
  });
}

// Create worker
const connection = getRedisConnectionOptions();

const worker = new Worker<ApplyJobData>("auto-apply", processApplyJob, {
  connection,
  concurrency: 1,
  settings: {
    backoffStrategy: () => 60000, // Fixed 60s backoff
  },
});

worker.on("completed", (job) => {
  console.log(`[apply-worker] Job ${job.id} completed`);
});

worker.on("failed", async (job, err) => {
  console.error(`[apply-worker] Job ${job?.id} failed:`, err.message);

  if (job && job.attemptsMade >= (job.opts?.attempts ?? 1)) {
    try {
      await prisma.applicationRun.update({
        where: { id: job.data.applicationRunId },
        data: {
          status: "failed",
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });
      await prisma.jobListing.update({
        where: { id: job.data.jobListingId },
        data: { autoApplyStatus: "failed" },
      });
    } catch (dbErr) {
      console.error("[apply-worker] Failed to update status:", dbErr);
    }
  }
});

console.log("[apply-worker] Worker started, waiting for jobs...");

export { worker, processApplyJob };
