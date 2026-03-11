"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import {
  contactInfoSchema,
  educationSchema,
  workHistorySchema,
  projectSchema,
} from "@/lib/validators"

async function getProfileId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    // Create profile if it doesn't exist (manual editing without upload)
    const newProfile = await prisma.profile.create({
      data: { userId: session.user.id },
    })
    return newProfile.id
  }

  return profile.id
}

export async function saveContactInfo(data: {
  name?: string
  email?: string
  phone?: string
  linkedIn?: string
  website?: string
  location?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const validated = contactInfoSchema.parse(data)

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: {
      contactName: validated.name || null,
      contactEmail: validated.email || null,
      contactPhone: validated.phone || null,
      contactLinkedIn: validated.linkedIn || null,
      contactWebsite: validated.website || null,
      contactLocation: validated.location || null,
    },
    create: {
      userId: session.user.id,
      contactName: validated.name || null,
      contactEmail: validated.email || null,
      contactPhone: validated.phone || null,
      contactLinkedIn: validated.linkedIn || null,
      contactWebsite: validated.website || null,
      contactLocation: validated.location || null,
    },
  })

  revalidatePath("/profile")
}

export async function saveEducation(data: {
  id?: string
  school: string
  degree?: string
  fieldOfStudy?: string
  startDate?: string
  endDate?: string
  gpa?: string
  coursework?: string
  sortOrder?: number
}) {
  const profileId = await getProfileId()
  const validated = educationSchema.parse(data)

  if (validated.id) {
    await prisma.education.update({
      where: { id: validated.id },
      data: {
        school: validated.school,
        degree: validated.degree || null,
        fieldOfStudy: validated.fieldOfStudy || null,
        startDate: validated.startDate || null,
        endDate: validated.endDate || null,
        gpa: validated.gpa || null,
        coursework: validated.coursework || null,
        sortOrder: validated.sortOrder,
      },
    })
  } else {
    await prisma.education.create({
      data: {
        profileId,
        school: validated.school,
        degree: validated.degree || null,
        fieldOfStudy: validated.fieldOfStudy || null,
        startDate: validated.startDate || null,
        endDate: validated.endDate || null,
        gpa: validated.gpa || null,
        coursework: validated.coursework || null,
        sortOrder: validated.sortOrder,
      },
    })
  }

  revalidatePath("/profile")
}

export async function deleteEducation(id: string) {
  await getProfileId()
  await prisma.education.delete({ where: { id } })
  revalidatePath("/profile")
}

export async function saveWorkHistory(data: {
  id?: string
  company: string
  title?: string
  startDate?: string
  endDate?: string
  bullets?: string[]
  sortOrder?: number
}) {
  const profileId = await getProfileId()
  const validated = workHistorySchema.parse(data)

  if (validated.id) {
    await prisma.workHistory.update({
      where: { id: validated.id },
      data: {
        company: validated.company,
        title: validated.title || null,
        startDate: validated.startDate || null,
        endDate: validated.endDate || null,
        bullets: validated.bullets,
        sortOrder: validated.sortOrder,
      },
    })
  } else {
    await prisma.workHistory.create({
      data: {
        profileId,
        company: validated.company,
        title: validated.title || null,
        startDate: validated.startDate || null,
        endDate: validated.endDate || null,
        bullets: validated.bullets,
        sortOrder: validated.sortOrder,
      },
    })
  }

  revalidatePath("/profile")
}

export async function deleteWorkHistory(id: string) {
  await getProfileId()
  await prisma.workHistory.delete({ where: { id } })
  revalidatePath("/profile")
}

export async function saveProject(data: {
  id?: string
  name: string
  description?: string
  url?: string
  technologies?: string[]
  sortOrder?: number
}) {
  const profileId = await getProfileId()
  const validated = projectSchema.parse(data)

  if (validated.id) {
    await prisma.project.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        description: validated.description || null,
        url: validated.url || null,
        technologies: validated.technologies,
        sortOrder: validated.sortOrder,
      },
    })
  } else {
    await prisma.project.create({
      data: {
        profileId,
        name: validated.name,
        description: validated.description || null,
        url: validated.url || null,
        technologies: validated.technologies,
        sortOrder: validated.sortOrder,
      },
    })
  }

  revalidatePath("/profile")
}

export async function deleteProject(id: string) {
  await getProfileId()
  await prisma.project.delete({ where: { id } })
  revalidatePath("/profile")
}

export async function saveSkills(skills: string[]) {
  const profileId = await getProfileId()

  await prisma.$transaction(async (tx) => {
    await tx.skill.deleteMany({ where: { profileId } })
    if (skills.length > 0) {
      await tx.skill.createMany({
        data: skills.map((name) => ({ profileId, name })),
      })
    }
  })

  revalidatePath("/profile")
}

