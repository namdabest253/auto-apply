"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GREENHOUSE_COMPANIES } from "@/lib/scrapers/constants"

export interface JobListItem {
  id: string
  externalUrl: string
  platform: string
  title: string
  company: string
  location: string | null
  datePosted: Date | null
  salary: string | null
  isStale: boolean
  appliedAt: Date | null
  autoApplyStatus: string | null
}

export interface JobDetail extends JobListItem {
  descriptionHtml: string | null
  descriptionText: string | null
  metadata: unknown
  createdAt: Date
}

export interface ApplicationRunStatus {
  id: string
  status: string
  steps: unknown
  errorMessage: string | null
  startedAt: Date
  completedAt: Date | null
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
  const { getScrapeQueue } = await import("@/workers/queue")
  await (await getScrapeQueue()).add(
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
): Promise<JobListItem[]> {
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
    select: {
      id: true,
      externalUrl: true,
      platform: true,
      title: true,
      company: true,
      location: true,
      datePosted: true,
      salary: true,
      appliedAt: true,
      autoApplyStatus: true,
    },
  })

  return jobs.map((job) => ({
    ...job,
    isStale: job.datePosted ? job.datePosted < staleThreshold : false,
    appliedAt: job.appliedAt ?? null,
    autoApplyStatus: job.autoApplyStatus ?? null,
  }))
}

export async function getJobDetail(jobId: string): Promise<JobDetail | null> {
  const userId = await getAuthUserId()
  const staleThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const job = await prisma.jobListing.findFirst({
    where: { id: jobId, userId },
  })

  if (!job) return null

  return {
    id: job.id,
    externalUrl: job.externalUrl,
    platform: job.platform,
    title: job.title,
    company: job.company,
    location: job.location,
    datePosted: job.datePosted,
    salary: job.salary,
    descriptionHtml: job.descriptionHtml,
    descriptionText: job.descriptionText,
    metadata: job.metadata,
    createdAt: job.createdAt,
    isStale: job.datePosted ? job.datePosted < staleThreshold : false,
    appliedAt: job.appliedAt,
    autoApplyStatus: job.autoApplyStatus ?? null,
  }
}

export async function getLatestScrapeRun() {
  const userId = await getAuthUserId()

  return prisma.scrapeRun.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
  })
}


export async function cancelScrapeRun(runId: string): Promise<void> {
  const userId = await getAuthUserId()

  await prisma.scrapeRun.updateMany({
    where: { id: runId, userId, status: { in: ["pending", "running"] } },
    data: { status: "failed", completedAt: new Date() },
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

export async function markJobApplied(
  jobId: string
): Promise<{ appliedAt: Date }> {
  const userId = await getAuthUserId()

  const job = await prisma.jobListing.update({
    where: { id: jobId, userId },
    data: { appliedAt: new Date() },
    select: { appliedAt: true },
  })

  return { appliedAt: job.appliedAt! }
}

export async function unmarkJobApplied(jobId: string): Promise<void> {
  const userId = await getAuthUserId()

  await prisma.jobListing.update({
    where: { id: jobId, userId },
    data: { appliedAt: null },
  })
}

export async function autoApplyToJob(
  jobId: string
): Promise<{ applicationRunId?: string; error?: string }> {
  const userId = await getAuthUserId()

  // Validate job exists and belongs to user
  const job = await prisma.jobListing.findFirst({
    where: { id: jobId, userId },
  })
  if (!job) {
    return { error: "Job not found" }
  }

  // Don't allow if already queued or running
  if (job.autoApplyStatus === "queued" || job.autoApplyStatus === "running") {
    return { error: "Auto-apply already in progress" }
  }

  // Load full profile with relations
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      education: { orderBy: { sortOrder: "asc" } },
      workHistory: { orderBy: { sortOrder: "asc" } },
      skills: true,
      qaEntries: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!profile) {
    return { error: "Complete your profile first" }
  }
  if (!profile.resumeFilePath) {
    return { error: "Upload a resume first" }
  }

  // Create ApplicationRun record
  const applicationRun = await prisma.applicationRun.create({
    data: {
      userId,
      jobListingId: jobId,
      status: "pending",
    },
  })

  // Set job status to queued
  await prisma.jobListing.update({
    where: { id: jobId },
    data: { autoApplyStatus: "queued" },
  })

  // Serialize profile data for the worker
  const serializedProfile = {
    contactName: profile.contactName,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    contactLinkedIn: profile.contactLinkedIn,
    contactWebsite: profile.contactWebsite,
    contactLocation: profile.contactLocation,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    state: profile.state,
    zipCode: profile.zipCode,
    country: profile.country,
    workdayPassword: profile.workdayPassword,
    resumeFilePath: profile.resumeFilePath,
    otherText: profile.otherText,
    education: profile.education.map((e) => ({
      school: e.school,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      startDate: e.startDate,
      endDate: e.endDate,
      gpa: e.gpa,
    })),
    workHistory: profile.workHistory.map((w) => ({
      company: w.company,
      title: w.title,
      startDate: w.startDate,
      endDate: w.endDate,
      bullets: w.bullets,
    })),
    skills: profile.skills.map((s) => ({ name: s.name })),
    qaEntries: profile.qaEntries.map((q) => ({
      question: q.question,
      answer: q.answer,
    })),
  }

  // Enqueue to auto-apply queue
  const { getApplyQueue } = await import("@/workers/queue")
  await (await getApplyQueue()).add(
    "auto-apply",
    {
      userId,
      applicationRunId: applicationRun.id,
      jobListingId: jobId,
      externalUrl: job.externalUrl,
      profile: serializedProfile,
    },
    {
      attempts: 2,
      backoff: { type: "fixed", delay: 60000 },
    }
  )

  return { applicationRunId: applicationRun.id }
}

export async function getApplicationRunStatus(
  jobId: string
): Promise<ApplicationRunStatus | null> {
  const userId = await getAuthUserId()

  const run = await prisma.applicationRun.findFirst({
    where: { jobListingId: jobId, userId },
    orderBy: { startedAt: "desc" },
  })

  if (!run) return null

  return {
    id: run.id,
    status: run.status,
    steps: run.steps,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  }
}

export async function cancelAutoApply(
  jobId: string
): Promise<{ success: boolean }> {
  const userId = await getAuthUserId()

  // Find the active run
  const run = await prisma.applicationRun.findFirst({
    where: {
      jobListingId: jobId,
      userId,
      status: { in: ["pending", "running", "queued"] },
    },
    orderBy: { startedAt: "desc" },
  })

  if (!run) return { success: false }

  // Mark as failed/cancelled
  await prisma.applicationRun.update({
    where: { id: run.id },
    data: {
      status: "failed",
      errorMessage: "Cancelled by user",
      completedAt: new Date(),
    },
  })

  await prisma.jobListing.update({
    where: { id: jobId },
    data: { autoApplyStatus: "failed" },
  })

  return { success: true }
}

export async function findCoffeeChatContacts(
  company: string
): Promise<{ status: string; contacts: Array<{ name: string; role: string; profileUrl: string }> }> {
  // Skeleton - not yet implemented
  await getAuthUserId()
  return { status: "not_implemented", contacts: [] }
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
