import { describe, it, expect } from "vitest"
import { parseResumeText } from "@/lib/resume-parser"
import type { ParsedProfile } from "@/types/profile"

describe("parseResumeText", () => {
  it("returns ParsedProfile shape with all required fields", () => {
    const result = parseResumeText("")
    expect(result).toHaveProperty("contactInfo")
    expect(result).toHaveProperty("education")
    expect(result).toHaveProperty("workHistory")
    expect(result).toHaveProperty("projects")
    expect(result).toHaveProperty("certifications")
    expect(result).toHaveProperty("skills")
    expect(result).toHaveProperty("volunteerWork")
    expect(result).toHaveProperty("publications")
    expect(result).toHaveProperty("otherText")
  })

  it("returns empty ParsedProfile with no errors for empty string input", () => {
    const result = parseResumeText("")
    expect(result.contactInfo.name).toBeNull()
    expect(result.contactInfo.email).toBeNull()
    expect(result.education).toEqual([])
    expect(result.workHistory).toEqual([])
    expect(result.projects).toEqual([])
    expect(result.certifications).toEqual([])
    expect(result.skills).toEqual([])
    expect(result.volunteerWork).toEqual([])
    expect(result.publications).toEqual([])
    expect(result.otherText).toBe("")
  })

  it("extracts contact info: email via regex", () => {
    const text = `John Smith
john.smith@example.com
(555) 123-4567
https://linkedin.com/in/johnsmith
https://johnsmith.dev
San Francisco, CA

EDUCATION
MIT`
    const result = parseResumeText(text)
    expect(result.contactInfo.email).toBe("john.smith@example.com")
  })

  it("extracts contact info: phone via regex", () => {
    const text = `Jane Doe
jane@example.com
(555) 123-4567

EDUCATION
Some University`
    const result = parseResumeText(text)
    expect(result.contactInfo.phone).toBe("(555) 123-4567")
  })

  it("extracts contact info: LinkedIn URL", () => {
    const text = `Jane Doe
jane@example.com
https://linkedin.com/in/janedoe

SKILLS
JavaScript`
    const result = parseResumeText(text)
    expect(result.contactInfo.linkedIn).toBe("https://linkedin.com/in/janedoe")
  })

  it("extracts contact info: name from first line", () => {
    const text = `John Smith
john@example.com

EDUCATION
MIT`
    const result = parseResumeText(text)
    expect(result.contactInfo.name).toBe("John Smith")
  })

  it("detects Education section and extracts school name, degree, dates", () => {
    const text = `John Smith
john@example.com

EDUCATION
MIT, Bachelor of Science in Computer Science, 2020-2024
GPA: 3.8`
    const result = parseResumeText(text)
    expect(result.education.length).toBeGreaterThanOrEqual(1)
    expect(result.education[0].school).toContain("MIT")
  })

  it("detects Experience/Work History section and extracts company, title, dates, bullets", () => {
    const text = `Jane Doe
jane@example.com

EXPERIENCE
Software Engineer, Google
June 2022 - Present
- Built scalable APIs serving 1M requests/day
- Led migration from monolith to microservices
- Mentored 3 junior engineers`
    const result = parseResumeText(text)
    expect(result.workHistory.length).toBeGreaterThanOrEqual(1)
    expect(result.workHistory[0].bullets.length).toBeGreaterThanOrEqual(1)
  })

  it("detects Skills section and extracts comma-separated skill names", () => {
    const text = `John Smith
john@example.com

SKILLS
JavaScript, TypeScript, React, Node.js, Python, PostgreSQL`
    const result = parseResumeText(text)
    expect(result.skills.length).toBeGreaterThanOrEqual(3)
    expect(result.skills).toContain("JavaScript")
    expect(result.skills).toContain("TypeScript")
  })

  it("detects Projects section and extracts project name and description", () => {
    const text = `John Smith
john@example.com

PROJECTS
AutoApply Bot
An automated job application tool built with Next.js and Playwright
https://github.com/john/autoapply
Technologies: Next.js, Playwright, PostgreSQL`
    const result = parseResumeText(text)
    expect(result.projects.length).toBeGreaterThanOrEqual(1)
    expect(result.projects[0].name).toBeTruthy()
  })

  it("detects Certifications section and extracts certification names", () => {
    const text = `John Smith
john@example.com

CERTIFICATIONS
AWS Solutions Architect Associate
Google Cloud Professional Data Engineer
Certified Kubernetes Administrator`
    const result = parseResumeText(text)
    expect(result.certifications.length).toBeGreaterThanOrEqual(2)
    expect(result.certifications).toContain("AWS Solutions Architect Associate")
  })

  it("detects Volunteer section and extracts organization and role", () => {
    const text = `Jane Doe
jane@example.com

VOLUNTEER EXPERIENCE
Code.org, Volunteer Instructor
September 2021 - May 2022
Taught introductory programming to high school students`
    const result = parseResumeText(text)
    expect(result.volunteerWork.length).toBeGreaterThanOrEqual(1)
    expect(result.volunteerWork[0].organization).toBeTruthy()
  })

  it("puts unrecognized content into otherText (fallback behavior)", () => {
    const text = `John Smith
john@example.com

REFERENCES
Available upon request

HOBBIES
Rock climbing, photography`
    const result = parseResumeText(text)
    expect(result.otherText).toContain("Available upon request")
  })

  it("puts everything in otherText when no section headers recognized", () => {
    const text = `This is just some random text without any section headers.
It has multiple lines but nothing that looks like a resume section.
Just plain text content here.`
    const result = parseResumeText(text)
    expect(result.otherText).toContain("random text")
    expect(result.education).toEqual([])
    expect(result.workHistory).toEqual([])
    expect(result.skills).toEqual([])
  })
})
