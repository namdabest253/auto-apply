# Phase 2: Profile & Resume - Research

**Researched:** 2026-03-07
**Domain:** Resume parsing, profile management, file upload in Next.js 15
**Confidence:** HIGH

## Summary

This phase adds resume upload/parsing, profile editing, job preferences, and a Q&A bank. The core challenge is server-side file handling (upload, save to disk, extract text) combined with rule-based parsing of unstructured resume text into structured fields. The stack decision is locked: pdf-parse for PDF text extraction, mammoth for DOCX text extraction, with regex/heuristic section detection -- no AI API calls.

The Prisma schema needs significant expansion (7-8 new models). The UI needs several new shadcn/ui components (tabs, textarea, badge, select, separator, dialog). File uploads use a Next.js API route (not server action, since server actions have a 1MB default body size limit that is too low for 5MB files). All profile data feeds downstream phases (AI tailoring, form automation).

**Primary recommendation:** Use an API route for file upload (bypasses server action size limits), server actions for all CRUD operations, and a single scrollable profile page with clear section dividers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rule-based extraction (no AI API calls) -- use regex/heuristics to identify resume sections
- Server-side text extraction: pdf-parse for PDF, mammoth for DOCX
- Extract extended fields: contact info, education (school, degree, dates, GPA, coursework), work history (company, title, dates, bullets), projects, certifications, volunteer work, publications, skills list
- All parsed fields are manually editable after extraction
- On parse failure for a section: raw text fallback -- show unparsed content in an "Other" field so nothing is lost
- Drag-and-drop upload zone with "Browse files" button fallback
- PDF and DOCX only, 5MB file size limit
- Store both: original file on disk + parsed data in database
- Re-upload replaces old file and re-parses -- previous parsed data overwritten (single-resume model)
- Location: free-text tags (user types location names)
- Role types and industries: predefined multi-select list
- Keywords: tag input with add/remove
- Q&A bank: question text + stored answer, add/edit/remove entries manually
- All preferences on same page as profile, in a separate section with clear dividers

### Claude's Discretion
- Profile editing UI layout details (tabs vs accordion vs single scroll for profile sections)
- Exact predefined lists for role types and industries
- File storage location strategy (local filesystem path structure)
- Q&A bank matching strategy (exact match vs fuzzy match -- implementation detail for Phase 8)
- Loading states and progress indicators during resume parsing

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-02 | User can upload resume (PDF/DOCX) and have it parsed into structured data | pdf-parse + mammoth for text extraction, regex-based section parser, API route for upload, file saved to disk + parsed data to DB |
| AUTH-03 | User can manually edit parsed profile (education, work history, skills) | Prisma models for all profile sections, server actions for CRUD, shadcn/ui form components |
| AUTH-04 | User can set job preferences (location, role type, industries, keywords) | JobPreference model, tag input UI pattern, predefined select lists, server actions for save |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-parse | ^2.4.5 | Extract text from PDF files | Most popular Node.js PDF text extraction; simple API: `pdfParse(buffer)` returns `{ text, numpages, info }` |
| mammoth | ^1.11.0 | Extract text from DOCX files | Standard DOCX-to-text converter; `mammoth.extractRawText({buffer})` returns `{ value: string }` |
| zod | ^4.3.6 (installed) | Validate profile data, file metadata | Already in project; extend validators.ts |
| prisma | ^7.4.2 (installed) | Database models for profile data | Already in project; add new models to schema |

### Supporting (shadcn/ui components to install)
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| tabs | Profile section navigation (if using tabs layout) | Optional layout choice |
| textarea | Multi-line text editing (work bullets, Q&A answers) | Profile editing, Q&A bank |
| badge | Tag display for skills, locations, keywords | Tag input display |
| select | Predefined role type / industry selection | Job preferences |
| separator | Visual dividers between profile sections | Profile page layout |
| dialog | Confirm destructive actions (delete entries, re-upload) | UX safety |
| accordion | Collapsible profile sections (alternative to tabs) | Optional layout choice |

