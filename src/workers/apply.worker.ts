import "dotenv/config";
import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "./queue";
import { prisma } from "@/lib/prisma";
import { createStealthBrowser } from "@/lib/scrapers/stealth";
import { extractInteractiveElements } from "@/lib/auto-apply/dom-utils";
import { getNextAction } from "@/lib/auto-apply/claude-agent";
import { executeAction } from "@/lib/auto-apply/form-filler";
import type { ApplyJobData, StepLog, AgentAction } from "@/lib/auto-apply/types";

const MAX_STEPS = 20;

async function processApplyJob(job: Job<ApplyJobData>): Promise<void> {
  const { applicationRunId, jobListingId, externalUrl, profile } = job.data;

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

  const { browser, context } = await createStealthBrowser();

  try {
    const page = await context.newPage();
    await page.goto(externalUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    for (let step = 1; step <= MAX_STEPS; step++) {
      // Take screenshot
      const screenshot = await page.screenshot({
        type: "png",
        fullPage: true,
      });

      // Extract interactive DOM elements
      const domElements = await extractInteractiveElements(page);

      // Get current URL (may have redirected)
      const currentUrl = page.url();

      // Ask Claude what to do next
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
          action: { action: "needs_review", reason: `Claude error: ${msg}` },
          result: "error",
          error: msg,
          timestamp: new Date().toISOString(),
        });
        errorMessage = `Claude agent error at step ${step}: ${msg}`;
        finalStatus = "failed";
        break;
      }

      // Execute the action
      let result: "success" | "error" = "success";
      let stepError: string | undefined;

      try {
        await executeAction(page, action, profile.resumeFilePath);
      } catch (err) {
        result = "error";
        stepError = err instanceof Error ? err.message : String(err);
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
        errorMessage = action.reason;
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
