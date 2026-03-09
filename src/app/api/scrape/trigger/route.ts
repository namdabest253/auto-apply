import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scrapeQueue } from "@/workers/queue";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get user's job preferences via profile
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { jobPreferences: true },
  });

  if (!profile?.jobPreferences) {
    return NextResponse.json(
      { error: "Set job preferences before discovering jobs" },
      { status: 400 }
    );
  }

  const { keywords, locations, roleTypes } = profile.jobPreferences;

  // Create ScrapeRun record
  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      userId,
      status: "pending",
      platforms: ["indeed", "greenhouse"],
    },
  });

  // Add job to queue with retry config
  await scrapeQueue.add(
    "scrape-run",
    {
      userId,
      runId: scrapeRun.id,
      searchParams: { keywords, locations, roleTypes },
    },
    {
      attempts: 4,
      backoff: { type: "custom" },
    }
  );

  return NextResponse.json({ runId: scrapeRun.id });
}