### Not Needed
| Instead of | Why Not |
|------------|---------|
| multer | Not needed in Next.js App Router; native FormData + fs handles file writes |
| formidable | Same as above; Next.js handles multipart natively |
| Any AI/LLM library | Locked decision: rule-based parsing only |
| S3/cloud storage | Local disk storage for single-user app |

**Installation:**
```bash
npm install pdf-parse mammoth
npx shadcn@latest add textarea badge select separator dialog accordion
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(dashboard)/
    profile/
      page.tsx              # Profile page (server component, data fetching)
      actions.ts            # Server actions: saveProfile, savePreferences, saveQA, deleteQA
      components/
        resume-upload.tsx   # Client component: drag-drop upload zone
        profile-editor.tsx  # Client component: editable profile sections
        job-preferences.tsx # Client component: preferences form
        qa-bank.tsx         # Client component: Q&A entries
        tag-input.tsx       # Reusable tag input (for locations, keywords, skills)
        section-editor.tsx  # Reusable section for education/work/etc entries
  app/api/
    resume/
      upload/
        route.ts            # POST: receive file, save to disk, extract text, parse, save to DB
  lib/
    resume-parser.ts        # Pure function: raw text -> structured profile data
    resume-parser.test.ts   # Unit tests for parser (most critical tests in this phase)
    validators.ts           # Extended with profile schemas
  types/
    profile.ts              # TypeScript types for parsed profile data
prisma/
  schema.prisma             # Extended with Profile, Education, WorkHistory, etc.
uploads/
  resumes/                  # Original resume files stored here (gitignored)
```

### Pattern 1: API Route for File Upload
**What:** Use an API route (not server action) for the resume upload endpoint.
**When to use:** File uploads exceeding 1MB (server actions default limit).
**Why:** Server actions have a default 1MB body size limit configured via `serverActions.bodySizeLimit` in next.config. While configurable, an API route is more natural for file handling and allows streaming large files.

```typescript
// src/app/api/resume/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import pdfParse from "pdf-parse"
import mammoth from "mammoth"
import { parseResumeText } from "@/lib/resume-parser"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("resume") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file type and size
  const validTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF and DOCX files accepted" }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Save original file to disk
  const uploadDir = join(process.cwd(), "uploads", "resumes")
  await mkdir(uploadDir, { recursive: true })
  const ext = file.type === "application/pdf" ? ".pdf" : ".docx"
  const filename = `${session.user.id}${ext}`
  await writeFile(join(uploadDir, filename), buffer)

  // Extract text
  let rawText: string
  if (file.type === "application/pdf") {
    const parsed = await pdfParse(buffer)
    rawText = parsed.text
  } else {
    const result = await mammoth.extractRawText({ buffer })
    rawText = result.value
  }

  // Parse into structured data
  const profileData = parseResumeText(rawText)

  // Save to database (upsert pattern -- single resume model)
  // ... prisma operations here

  return NextResponse.json({ success: true, profile: profileData })
}
```

### Pattern 2: Rule-Based Resume Parser (Pure Function)
**What:** A stateless function that takes raw text and returns structured profile data using regex and heuristics.
**When to use:** All resume text extraction.
**Why:** Testable, no side effects, easy to improve incrementally.

```typescript
// src/lib/resume-parser.ts
export interface ParsedProfile {
  contactInfo: {
    name: string | null
    email: string | null
    phone: string | null
    linkedIn: string | null
    website: string | null
    location: string | null
  }
  education: EducationEntry[]
  workHistory: WorkEntry[]
  projects: ProjectEntry[]
  certifications: string[]
  skills: string[]
  volunteerWork: VolunteerEntry[]
  publications: string[]
  otherText: string  // Fallback for unparsed content
}

export function parseResumeText(rawText: string): ParsedProfile {
  // 1. Detect section headers via regex patterns
  // 2. Split text into sections
  // 3. Parse each section with section-specific logic
  // 4. Collect unparsed content into otherText
  // ...
}

// Section header detection patterns
const SECTION_PATTERNS = {
  education: /\b(education|academic|university|degree|school)\b/i,
  experience: /\b(experience|employment|work\s*history|professional)\b/i,
  skills: /\b(skills|technical\s*skills|proficiencies|technologies)\b/i,
  projects: /\b(projects|personal\s*projects|portfolio)\b/i,
  certifications: /\b(certifications?|licenses?|credentials?)\b/i,
  volunteer: /\b(volunteer|community|service)\b/i,
  publications: /\b(publications?|papers?|research)\b/i,
}
```

