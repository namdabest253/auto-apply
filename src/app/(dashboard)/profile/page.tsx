import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ProfilePageClient } from "./components/profile-page-client"
import { getHandshakeStatus } from "./handshake-actions"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      education: { orderBy: { sortOrder: "asc" } },
      workHistory: { orderBy: { sortOrder: "asc" } },
      projects: { orderBy: { sortOrder: "asc" } },
      certifications: { orderBy: { sortOrder: "asc" } },
      skills: true,
      volunteerWork: { orderBy: { sortOrder: "asc" } },
      publications: { orderBy: { sortOrder: "asc" } },
      jobPreferences: true,
      qaEntries: { orderBy: { sortOrder: "asc" } },
    },
  })

  const contact = {
    name: profile?.contactName ?? "",
    email: profile?.contactEmail ?? "",
    phone: profile?.contactPhone ?? "",
    linkedIn: profile?.contactLinkedIn ?? "",
    website: profile?.contactWebsite ?? "",
    location: profile?.contactLocation ?? "",
  }

  const educationData = (profile?.education ?? []).map((e) => ({
    id: e.id,
    school: e.school,
    degree: e.degree ?? "",
    fieldOfStudy: e.fieldOfStudy ?? "",
    startDate: e.startDate ?? "",
    endDate: e.endDate ?? "",
    gpa: e.gpa ?? "",
    coursework: e.coursework ?? "",
    sortOrder: e.sortOrder,
  }))

  const workData = (profile?.workHistory ?? []).map((w) => ({
    id: w.id,
    company: w.company,
    title: w.title ?? "",
    startDate: w.startDate ?? "",
    endDate: w.endDate ?? "",
    bullets: w.bullets,
    sortOrder: w.sortOrder,
  }))

  const projectData = (profile?.projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    url: p.url ?? "",
    technologies: p.technologies,
    sortOrder: p.sortOrder,
  }))

  const certData = (profile?.certifications ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuer ?? "",
    date: c.date ?? "",
    sortOrder: c.sortOrder,
  }))

  const volunteerData = (profile?.volunteerWork ?? []).map((v) => ({
    id: v.id,
    organization: v.organization,
    role: v.role ?? "",
    startDate: v.startDate ?? "",
    endDate: v.endDate ?? "",
    description: v.description ?? "",
    sortOrder: v.sortOrder,
  }))

  const pubData = (profile?.publications ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    venue: p.venue ?? "",
    date: p.date ?? "",
    url: p.url ?? "",
    sortOrder: p.sortOrder,
  }))

  const skillNames = (profile?.skills ?? []).map((s) => s.name)

  const jobPreferences = profile?.jobPreferences
    ? {
        locations: profile.jobPreferences.locations,
        roleTypes: profile.jobPreferences.roleTypes,
        industries: profile.jobPreferences.industries,
        keywords: profile.jobPreferences.keywords,
      }
    : undefined

  const qaEntries = (profile?.qaEntries ?? []).map((e) => ({
    id: e.id,
    question: e.question,
    answer: e.answer,
  }))

  const handshakeStatus = await getHandshakeStatus(session.user.id).catch(
    () => ({ hasCredentials: false, universityName: undefined })
  )

  const careerPages = await prisma.careerPageUrl.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, label: true },
  })

  return (
    <ProfilePageClient
      hasProfile={!!profile}
      currentFileName={profile?.resumeFileName ?? undefined}
      contact={contact}
      education={educationData}
      workHistory={workData}
      projects={projectData}
      skills={skillNames}
      certifications={certData}
      volunteerWork={volunteerData}
      publications={pubData}
      otherText={profile?.otherText ?? ""}
      jobPreferences={jobPreferences}
      qaEntries={qaEntries}
      careerPages={careerPages}
      handshakeStatus={handshakeStatus}
    />
  )
}
