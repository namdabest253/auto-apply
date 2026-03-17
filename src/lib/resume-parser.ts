import type {
  ParsedProfile,
  ContactInfo,
  EducationEntry,
  WorkEntry,
  ProjectEntry,
  VolunteerEntry,
} from "@/types/profile"

// Section header detection patterns — match the whole trimmed line
const SECTION_PATTERNS: Record<string, RegExp> = {
  education: /^education\s*$/i,
  experience:
    /^(experience|employment|work\s*history|professional\s*experience|work\s*experience)\s*$/i,
  skills:
    /^(skills|technical\s*skills|proficiencies|technologies|core\s*competencies)\s*$/i,
  projects: /^(projects|personal\s*projects|portfolio|side\s*projects)\s*$/i,
  certifications:
    /^(certifications?|licenses?|credentials?|professional\s*certifications?)\s*$/i,
  volunteer:
    /^(volunteer\s*(?:experience|work)?|community\s*(?:service|involvement))\s*$/i,
  publications: /^(publications?|papers?|research\s*publications?)\s*$/i,
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,}(?:\/[^\s|,]*)*/i
const DATE_REGEX =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}/i
const DATE_RANGE_REGEX =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}\s*[-–]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}|(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}\s*[-–]\s*(?:[Pp]resent|[Cc]urrent)|[Ee]xpected[:\s]*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}/i

// US states and common location patterns
const LOCATION_REGEX =
  /(?:[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*,\s*[A-Z]{2})\b/

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

/**
 * Split a line by pipe separators — PDF resumes often use | as delimiter
 */
function splitByPipes(line: string): string[] {
  if (!line.includes("|")) return [line]
  return line.split("|").map((s) => s.trim()).filter(Boolean)
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

  // Expand pipe-separated lines into individual tokens
  const tokens: string[] = []
  for (const line of lines) {
    tokens.push(...splitByPipes(line.trim()))
  }

  // First non-empty token that isn't contact data is the name
  for (const token of tokens) {
    if (!token) continue
    if (EMAIL_REGEX.test(token)) {
      if (!info.email) info.email = token.match(EMAIL_REGEX)![0]
      continue
    }
    if (PHONE_REGEX.test(token)) {
      if (!info.phone) info.phone = token.match(PHONE_REGEX)![0]
      continue
    }
    if (LINKEDIN_REGEX.test(token)) {
      if (!info.linkedIn) {
        const match = token.match(LINKEDIN_REGEX)![0]
        info.linkedIn = match.startsWith("http") ? match : `https://${match}`
      }
      continue
    }
    if (LOCATION_REGEX.test(token) && token.length < 40) {
      if (!info.location) info.location = token.match(LOCATION_REGEX)![0]
      continue
    }
    // Check for bare URLs (github.com/..., etc.) but not names
    if (/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab|bitbucket|[a-z]+)\.(?:com|io|dev|org)\//.test(token)) {
      if (!info.website) {
        info.website = token.startsWith("http") ? token : `https://${token}`
      }
      continue
    }
    // If it looks like a plain URL with a dot but no spaces, could be a website
    if (/^[a-zA-Z0-9][\w.-]+\.[a-z]{2,}/.test(token) && !token.includes(" ") && token.includes(".")) {
      if (!info.website) {
        info.website = token.startsWith("http") ? token : `https://${token}`
      }
      continue
    }
    // Name: first token that's not any of the above
    if (!info.name) {
      info.name = token
    }
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
      headerLines.push(line)
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return { headerLines, sections }
}

/**
 * PDF text extraction often concatenates lines without spaces.
 * e.g. "The University of ChicagoChicago, IL" or "Software Engineer InternJune 2025"
 * This function tries to split a line at a date or location boundary.
 */
function splitConcatenatedLine(line: string): { main: string; location: string | null; dates: string | null } {
  const trimmed = line.trim()
  let main = trimmed
  let location: string | null = null
  let dates: string | null = null

  // Try to extract date range from the line
  const dateMatch = trimmed.match(DATE_RANGE_REGEX)
  if (dateMatch) {
    dates = dateMatch[0]
    // Remove the date portion — but PDF may have concatenated it without space
    const dateIdx = trimmed.indexOf(dateMatch[0])
    main = trimmed.slice(0, dateIdx).trim()
  } else {
    // Check for "Expected: May 2028" style
    const expectedMatch = trimmed.match(/Expected[:\s]*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}/i)
    if (expectedMatch) {
      dates = expectedMatch[0]
      const idx = trimmed.indexOf(expectedMatch[0])
      main = trimmed.slice(0, idx).trim()
    }
  }

  // Try to extract "City, ST" location from end of main
  // City is typically 1-3 words, each capitalized — keep regex tight to avoid over-matching
  const locMatch = main.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2},\s*[A-Z]{2})\s*$/)
  if (locMatch) {
    location = locMatch[1].trim()
    main = main.slice(0, main.lastIndexOf(locMatch[1])).trim()
  }

  return { main, location, dates }
}