### Pattern 3: Server Actions for CRUD
**What:** Co-located server actions for profile/preferences/QA CRUD operations.
**When to use:** All save/update/delete operations on profile data.
**Why:** Follows established project pattern from auth actions.

```typescript
// src/app/(dashboard)/profile/actions.ts
"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function saveEducation(data: EducationFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.education.upsert({
    where: { id: data.id ?? "" },
    update: { ...data, userId: session.user.id },
    create: { ...data, userId: session.user.id },
  })

  revalidatePath("/profile")
}
```

### Pattern 4: Tag Input Component
**What:** Reusable client component for adding/removing tags (used for skills, locations, keywords).
**When to use:** Any field that stores multiple string values as tags.

```typescript
// src/app/(dashboard)/profile/components/tag-input.tsx
"use client"

import { useState, KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onTagsChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      if (!tags.includes(inputValue.trim())) {
        onTagsChange([...tags, inputValue.trim()])
      }
      setInputValue("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-1">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Server action for file upload:** Server actions default to 1MB body limit. Use an API route instead.
- **Client-side PDF parsing:** pdf-parse and mammoth are Node.js libraries. Parse server-side only.
- **Storing parsed data as JSON blob:** Use normalized Prisma models (Education, WorkHistory, etc.) for queryability. The profile is consumed by AI tailoring and form automation downstream.
- **Deleting original file on re-upload before new save succeeds:** Save new file first, delete old file after successful DB update.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | pdf-parse | PDF format is complex (fonts, encodings, layouts); pdf-parse handles edge cases |
| DOCX text extraction | Custom XML parser | mammoth.extractRawText | DOCX is a zip of XML files; mammoth handles the full spec |
| Drag-and-drop file upload | Custom drag-drop handlers | HTML5 native dragover/drop events with a thin wrapper | Browser APIs are sufficient; no library needed |
| Multi-select with predefined options | Custom dropdown | shadcn/ui Select or Combobox | Accessibility, keyboard nav, styling already handled |
| Tag input with removable badges | Custom tag system | Thin wrapper over Input + Badge (see pattern above) | Simple enough that a library is overkill, but don't skip the Badge component |

**Key insight:** The resume parser (regex/heuristics) is the only truly custom code in this phase. Everything else uses existing libraries or UI components.

## Common Pitfalls

### Pitfall 1: PDF Text Extraction Produces Garbage
**What goes wrong:** Some PDFs (especially designed resumes) use complex layouts, columns, or embedded fonts that result in jumbled text extraction.
**Why it happens:** pdf-parse extracts text in reading order which may not match visual layout for multi-column resumes.
**How to avoid:** The locked decision already handles this -- raw text fallback into "Other" field when section parsing fails. Log the raw text for debugging. Don't try to handle every edge case; let users manually edit.
**Warning signs:** Extracted text has interleaved lines from different columns, or missing text.

### Pitfall 2: File Upload Size Limits
**What goes wrong:** Upload silently fails or returns cryptic error for files near the size limit.
**Why it happens:** Next.js server actions default to 1MB, and API routes may have their own limits.
**How to avoid:** Use API route (not server action) for upload. Validate file size client-side BEFORE upload. Return clear error messages.
**Warning signs:** 413 errors, silent failures on larger PDFs.

### Pitfall 3: Prisma Schema Migration Complexity
**What goes wrong:** Adding 7+ models with relations can cause migration issues if not planned carefully.
**Why it happens:** Foreign key constraints, cascading deletes, and optional vs required fields need thought.
**How to avoid:** Plan the full schema before running `prisma migrate dev`. Use `onDelete: Cascade` on Profile -> child relations so deleting a profile cleans up. Make Profile -> User a 1:1 relation.
**Warning signs:** Migration errors, orphaned records, constraint violations.

### Pitfall 4: Race Condition on Re-Upload
**What goes wrong:** User uploads new resume while previous upload is still processing.
**Why it happens:** No locking or debouncing on the upload endpoint.
**How to avoid:** Disable upload button while processing. Show loading state. On the server, use upsert operations so the last write wins cleanly.
**Warning signs:** Duplicate profile entries, partial data.

### Pitfall 5: Losing Form State on Navigation
**What goes wrong:** User edits profile fields, navigates away, loses unsaved changes.
**Why it happens:** No dirty-state tracking or save confirmation.
**How to avoid:** Auto-save on blur/change with debounce, or show "unsaved changes" warning. For this phase, explicit save buttons per section are simpler and sufficient.
**Warning signs:** User complaints about lost data.

## Code Examples

### Prisma Schema Extension
```prisma
// Add to prisma/schema.prisma