export async function saveCertification(data: {
  id?: string
  name: string
  issuer?: string
  date?: string
  sortOrder?: number
}) {
  const profileId = await getProfileId()

  if (data.id) {
    await prisma.certification.update({
      where: { id: data.id },
      data: {
        name: data.name,
        issuer: data.issuer || null,
        date: data.date || null,
        sortOrder: data.sortOrder ?? 0,
      },
    })
  } else {
    await prisma.certification.create({
      data: {
        profileId,
        name: data.name,
        issuer: data.issuer || null,
        date: data.date || null,
        sortOrder: data.sortOrder ?? 0,
      },
    })
  }

  revalidatePath("/profile")
}

export async function deleteCertification(id: string) {
  await getProfileId()
  await prisma.certification.delete({ where: { id } })
  revalidatePath("/profile")
}

export async function saveVolunteerWork(data: {
  id?: string
  organization: string
  role?: string
  startDate?: string
  endDate?: string
  description?: string
  sortOrder?: number
}) {
  const profileId = await getProfileId()

  if (data.id) {
    await prisma.volunteerWork.update({
      where: { id: data.id },
      data: {
        organization: data.organization,
        role: data.role || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        description: data.description || null,
        sortOrder: data.sortOrder ?? 0,
      },
    })
  } else {
    await prisma.volunteerWork.create({
      data: {
        profileId,
        organization: data.organization,
        role: data.role || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        description: data.description || null,
        sortOrder: data.sortOrder ?? 0,
      },
    })
  }

  revalidatePath("/profile")
}

export async function deleteVolunteerWork(id: string) {
  await getProfileId()
  await prisma.volunteerWork.delete({ where: { id } })
  revalidatePath("/profile")
}

export async function savePublication(data: {
  id?: string
  title: string
  venue?: string
  date?: string
  url?: string
  sortOrder?: number
}) {
  const profileId = await getProfileId()

  if (data.id) {
    await prisma.publication.update({
      where: { id: data.id },
      data: {
        title: data.title,
        venue: data.venue || null,
        date: data.date || null,
        url: data.url || null,
        sortOrder: data.sortOrder ?? 0,
      },
    })
  } else {
    await prisma.publication.create({
      data: {
        profileId,
        title: data.title,
        venue: data.venue || null,
        date: data.date || null,
        url: data.url || null,
        sortOrder: data.sortOrder ?? 0,
      },
    })
  }

  revalidatePath("/profile")
}

export async function deletePublication(id: string) {
  await getProfileId()
  await prisma.publication.delete({ where: { id } })
  revalidatePath("/profile")
}

export async function saveJobPreferences(data: {
  locations: string[]
  roleTypes: string[]
  industries: string[]
  keywords: string[]
}) {
  const profileId = await getProfileId()

  await prisma.jobPreference.upsert({
    where: { profileId },
    update: {
      locations: data.locations,
      roleTypes: data.roleTypes,
      industries: data.industries,
      keywords: data.keywords,
    },
    create: {
      profileId,
      locations: data.locations,
      roleTypes: data.roleTypes,
      industries: data.industries,
      keywords: data.keywords,
    },
  })

  revalidatePath("/profile")
}

export async function saveQAEntry(data: {
  id?: string
  question: string
  answer: string
}) {
  const profileId = await getProfileId()

  if (data.id) {
    // Verify entry belongs to this user's profile
    const existing = await prisma.qAEntry.findFirst({
      where: { id: data.id, profileId },
    })
    if (!existing) throw new Error("Q&A entry not found")

    await prisma.qAEntry.update({
      where: { id: data.id },
      data: {
        question: data.question,
        answer: data.answer,
      },
    })
  } else {
    const count = await prisma.qAEntry.count({ where: { profileId } })
    await prisma.qAEntry.create({
      data: {
        profileId,
        question: data.question,
        answer: data.answer,
        sortOrder: count,
      },
    })
  }

  revalidatePath("/profile")
}

export async function deleteQAEntry(id: string) {
  const profileId = await getProfileId()

  // Verify entry belongs to this user's profile
  const existing = await prisma.qAEntry.findFirst({
    where: { id, profileId },
  })
  if (!existing) throw new Error("Q&A entry not found")

  await prisma.qAEntry.delete({ where: { id } })
  revalidatePath("/profile")
}

// Career Page URL management

export async function addCareerPage(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const url = (formData.get("url") as string)?.trim()
  const label = (formData.get("label") as string)?.trim()

  if (!url || !label) throw new Error("URL and company name are required")

  // Basic URL validation
  try {
    new URL(url)
  } catch {
    throw new Error("Invalid URL format")
  }

  const entry = await prisma.careerPageUrl.create({
    data: {
      userId: session.user.id,
      url,
      label,
    },
  })

  revalidatePath("/profile")
  return entry
}

export async function removeCareerPage(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Verify ownership
  const existing = await prisma.careerPageUrl.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) throw new Error("Career page URL not found")

  await prisma.careerPageUrl.delete({ where: { id } })
  revalidatePath("/profile")
}

export async function getCareerPages() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.careerPageUrl.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}
