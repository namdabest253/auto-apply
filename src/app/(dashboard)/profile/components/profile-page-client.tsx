"use client"

import { useRouter } from "next/navigation"
import { ResumeUpload } from "./resume-upload"
import { ProfileEditor } from "./profile-editor"

interface ProfilePageClientProps {
  hasProfile: boolean
  currentFileName?: string
  contact: {
    name: string
    email: string
    phone: string
    linkedIn: string
    website: string
    location: string
  }
  education: Array<{
    id?: string
    school: string
    degree: string
    fieldOfStudy: string
    startDate: string
    endDate: string
    gpa: string
    coursework: string
    sortOrder: number
  }>
  workHistory: Array<{
    id?: string
    company: string
    title: string
    startDate: string
    endDate: string
    bullets: string[]
    sortOrder: number
  }>
  projects: Array<{
    id?: string
    name: string
    description: string
    url: string
    technologies: string[]
    sortOrder: number
  }>
  skills: string[]
  certifications: Array<{
    id?: string
    name: string
    issuer: string
    date: string
    sortOrder: number
  }>
  volunteerWork: Array<{
    id?: string
    organization: string
    role: string
    startDate: string
    endDate: string
    description: string
    sortOrder: number
  }>
  publications: Array<{
    id?: string
    title: string
    venue: string
    date: string
    url: string
    sortOrder: number
  }>
  otherText: string
}

export function ProfilePageClient({
  hasProfile,
  currentFileName,
  contact,
  education,
  workHistory,
  projects,
  skills,
  certifications,
  volunteerWork,
  publications,
  otherText,
}: ProfilePageClientProps) {
  const router = useRouter()

  const handleUploadComplete = () => {
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-zinc-100">Profile</h1>

      <ResumeUpload
        onUploadComplete={handleUploadComplete}
        currentFileName={currentFileName}
      />

      {!hasProfile && (
        <p className="text-zinc-400 text-center">
          Upload a resume to get started, or add your information manually
          below.
        </p>
      )}

      <ProfileEditor
        contact={contact}
        education={education}
        workHistory={workHistory}
        projects={projects}
        skills={skills}
        certifications={certifications}
        volunteerWork={volunteerWork}
        publications={publications}
        otherText={otherText}
      />
    </div>
  )
}