model Profile {
  id              String          @id @default(cuid())
  userId          String          @unique
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  resumeFileName  String?
  resumeFilePath  String?
  contactName     String?
  contactEmail    String?
  contactPhone    String?
  contactLinkedIn String?
  contactWebsite  String?
  contactLocation String?
  otherText       String?         // Unparsed resume content fallback
  education       Education[]
  workHistory     WorkHistory[]
  projects        Project[]
  certifications  Certification[]
  skills          Skill[]
  volunteerWork   VolunteerWork[]
  publications    Publication[]
  jobPreferences  JobPreference?
  qaEntries       QAEntry[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model Education {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  school      String
  degree      String?
  fieldOfStudy String?
  startDate   String?
  endDate     String?
  gpa         String?
  coursework  String?
  sortOrder   Int      @default(0)
}

model WorkHistory {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  company     String
  title       String?
  startDate   String?
  endDate     String?
  bullets     String[] // Array of bullet point strings
  sortOrder   Int      @default(0)
}

model Project {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  name        String
  description String?
  url         String?
  technologies String[]
  sortOrder   Int      @default(0)
}

model Certification {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  name        String
  issuer      String?
  date        String?
  sortOrder   Int      @default(0)
}

model Skill {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  name        String
}

model VolunteerWork {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  organization String
  role        String?
  startDate   String?
  endDate     String?
  description String?
  sortOrder   Int      @default(0)
}

model Publication {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  title       String
  venue       String?
  date        String?
  url         String?
  sortOrder   Int      @default(0)
}

model JobPreference {
  id          String   @id @default(cuid())
  profileId   String   @unique
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  locations   String[] // Free-text tags
  roleTypes   String[] // From predefined list
  industries  String[] // From predefined list
  keywords    String[] // User-defined tags
}

model QAEntry {
  id          String   @id @default(cuid())
  profileId   String
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  question    String
  answer      String
  sortOrder   Int      @default(0)
}
```

Note: Also add `profile Profile?` relation field to the existing User model.

### Text Extraction
```typescript
// pdf-parse usage
import pdfParse from "pdf-parse"
const buffer = Buffer.from(await file.arrayBuffer())
const result = await pdfParse(buffer)
const text = result.text // full extracted text

// mammoth usage
import mammoth from "mammoth"
const buffer = Buffer.from(await file.arrayBuffer())
const result = await mammoth.extractRawText({ buffer })
const text = result.value // full extracted text
```

### Drag-and-Drop Upload Zone
```typescript
"use client"
import { useState, useCallback, DragEvent } from "react"

export function ResumeUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await uploadFile(file)
  }, [])

  const uploadFile = async (file: File) => {
    setError(null)
    // Client-side validation
    const validTypes = ["application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (!validTypes.includes(file.type)) {
      setError("Only PDF and DOCX files are accepted")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append("resume", file)

    const res = await fetch("/api/resume/upload", { method: "POST", body: formData })
    const data = await res.json()
    setIsUploading(false)

    if (!res.ok) {
      setError(data.error || "Upload failed")
      return
    }
    onUploadComplete()
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-zinc-700"}
        ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
    >
      {isUploading ? (
        <p>Parsing resume...</p>
      ) : (
        <>
          <p>Drag and drop your resume here</p>
          <p className="text-sm text-zinc-400 mt-1">PDF or DOCX, up to 5MB</p>
          <label className="mt-4 inline-block cursor-pointer">
            <span className="text-blue-400 hover:underline">Browse files</span>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
          </label>
        </>
      )}
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| multer/formidable for uploads | Native FormData in Next.js API routes | Next.js 13+ (2023) | No upload middleware needed |
| getServerSideProps for data | Server components + server actions | Next.js 13+ (2023) | Simpler data flow |
| Prisma `@prisma/client` direct URL | Prisma 7 driver adapter (PrismaPg) | Prisma 7 (2025) | Already set up in project |
| `pages/api` routes | `app/api` route handlers | Next.js 13+ (2023) | Already using in project |

## Open Questions

1. **pdf-parse type definitions**
   - What we know: pdf-parse v2.x exists; `@types/pdf-parse` may or may not be current
   - What's unclear: Whether types ship with the package or need separate install
   - Recommendation: Install pdf-parse, check if types are bundled. If not, install `@types/pdf-parse` or create a local declaration file.

2. **Resume parser accuracy**
   - What we know: Regex-based parsing will miss edge cases (creative resumes, unusual formatting)
   - What's unclear: How many resume formats the initial parser should handle
   - Recommendation: Start with standard chronological resume format. The "Other" field fallback ensures no data is lost. Iterate parser improvements based on real usage.

3. **Predefined role types and industries lists**
   - What we know: User wants predefined multi-select for these fields
   - What's unclear: Exact list contents
   - Recommendation: Use a reasonable default list (15-25 items each) based on common internship categories. Store as constants, easy to extend later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `/root/job/vitest.config.mts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | Resume text extraction (PDF) | unit | `npx vitest run src/lib/resume-parser.test.ts -t "pdf"` | No - Wave 0 |
| AUTH-02 | Resume text extraction (DOCX) | unit | `npx vitest run src/lib/resume-parser.test.ts -t "docx"` | No - Wave 0 |
| AUTH-02 | Resume section parsing (regex) | unit | `npx vitest run src/lib/resume-parser.test.ts -t "parse"` | No - Wave 0 |
| AUTH-02 | Upload API route validation | unit | `npx vitest run src/__tests__/api/resume-upload.test.ts` | No - Wave 0 |
| AUTH-03 | Profile CRUD server actions | unit | `npx vitest run src/__tests__/profile/actions.test.ts` | No - Wave 0 |
| AUTH-04 | Job preferences save/load | unit | `npx vitest run src/__tests__/profile/preferences.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/resume-parser.test.ts` -- covers AUTH-02 (parser logic, most critical)
- [ ] `src/__tests__/api/resume-upload.test.ts` -- covers AUTH-02 (upload validation)
- [ ] `src/__tests__/profile/actions.test.ts` -- covers AUTH-03 (profile CRUD)
- [ ] `src/__tests__/profile/preferences.test.ts` -- covers AUTH-04 (preferences)

## Sources

### Primary (HIGH confidence)
- Project codebase: Prisma schema, existing patterns, package.json (direct inspection)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse) - API: `pdfParse(buffer)` returns `{ text, numpages, info }`
- [mammoth npm](https://www.npmjs.com/package/mammoth) - API: `mammoth.extractRawText({buffer})` returns `{ value }`
- [mammoth GitHub](https://github.com/mwilliamson/mammoth.js/) - extractRawText documentation

### Secondary (MEDIUM confidence)
- [Next.js file upload patterns](https://www.pronextjs.dev/next-js-file-uploads-server-side-solutions) - Server action vs API route tradeoffs
- [Next.js file upload tutorial](https://strapi.io/blog/epic-next-js-15-tutorial-part-5-file-upload-using-server-actions) - FormData + fs.writeFile pattern
- [shadcn/ui components](https://ui.shadcn.com/docs/components) - Available component list

### Tertiary (LOW confidence)
- Resume parsing regex patterns are based on general knowledge; will need iterative refinement against real resumes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pdf-parse and mammoth are well-documented, simple APIs verified via npm
- Architecture: HIGH - follows established project patterns (server actions, API routes, Prisma)
- Pitfalls: HIGH - file upload limits, PDF extraction quality are well-known issues
- Resume parser regex: MEDIUM - will need iteration; fallback strategy mitigates risk

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable domain, no fast-moving dependencies)
