import { NextResponse } from "next/server";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { jobPreferences: true },
  });

  const prefs = profile?.jobPreferences;
  const keywords = prefs?.keywords?.length ? prefs.keywords.join(", ") : "software engineering";
  const locations = prefs?.locations?.length ? prefs.locations.join(", ") : "United States";
  const roleTypes = prefs?.roleTypes?.length ? prefs.roleTypes.join(", ") : "internship";

  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      userId,
      status: "running",
      platforms: ["ai-discovery"],
      startedAt: new Date(),
    },
  });

  const runId = scrapeRun.id;

  // Read the find-internships agent command as the base prompt
  const agentPath = join(process.cwd(), ".claude", "commands", "find-internships.md");
  const agentPrompt = readFileSync(agentPath, "utf-8");

  // Prepend dynamic context (user preferences + run ID) to the agent prompt
  const prompt = [
    "## Session Context",
    "",
    `**Run ID:** ${runId}`,
    `**Keywords:** ${keywords}`,
    `**Locations:** ${locations}`,
    `**Role Types:** ${roleTypes}`,
    "",
    "IMPORTANT: When inserting jobs, always pass the run ID flag:",
    `\`npx tsx src/scripts/insert-jobs.ts --run-id ${runId} \"$(cat /tmp/discovered-jobs.json)\"\``,
    "",
    "When done, just exit successfully. The launcher script handles marking the run complete.",
    "",
    "---",
    "",
    agentPrompt,
  ].join("\n");

  // Write prompt and trigger file for the watcher process to pick up.
  // Use project-local directory to avoid Bun snap /tmp isolation.
  const discoverDir = join(process.cwd(), ".discover");
  const promptPath = join(discoverDir, `prompt-${runId}.txt`);
  const triggerDir = join(discoverDir, "trigger");

  mkdirSync(triggerDir, { recursive: true });
  writeFileSync(promptPath, prompt);
  writeFileSync(`${triggerDir}/${runId}.trigger`, `${runId}\n${promptPath}\n`);

  return NextResponse.json({ runId });
}