function parseEducation(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = []
  const nonEmpty = lines.filter((l) => l.trim())

  if (nonEmpty.length === 0) return entries

  let currentEntry: EducationEntry | null = null

  for (let i = 0; i < nonEmpty.length; i++) {
    const trimmed = nonEmpty[i].trim()

    // Skip bullet points — they're usually coursework details
    if (/^[•\-*]/.test(trimmed)) {
      if (currentEntry) {
        const text = trimmed.replace(/^[•\-*]\s*/, "")
        if (!currentEntry.coursework) {
          currentEntry.coursework = text
        } else {
          currentEntry.coursework += ", " + text
        }
      }
      continue
    }

    // Check for GPA line
    const gpaMatch = trimmed.match(/GPA[:\s]*(\d+\.?\d*(?:\s*\/\s*\d+\.?\d*)?)/i)
    if (gpaMatch && currentEntry) {
      currentEntry.gpa = gpaMatch[1]
      continue
    }

    // Check for coursework line
    const courseworkMatch = trimmed.match(/^(?:Relevant\s+)?Coursework[:\s]*(.+)/i)
    if (courseworkMatch && currentEntry) {
      currentEntry.coursework = courseworkMatch[1].trim().replace(/\.$/, "")
      continue
    }

    // Check for school/institution indicators
    const hasSchoolKeyword =
      /(?:University|College|Institute|School|MIT|Stanford|Harvard|Academy)/i
    const degreePattern =
      /(?:Bachelor|Master|Doctor|PhD|BS|BA|MS|MA|MBA|MD|JD|Associate|B\.S\.|B\.A\.|M\.S\.|M\.A\.)/i

    if (hasSchoolKeyword.test(trimmed)) {
      // This line has a school name — start a new entry
      if (currentEntry) {
        entries.push(currentEntry)
      }

      const { main, location, dates } = splitConcatenatedLine(trimmed)

      // Handle concatenated school+location: "The University of ChicagoChicago, IL"
      // Try to split by finding a repeated city name or "City, ST" pattern inside
      let schoolName = main || trimmed
      if (location) {
        // Location was already extracted by splitConcatenatedLine
        schoolName = main
      } else {
        // Try to find "City, ST" embedded in the string
        const embeddedLoc = schoolName.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\s*$/)
        if (embeddedLoc) {
          const locStr = embeddedLoc[1]
          const locIdx = schoolName.lastIndexOf(locStr)
          const before = schoolName.slice(0, locIdx).trim()
          if (before.length > 3) {
            schoolName = before
          }
        }
      }

      currentEntry = {
        school: schoolName,
        degree: null,
        fieldOfStudy: null,
        startDate: null,
        endDate: null,
        gpa: null,
        coursework: null,
      }

      if (dates) {
        const dateParts = dates.split(/[-–]/).map((d) => d.trim())
        if (/expected/i.test(dates)) {
          currentEntry.endDate = dates
        } else {
          currentEntry.startDate = dateParts[0] || null
          currentEntry.endDate = dateParts[1] || null
        }
      }

      continue
    }

    if (degreePattern.test(trimmed) && currentEntry && !currentEntry.degree) {
      // Degree line — may have dates concatenated
      const { main, dates } = splitConcatenatedLine(trimmed)

      // Handle multiple degrees: "B.S. Computer Science, B.S. Data Science"
      currentEntry.degree = main || trimmed

      // Try to extract field of study from degree
      const fieldMatch = main.match(/(?:in\s+|(?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?)\s+)(.+)/i)
      if (fieldMatch) {
        currentEntry.fieldOfStudy = fieldMatch[1].trim().replace(/,\s*$/, "")
      }

      if (dates && !currentEntry.startDate && !currentEntry.endDate) {
        const dateParts = dates.split(/[-–]/).map((d) => d.trim())
        if (/expected/i.test(dates)) {
          currentEntry.endDate = dates
        } else {
          currentEntry.startDate = dateParts[0] || null
          currentEntry.endDate = dateParts[1] || null
        }
      }

      continue
    }

    // Date range on its own line
    const dateMatch = trimmed.match(DATE_RANGE_REGEX)
    if (dateMatch && currentEntry) {
      const dateParts = dateMatch[0].split(/[-–]/).map((d) => d.trim())
      currentEntry.startDate = dateParts[0] || null
      currentEntry.endDate = dateParts[1] || null
      continue
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

  for (let i = 0; i < nonEmpty.length; i++) {
    const trimmed = nonEmpty[i].trim()

    // Bullet point — append to current entry
    if (/^[•\-*]/.test(trimmed)) {
      if (currentEntry) {
        currentEntry.bullets.push(trimmed.replace(/^[•\-*]\s*/, ""))
      }
      continue
    }

    // Continuation of a bullet — preprocessLines handles most merging via lowercase-start detection,
    // but some continuations start with uppercase (proper nouns, numbers, etc.)
    // We skip this since preprocessLines handles it now

    // Check if this is a title/company line (with possible location concatenated)
    // Common patterns:
    // "Company NameCity, ST" (concatenated)
    // "Job TitleDate Range" (concatenated)
    // "Title, Company"
    // "Title at Company"
    const { main, location, dates } = splitConcatenatedLine(trimmed)

    if (dates && currentEntry && !currentEntry.startDate) {
      // This line has dates — could be "Job TitleJune 2025 – August 2025"
      if (main) {
        currentEntry.title = main
      }
      const dateParts = dates.split(/[-–]/).map((d) => d.trim())
      currentEntry.startDate = dateParts[0] || null
      currentEntry.endDate = dateParts[1] || null
      continue
    }

    // "Title, Company" or "Title at Company" pattern
    const titleCompanyMatch = main.match(/^(.+?),\s+(.+)$/)
    const titleAtCompanyMatch = main.match(/^(.+?)\s+(?:at|@)\s+(.+)$/)

    if (titleCompanyMatch || titleAtCompanyMatch) {
      if (currentEntry) {
        entries.push(currentEntry)
      }
      const match = (titleCompanyMatch || titleAtCompanyMatch)!
      currentEntry = {
        company: match[2].trim(),
        title: match[1].trim(),
        startDate: null,
        endDate: null,
        bullets: [],
      }
      if (dates) {
        const dateParts = dates.split(/[-–]/).map((d) => d.trim())
        currentEntry.startDate = dateParts[0] || null
        currentEntry.endDate = dateParts[1] || null
      }
      continue
    }

    // Non-bullet, non-date line — likely a company name or job title
    // In PDF resumes, often:
    // Line 1: Company Name + Location
    // Line 2: Job Title + Dates
    if (!currentEntry || (currentEntry.title && currentEntry.startDate)) {
      // Start a new entry — this line is likely the company name
      if (currentEntry) {
        entries.push(currentEntry)
      }
      // Handle concatenated company+location: "Driving ForwardChicago, IL"
      let companyName = main || trimmed
      if (!location) {
        const embeddedLoc = companyName.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\s*$/)
        if (embeddedLoc) {
          const locIdx = companyName.lastIndexOf(embeddedLoc[1])
          const before = companyName.slice(0, locIdx).trim()
          if (before.length > 2) {
            companyName = before
          }
        }
      }
      currentEntry = {
        company: companyName,
        title: null,
        startDate: null,
        endDate: null,
        bullets: [],
      }
      if (dates) {
        const dateParts = dates.split(/[-–]/).map((d) => d.trim())
        currentEntry.startDate = dateParts[0] || null
        currentEntry.endDate = dateParts[1] || null
      }
    } else if (currentEntry && !currentEntry.title) {
      // Second line — this is the title
      currentEntry.title = main || trimmed
      if (dates) {
        const dateParts = dates.split(/[-–]/).map((d) => d.trim())
        currentEntry.startDate = dateParts[0] || null
        currentEntry.endDate = dateParts[1] || null
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
  const nonEmpty = lines.filter((l) => l.trim())

  if (nonEmpty.length === 0) return skills

  for (const line of nonEmpty) {
    const trimmed = line.trim()

    // Skip non-skill lines like "Interest: Soccer, Geoguessr"
    if (/^(?:interest|hobbies|activities)[:\s]/i.test(trimmed)) {
      continue
    }

    // Handle "Category: skill1, skill2, skill3" format
    // e.g. "Languages & Frameworks: Python, Java, C, React"
    // e.g. "Tools & Technologies: GitHub, Git, PyTorch"
    const categoryMatch = trimmed.match(/^([^:]+):\s*(.+)/)
    if (categoryMatch) {
      const items = categoryMatch[2]
      // Split by comma, clean up trailing "and X" patterns
      const parts = items.split(",").map((s) => s.trim().replace(/^and\s+/i, "")).filter(Boolean)
      skills.push(...parts)
      continue
    }

    // Plain comma-separated line
    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((s) => s.trim().replace(/^and\s+/i, "")).filter(Boolean)
      skills.push(...parts)
    } else if (trimmed.includes("|")) {
      const parts = trimmed.split("|").map((s) => s.trim()).filter(Boolean)
      skills.push(...parts)
    } else if (trimmed.length > 0) {
      // Single skill per line
      skills.push(trimmed)
    }
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

    // 1. Check for project header line: "Name – description" with en-dash
    const dashMatch = trimmed.match(/^(.+?)\s*[–]\s+(.+)$/)
    if (dashMatch && !/^[•]/.test(trimmed)) {
      if (currentEntry) entries.push(currentEntry)
      currentEntry = {
        name: dashMatch[1].trim(),
        description: dashMatch[2].trim(),
        url: null,
        technologies: [],
      }
      continue
    }

    // 2. URL + tech line: "github.com/...|Python, React, Node.js"
    if (/\|/.test(trimmed) && trimmed.length > 10) {
      const parts = splitByPipes(trimmed)
      if (currentEntry) {
        for (const part of parts) {
          if (URL_REGEX.test(part) && /(?:github|gitlab|bitbucket|heroku|render|vercel|netlify)/i.test(part)) {
            currentEntry.url = part.startsWith("http") ? part : `https://${part}`
          } else {
            // Technologies — split by comma
            const techs = part.split(",").map((t) => t.trim()).filter(Boolean)
            currentEntry.technologies.push(...techs)
          }
        }
      }
      continue
    }

    // 3. Plain URL line
    if (/(?:github|gitlab|bitbucket|heroku|render|vercel|netlify)/i.test(trimmed) && URL_REGEX.test(trimmed)) {
      if (currentEntry) {
        const urlMatch = trimmed.match(URL_REGEX)
        if (urlMatch) {
          currentEntry.url = urlMatch[0].startsWith("http") ? urlMatch[0] : `https://${urlMatch[0]}`
        }
      }
      continue
    }

    // 4. Technologies line: "Technologies: ..."
    const techMatch = trimmed.match(/^(?:Technologies|Tech\s*Stack|Built\s*with)[:\s]*(.+)/i)
    if (techMatch && currentEntry) {
      currentEntry.technologies = techMatch[1].split(",").map((t) => t.trim()).filter(Boolean)
      continue
    }

    // 5. Bullet point — append to current entry's description
    if (/^[•]/.test(trimmed)) {
      if (currentEntry) {
        const text = trimmed.replace(/^[•]\s*/, "")
        if (!currentEntry.description) {
          currentEntry.description = text
        } else {
          currentEntry.description += " " + text
        }
      }
      continue
    }

    // 6. Anything else — if we have no entry, start one; otherwise append to description
    if (!currentEntry) {
      currentEntry = { name: trimmed, description: null, url: null, technologies: [] }
    } else {
      if (!currentEntry.description) {
        currentEntry.description = trimmed
      } else {
        currentEntry.description += " " + trimmed
      }
    }
  }

  if (currentEntry) entries.push(currentEntry)
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

/**
 * Merge broken lines within a section's lines array.
 * PDF extraction breaks lines mid-sentence. We merge lines that are continuations
 * of the previous line (not bullets, not new entries, not headers).
 */
function mergeBrokenLines(lines: string[]): string[] {
  const merged: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (!trimmed) {
      merged.push("")
      continue
    }

    if (merged.length === 0 || !merged[merged.length - 1].trim()) {
      merged.push(lines[i])
      continue
    }

    const prevTrimmed = merged[merged.length - 1].trim()

    // Is this a "new logical line" within a section?
    const isNewLogicalLine =
      // Bullet point (Unicode bullet, dash, or asterisk at start)
      /^[•\-*]/.test(trimmed) ||
      // Previous line ends with period/closing punctuation — next line is a new statement
      /[.!?]$/.test(prevTrimmed) ||
      // Lines that START with school keywords (not just contain them in body text)
      /^(?:The\s+)?(?:University|College|Institute|School)\b/i.test(trimmed) ||
      // Or lines that have "University of X" / "X University" as the main content (short lines)
      (trimmed.length < 60 && /\b(?:University|College|Institute)\b/i.test(trimmed) && /^[A-Z]/.test(trimmed)) ||
      // Degree lines
      (trimmed.length > 10 && /(?:Bachelor|Master|B\.S\.|M\.S\.|B\.A\.|M\.A\.|Ph\.?D|Associate)/i.test(trimmed)) ||
      // Lines with pipe separator (tech stacks)
      (trimmed.includes("|") && trimmed.length > 10) ||
      // Lines matching "Something – description" pattern (project headers, en-dash)
      /^[A-Z][\w\s-]+[–]\s+/.test(trimmed) ||
      // Lines with date ranges (job title/company lines)
      DATE_RANGE_REGEX.test(trimmed) ||
      // Lines that start with a category label like "Languages & Frameworks:"
      /^[A-Z][^:]+:\s*\S/.test(trimmed) ||
      // GPA lines
      /^GPA/i.test(trimmed) ||
      // Coursework lines
      /^(?:Relevant\s+)?Coursework/i.test(trimmed)

    if (isNewLogicalLine) {
      merged.push(lines[i])
    } else {
      // Merge with previous line
      const prev = merged[merged.length - 1]
      // Handle word-break hyphens: "extrac-" + "tion" → "extraction"
      if (prev.trimEnd().endsWith("-") && /^[a-z]/.test(trimmed)) {
        merged[merged.length - 1] = prev.trimEnd().slice(0, -1) + trimmed
      } else {
        merged[merged.length - 1] = prev.trimEnd() + " " + trimmed
      }
    }
  }

  return merged
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim()
  for (const pattern of Object.values(SECTION_PATTERNS)) {
    if (pattern.test(trimmed)) return true
  }
  return false
}

export function parseResumeText(rawText: string): ParsedProfile {
  const profile = emptyProfile()

  if (!rawText.trim()) {
    return profile
  }

  const lines = rawText.split("\n")
  const { headerLines, sections } = detectSections(lines)

  // Merge broken lines within sections that have bullet-style content (wrapping is common)
  // Don't merge skills, certifications, publications — each line is typically a standalone item
  const sectionsToMerge = new Set(["education", "experience", "projects", "volunteer"])
  for (const section of sections) {
    if (sectionsToMerge.has(section.type)) {
      section.lines = mergeBrokenLines(section.lines)
    }
  }

  // Extract contact info from header lines
  profile.contactInfo = extractContactInfo(headerLines)

  // If no sections detected, everything goes to otherText
  if (sections.length === 0) {
    profile.otherText = rawText.trim()
    return profile
  }

  // Process each section
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
        otherParts.push(section.lines.join("\n").trim())
        break
    }
  }

  if (otherParts.length > 0) {
    profile.otherText = otherParts.filter(Boolean).join("\n\n")
  }

  return profile
}
