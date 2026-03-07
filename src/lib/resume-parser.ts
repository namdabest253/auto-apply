import type {
  ParsedProfile,
  ContactInfo,
  EducationEntry,
  WorkEntry,
  ProjectEntry,
  VolunteerEntry,
} from "@/types/profile"

// Section header detection patterns
const SECTION_PATTERNS: Record<string, RegExp> = {
  education: /^(education|academic\s*background|academic)/i,
  experience:
    /^(experience|employment|work\s*history|professional\s*experience|work\s*experience)/i,
  skills:
    /^(skills|technical\s*skills|proficiencies|technologies|core\s*competencies)/i,
  projects: /^(projects|personal\s*projects|portfolio|side\s*projects)/i,
  certifications:
    /^(certifications?|licenses?|credentials?|professional\s*certifications?)/i,
  volunteer:
    /^(volunteer\s*(?:experience|work)?|community\s*(?:service|involvement))/i,
  publications: /^(publications?|papers?|research\s*publications?)/i,
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
const LINKEDIN_REGEX = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+/i
const URL_REGEX = /https?:\/\/[^\s]+/i
const DATE_RANGE_REGEX =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}\s*[-–]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}|(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}\s*[-–]\s*[Pp]resent/i

function emptyProfile(): ParsedProfile {
  return {
    contactInfo: {
      name: null,
      email: null,
      phone: null,
      linkedIn: null,
      website: null,
      location: null,
    },
    education: [],
    workHistory: [],
    projects: [],
    certifications: [],
    skills: [],
    volunteerWork: [],
    publications: [],
    otherText: "",
  }
}

function extractContactInfo(lines: string[]): ContactInfo {
  const info: ContactInfo = {
    name: null,
    email: null,
    phone: null,
    linkedIn: null,
    website: null,
    location: null,
  }

  // Scan first 5 non-empty lines for contact info
  const headerLines = lines.filter((l) => l.trim()).slice(0, 8)

  for (const line of headerLines) {
    const trimmed = line.trim()

    if (!info.email) {
      const emailMatch = trimmed.match(EMAIL_REGEX)
      if (emailMatch) {
        info.email = emailMatch[0]
        continue
      }
    }

    if (!info.phone) {
      const phoneMatch = trimmed.match(PHONE_REGEX)
      if (phoneMatch) {
        info.phone = phoneMatch[0]
        continue
      }
    }

    if (!info.linkedIn) {
      const linkedInMatch = trimmed.match(LINKEDIN_REGEX)
      if (linkedInMatch) {
        info.linkedIn = linkedInMatch[0]
        continue
      }
    }

    if (!info.website && !info.linkedIn) {
      const urlMatch = trimmed.match(URL_REGEX)
      if (urlMatch) {
        // Check if it's LinkedIn
        if (LINKEDIN_REGEX.test(trimmed)) {
          info.linkedIn = urlMatch[0]
        } else {
          info.website = urlMatch[0]
        }
        continue
      }
    }
  }

  // Name is the first non-empty line that isn't contact data
  for (const line of headerLines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (EMAIL_REGEX.test(trimmed)) continue
    if (PHONE_REGEX.test(trimmed)) continue
    if (URL_REGEX.test(trimmed)) continue
    info.name = trimmed
    break
  }

  return info
}

interface Section {
  type: string
  lines: string[]
}

function detectSections(lines: string[]): {
  headerLines: string[]
  sections: Section[]
} {
  const headerLines: string[] = []
  const sections: Section[] = []

  let currentSection: Section | null = null
  let headerEnded = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Try to match section header
    let matchedType: string | null = null
    for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(trimmed)) {
        matchedType = type
        break
      }
    }

    if (matchedType) {
      headerEnded = true
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = { type: matchedType, lines: [] }
    } else if (!headerEnded) {
      headerLines.push(line)
    } else if (currentSection) {
      currentSection.lines.push(line)
    } else {
      // After header but no section yet -- shouldn't happen often
      headerLines.push(line)
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return { headerLines, sections }
}

