import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { PDFParse } from "pdf-parse"
import * as mammoth from "mammoth"
import { parseResumeText } from "@/lib/resume-parser"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

const VALID_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("resume") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files accepted" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File must be under 5MB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Save original file to disk
    const uploadDir = join(process.cwd(), "uploads", "resumes")
    await mkdir(uploadDir, { recursive: true })
    const ext = file.type === "application/pdf" ? ".pdf" : ".docx"
    const filename = `${session.user.id}${ext}`
    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)

    // Extract text based on file type
    let rawText: string
    if (file.type === "application/pdf") {
      const pdf = new PDFParse({ data: new Uint8Array(buffer) })
      const result = await pdf.getText()
      rawText = result.text
      await pdf.destroy()
    } else {
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    }

    // Parse into structured data
    const profileData = parseResumeText(rawText)
    const userId = session.user.id

    // Save to database atomically
    const profile = await prisma.$transaction(async (tx) => {
      // Upsert profile record
      const upsertedProfile = await tx.profile.upsert({
        where: { userId },
        update: {
          resumeFileName: file.name,
          resumeFilePath: filePath,
          contactName: profileData.contactInfo.name,
          contactEmail: profileData.contactInfo.email,
          contactPhone: profileData.contactInfo.phone,
          contactLinkedIn: profileData.contactInfo.linkedIn,
          contactWebsite: profileData.contactInfo.website,
          contactLocation: profileData.contactInfo.location,
          otherText: profileData.otherText || null,
        },
        create: {
          userId,
          resumeFileName: file.name,
          resumeFilePath: filePath,
          contactName: profileData.contactInfo.name,
          contactEmail: profileData.contactInfo.email,
          contactPhone: profileData.contactInfo.phone,
          contactLinkedIn: profileData.contactInfo.linkedIn,
          contactWebsite: profileData.contactInfo.website,
          contactLocation: profileData.contactInfo.location,
          otherText: profileData.otherText || null,
        },
      })

      const profileId = upsertedProfile.id

      // Delete existing child records (re-upload replaces everything)
      await tx.education.deleteMany({ where: { profileId } })
      await tx.workHistory.deleteMany({ where: { profileId } })
      await tx.project.deleteMany({ where: { profileId } })
      await tx.certification.deleteMany({ where: { profileId } })
      await tx.skill.deleteMany({ where: { profileId } })
      await tx.volunteerWork.deleteMany({ where: { profileId } })
      await tx.publication.deleteMany({ where: { profileId } })

      // Create new child records from parsed data
      if (profileData.education.length > 0) {
        await tx.education.createMany({
          data: profileData.education.map((edu, i) => ({
            profileId,
            school: edu.school || "Unknown School",
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy,
            startDate: edu.startDate,
            endDate: edu.endDate,
            gpa: edu.gpa,
            coursework: edu.coursework,
            sortOrder: i,
          })),
        })
      }

      if (profileData.workHistory.length > 0) {
        await tx.workHistory.createMany({
          data: profileData.workHistory.map((work, i) => ({
            profileId,
            company: work.company || "Unknown Company",
            title: work.title,
            startDate: work.startDate,
            endDate: work.endDate,
            bullets: work.bullets,
            sortOrder: i,
          })),
        })
      }

      if (profileData.projects.length > 0) {
        await tx.project.createMany({
          data: profileData.projects.map((proj, i) => ({
            profileId,
            name: proj.name,
            description: proj.description,
            url: proj.url,
            technologies: proj.technologies,
            sortOrder: i,
          })),
        })
      }

      if (profileData.certifications.length > 0) {
        await tx.certification.createMany({
          data: profileData.certifications.map((cert, i) => ({
            profileId,
            name: cert,
            sortOrder: i,
          })),
        })
      }

      if (profileData.skills.length > 0) {
        await tx.skill.createMany({
          data: profileData.skills.map((skill) => ({
            profileId,
            name: skill,
          })),
        })
      }

      if (profileData.volunteerWork.length > 0) {
        await tx.volunteerWork.createMany({
          data: profileData.volunteerWork.map((vol, i) => ({
            profileId,
            organization: vol.organization,
            role: vol.role,
            startDate: vol.startDate,
            endDate: vol.endDate,
            description: vol.description,
            sortOrder: i,
          })),
        })
      }

      if (profileData.publications.length > 0) {
        await tx.publication.createMany({
          data: profileData.publications.map((pub, i) => ({
            profileId,
            title: pub,
            sortOrder: i,
          })),
        })
      }

      return upsertedProfile
    })

    return NextResponse.json({ success: true, profileId: profile.id })
  } catch (error) {
    console.error("Resume upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
