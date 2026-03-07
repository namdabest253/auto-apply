export interface ContactInfo {
  name: string | null
  email: string | null
  phone: string | null
  linkedIn: string | null
  website: string | null
  location: string | null
}

export interface EducationEntry {
  school: string | null
  degree: string | null
  fieldOfStudy: string | null
  startDate: string | null
  endDate: string | null
  gpa: string | null
  coursework: string | null
}

export interface WorkEntry {
  company: string | null
  title: string | null
  startDate: string | null
  endDate: string | null
  bullets: string[]
}

export interface ProjectEntry {
  name: string
  description: string | null
  url: string | null
  technologies: string[]
}

export interface VolunteerEntry {
  organization: string
  role: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
}

export interface ParsedProfile {
  contactInfo: ContactInfo
  education: EducationEntry[]
  workHistory: WorkEntry[]
  projects: ProjectEntry[]
  certifications: string[]
  skills: string[]
  volunteerWork: VolunteerEntry[]
  publications: string[]
  otherText: string
}