function parseEducation(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = []
  const content = lines.filter((l) => l.trim()).join("\n")

  if (!content.trim()) return entries

  // Split by lines and try to group education entries
  const nonEmpty = lines.filter((l) => l.trim())
  let currentEntry: EducationEntry | null = null

  for (const line of nonEmpty) {
    const trimmed = line.trim()

    // Check for GPA
    const gpaMatch = trimmed.match(/GPA[:\s]*(\d+\.?\d*)/i)
    if (gpaMatch && currentEntry) {
      currentEntry.gpa = gpaMatch[1]
      continue
    }

    // Check for degree patterns on a comma-separated line
    const degreePattern =
      /(?:Bachelor|Master|Doctor|PhD|BS|BA|MS|MA|MBA|MD|JD|Associate)/i
    const hasSchoolKeyword =
      /(?:University|College|Institute|School|MIT|Stanford|Harvard)/i

    if (hasSchoolKeyword.test(trimmed) || degreePattern.test(trimmed)) {
      if (currentEntry) {
        entries.push(currentEntry)
      }

      // Parse "School, Degree in Field, Dates" format
      const parts = trimmed.split(",").map((p) => p.trim())
      const dateMatch = trimmed.match(DATE_RANGE_REGEX)

      currentEntry = {
        school: null,
        degree: null,
        fieldOfStudy: null,
        startDate: null,
        endDate: null,
        gpa: null,
        coursework: null,
      }

      // Try to identify school vs degree in parts
      for (const part of parts) {
        if (DATE_RANGE_REGEX.test(part)) {
          // skip, handled below
          continue
        } else if (hasSchoolKeyword.test(part)) {
          currentEntry.school = part
        } else if (degreePattern.test(part)) {
          // Could be "Bachelor of Science in Computer Science"
          const fieldMatch = part.match(/(?:in|of)\s+(.+)/i)
          currentEntry.degree = part
          if (fieldMatch) {
            currentEntry.fieldOfStudy = fieldMatch[1].trim()
          }
        } else if (!currentEntry.school) {
          currentEntry.school = part
        }
      }

      // If we still don't have a school, use the whole line
      if (!currentEntry.school) {
        currentEntry.school = parts[0]
      }

      if (dateMatch) {
        const dateParts = dateMatch[0].split(/[-–]/).map((d) => d.trim())
        currentEntry.startDate = dateParts[0] || null
        currentEntry.endDate = dateParts[1] || null
      }
    } else if (currentEntry) {
      // Additional info for current entry (coursework, etc.)
      if (/coursework/i.test(trimmed)) {
        currentEntry.coursework = trimmed
          .replace(/^coursework[:\s]*/i, "")
          .trim()
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry)
  }

  return entries
}

function parseExperience(lines: string[]): WorkEntry[] {
  const entries: WorkEntry[] = []
  const nonEmpty = lines.filter((l) => l.trim())

  if (nonEmpty.length === 0) return entries

  let currentEntry: WorkEntry | null = null

  for (const line of nonEmpty) {
    const trimmed = line.trim()

    // Check if line is a bullet point
    if (/^[-*]/.test(trimmed)) {
      if (currentEntry) {
        currentEntry.bullets.push(trimmed.replace(/^[-*]\s*/, ""))
      }
      continue
    }

    // Check for date range line
    const dateMatch = trimmed.match(DATE_RANGE_REGEX)
    if (dateMatch && currentEntry) {
      const dateParts = dateMatch[0].split(/[-–]/).map((d) => d.trim())
      currentEntry.startDate = dateParts[0] || null
      currentEntry.endDate = dateParts[1] || null
      continue
    }

    // Check for "Title, Company" or "Title at Company" pattern
    const titleCompanyMatch = trimmed.match(
      /^(.+?),\s*(.+?)(?:\s*[-–|]\s*(.+))?$/
    )
    const titleAtCompanyMatch = trimmed.match(
      /^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[-–|]\s*(.+))?$/
    )

    if (titleCompanyMatch || titleAtCompanyMatch) {
      if (currentEntry) {
        entries.push(currentEntry)
      }

      const match = titleCompanyMatch || titleAtCompanyMatch
      currentEntry = {
        company: match![2].trim(),
        title: match![1].trim(),
        startDate: null,
        endDate: null,
        bullets: [],
      }

      // Check if date is on this same line
      if (match![3]) {
        const inlineDateMatch = match![3].match(DATE_RANGE_REGEX)
        if (inlineDateMatch) {
          const dateParts = inlineDateMatch[0]
            .split(/[-–]/)
            .map((d) => d.trim())
          currentEntry.startDate = dateParts[0] || null
          currentEntry.endDate = dateParts[1] || null
        }
      }
    } else if (!currentEntry) {
      // First non-bullet, non-date line is probably title/company
      currentEntry = {
        company: null,
        title: trimmed,
        startDate: null,
        endDate: null,
        bullets: [],
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry)
  }

  return entries
}

function parseSkills(lines: string[]): string[] {
  const skills: string[] = []
  const content = lines.filter((l) => l.trim()).join("\n")

  if (!content.trim()) return skills

  // Try comma-separated first
  const allText = content.trim()
  if (allText.includes(",")) {
    const parts = allText.split(",").map((s) => s.trim()).filter(Boolean)
    skills.push(...parts)
  } else if (allText.includes("|")) {
    const parts = allText.split("|").map((s) => s.trim()).filter(Boolean)
    skills.push(...parts)
  } else {
    // Newline-separated
    const parts = allText.split("\n").map((s) => s.trim()).filter(Boolean)
    skills.push(...parts)
  }

  return skills
}

function parseProjects(lines: string[]): ProjectEntry[] {
  const entries: ProjectEntry[] = []
  const nonEmpty = lines.filter((l) => l.trim())

  if (nonEmpty.length === 0) return entries

  let currentEntry: ProjectEntry | null = null

  for (const line of nonEmpty) {
    const trimmed = line.trim()

    // Check for URL
    const urlMatch = trimmed.match(URL_REGEX)
    if (urlMatch && currentEntry) {
      currentEntry.url = urlMatch[0]
      continue
    }

    // Check for technologies line
    const techMatch = trimmed.match(
      /^(?:Technologies|Tech\s*Stack|Built\s*with)[:\s]*(.+)/i
    )
    if (techMatch && currentEntry) {
      currentEntry.technologies = techMatch[1]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      continue
    }

    // Check if this looks like a project name (short, no punctuation at end suggesting description)
    if (
      !currentEntry ||
      (trimmed.length < 80 &&
        !trimmed.endsWith(".") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("*"))
    ) {
      // Heuristic: if current entry has a name and this isn't clearly a description, start new
      if (
        currentEntry &&
        currentEntry.name &&
        !currentEntry.description &&
        trimmed.length > 20
      ) {
        currentEntry.description = trimmed
        continue
      }

      if (currentEntry && currentEntry.name) {
        entries.push(currentEntry)
      }

      currentEntry = {
        name: trimmed,
        description: null,
        url: null,
        technologies: [],
      }
    } else if (currentEntry) {
      if (!currentEntry.description) {
        currentEntry.description = trimmed
      } else {
        currentEntry.description += " " + trimmed
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry)
  }

  return entries
}

function parseCertifications(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

function parseVolunteer(lines: string[]): VolunteerEntry[] {
  const entries: VolunteerEntry[] = []
  const nonEmpty = lines.filter((l) => l.trim())

  if (nonEmpty.length === 0) return entries

  let currentEntry: VolunteerEntry | null = null

  for (const line of nonEmpty) {
    const trimmed = line.trim()

    // Check for date range
    const dateMatch = trimmed.match(DATE_RANGE_REGEX)
    if (dateMatch && currentEntry) {
      const dateParts = dateMatch[0].split(/[-–]/).map((d) => d.trim())
      currentEntry.startDate = dateParts[0] || null
      currentEntry.endDate = dateParts[1] || null
      continue
    }

    // Check for "Org, Role" pattern
    const orgRoleMatch = trimmed.match(/^(.+?),\s*(.+)$/)
    if (orgRoleMatch && !currentEntry) {
      currentEntry = {
        organization: orgRoleMatch[1].trim(),
        role: orgRoleMatch[2].trim(),
        startDate: null,
        endDate: null,
        description: null,
      }
    } else if (!currentEntry) {
      currentEntry = {
        organization: trimmed,
        role: null,
        startDate: null,
        endDate: null,
        description: null,
      }
    } else {
      // Description line
      if (!currentEntry.description) {
        currentEntry.description = trimmed
      } else {
        currentEntry.description += " " + trimmed
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry)
  }

  return entries
}

function parsePublications(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

export function parseResumeText(rawText: string): ParsedProfile {
  const profile = emptyProfile()

  if (!rawText.trim()) {
    return profile
  }

  const lines = rawText.split("\n")
  const { headerLines, sections } = detectSections(lines)

  // Extract contact info from header lines
  profile.contactInfo = extractContactInfo(headerLines)

  // If no sections detected, everything goes to otherText
  if (sections.length === 0) {
    profile.otherText = rawText.trim()
    return profile
  }

  // Process each section
  const knownSectionTypes = new Set([
    "education",
    "experience",
    "skills",
    "projects",
    "certifications",
    "volunteer",
    "publications",
  ])
  const otherParts: string[] = []

  for (const section of sections) {
    switch (section.type) {
      case "education":
        profile.education = parseEducation(section.lines)
        break
      case "experience":
        profile.workHistory = parseExperience(section.lines)
        break
      case "skills":
        profile.skills = parseSkills(section.lines)
        break
      case "projects":
        profile.projects = parseProjects(section.lines)
        break
      case "certifications":
        profile.certifications = parseCertifications(section.lines)
        break
      case "volunteer":
        profile.volunteerWork = parseVolunteer(section.lines)
        break
      case "publications":
        profile.publications = parsePublications(section.lines)
        break
      default:
        // Unknown section goes to otherText
        otherParts.push(section.lines.join("\n").trim())
        break
    }
  }

  if (otherParts.length > 0) {
    profile.otherText = otherParts.filter(Boolean).join("\n\n")
  }

  return profile
}
