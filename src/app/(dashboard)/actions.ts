"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { scrapeQueue } from "@/workers/queue"
import { GREENHOUSE_COMPANIES } from "@/lib/scrapers/constants"

export interface JobWithStale {
  id: string
  userId: string
  externalUrl: string
  platform: string
  title: string
  company: string
  location: string | null
  datePosted: Date | null
  descriptionHtml: string | null
  descriptionText: string | null
  salary: string | null
  metadata: unknown
  isStale: boolean
  scrapeRunId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface GreenhouseCompanyEntry {
  slug: string
  name: string
  type: "curated" | "custom"
}

async function getAuthUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session.user.id
}

export async function triggerScrape(): Promise<{ runId?: string; error?: string }> {
  const userId = await getAuthUserId()

  // Get user's job preferences via profile
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { jobPreferences: true },
  })

  if (!profile?.jobPreferences) {
    return { error: "Set job preferences first" }
  }

  const { keywords, locations, roleTypes } = profile.jobPreferences

  // Create ScrapeRun record
  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      userId,
      status: "pending",
      platforms: ["indeed", "greenhouse"],
    },
  })

  // Add job to queue
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
  )

  return { runId: scrapeRun.id }
}

export async function getJobs(
  options?: { includeStale?: boolean }
): Promise<JobWithStale[]> {
  const userId = await getAuthUserId()
  const includeStale = options?.includeStale ?? false
  const staleThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const where: Record<string, unknown> = { userId }

  if (!includeStale) {
    where.OR = [
      { datePosted: null },
      { datePosted: { gte: staleThreshold } },
    ]
  }

  const jobs = await prisma.jobListing.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  return jobs.map((job) => ({
    ...job,
    isStale: job.datePosted ? job.datePosted < staleThreshold : false,
  }))
}

export async function getLatestScrapeRun() {
  const userId = await getAuthUserId()

  return prisma.scrapeRun.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
  })
}

export async function getGreenhouseCompanies(): Promise<GreenhouseCompanyEntry[]> {
  const userId = await getAuthUserId()

  // Get user's custom companies from UserSetting
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: "greenhouse_custom_boards" } },
  })

  const customCompanies: Array<{ slug: string; name: string }> = setting?.value
    ? (JSON.parse(setting.value as string) as Array<{ slug: string; name: string }>)
    : []

  const curated: GreenhouseCompanyEntry[] = GREENHOUSE_COMPANIES.map((c) => ({
    ...c,
    type: "curated" as const,
  }))

  const custom: GreenhouseCompanyEntry[] = customCompanies.map((c) => ({
    ...c,
    type: "custom" as const,
  }))

  return [...curated, ...custom]
}

export async function addGreenhouseCompany(
  slug: string,
  name: string
): Promise<GreenhouseCompanyEntry[]> {
  const userId = await getAuthUserId()

  // Validate slug
  const trimmedSlug = slug.trim().toLowerCase()
  const trimmedName = name.trim()
  if (!trimmedSlug || !/^[a-z0-9-]+$/.test(trimmedSlug)) {
    throw new Error("Invalid slug: must be URL-safe (lowercase letters, numbers, hyphens)")
  }
  if (!trimmedName) {
    throw new Error("Company name is required")
  }

  // Get existing custom companies
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: "greenhouse_custom_boards" } },
  })

  const customCompanies: Array<{ slug: string; name: string }> = setting?.value
    ? (JSON.parse(setting.value as string) as Array<{ slug: string; name: string }>)
    : []

  // Check for duplicates
  const exists = customCompanies.some((c) => c.slug === trimmedSlug)
    || GREENHOUSE_COMPANIES.some((c) => c.slug === trimmedSlug)
  if (exists) {
    throw new Error("Company with this slug already exists")
  }

  customCompanies.push({ slug: trimmedSlug, name: trimmedName })

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: "greenhouse_custom_boards" } },
    create: { userId, key: "greenhouse_custom_boards", value: JSON.stringify(customCompanies) },
    update: { value: JSON.stringify(customCompanies) },
  })

  return getGreenhouseCompanies()
}

export async function removeGreenhouseCompany(
  slug: string
): Promise<GreenhouseCompanyEntry[]> {
  const userId = await getAuthUserId()

  // Cannot remove curated entries
  if (GREENHOUSE_COMPANIES.some((c) => c.slug === slug)) {
    throw new Error("Cannot remove built-in company")
  }

  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: "greenhouse_custom_boards" } },
  })

  const customCompanies: Array<{ slug: string; name: string }> = setting?.value
    ? (JSON.parse(setting.value as string) as Array<{ slug: string; name: string }>)
    : []

  const filtered = customCompanies.filter((c) => c.slug !== slug)

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: "greenhouse_custom_boards" } },
    create: { userId, key: "greenhouse_custom_boards", value: JSON.stringify(filtered) },
    update: { value: JSON.stringify(filtered) },
  })

  return getGreenhouseCompanies()
}
