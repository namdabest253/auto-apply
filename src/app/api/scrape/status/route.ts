import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  let scrapeRun;

  if (runId) {
    // Fetch specific run (verify ownership)
    scrapeRun = await prisma.scrapeRun.findFirst({
      where: { id: runId, userId },
    });
  } else {
    // Fetch most recent run for user
    scrapeRun = await prisma.scrapeRun.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
    });
  }

  if (!scrapeRun) {
    return NextResponse.json({ error: "No scrape run found" }, { status: 404 });
  }

  return NextResponse.json({
    id: scrapeRun.id,
    status: scrapeRun.status,
    platforms: scrapeRun.platforms,
    jobsFound: scrapeRun.jobsFound,
    errors: scrapeRun.errors,
    startedAt: scrapeRun.startedAt,
    completedAt: scrapeRun.completedAt,
    duration: scrapeRun.duration,
  });
}
