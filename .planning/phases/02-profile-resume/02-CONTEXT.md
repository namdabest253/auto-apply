# Phase 2: Profile & Resume - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

User builds a complete applicant profile from an uploaded resume and manual edits. Includes resume upload/parsing into structured fields, manual profile editing, job preference configuration, and a saved Q&A bank for common application form questions. Profile data is stored in a structured format ready for downstream AI tailoring and form automation.

</domain>

<decisions>
## Implementation Decisions

### Resume Parsing
- Rule-based extraction (no AI API calls) — use regex/heuristics to identify resume sections
- Server-side text extraction: pdf-parse for PDF, mammoth for DOCX
- Extract extended fields: contact info, education (school, degree, dates, GPA, coursework), work history (company, title, dates, bullets), projects, certifications, volunteer work, publications, skills list
- All parsed fields are manually editable after extraction
- On parse failure for a section: raw text fallback — show unparsed content in an "Other" field so nothing is lost

### Resume File Handling
- Drag-and-drop upload zone with "Browse files" button fallback
- PDF and DOCX only, 5MB file size limit
- Store both: original file on disk + parsed data in database
- Re-upload replaces old file and re-parses — previous parsed data overwritten (single-resume model)

### Job Preferences
- All on same page as profile, in a separate section with clear dividers
- Location: free-text tags (user types location names like "New York", "Remote", "Bay Area")
- Role types and industries: predefined multi-select list (e.g. "Software Engineering", "Data Science", "Product Management")
- Keywords: tag input with add/remove (user types keywords one at a time, each becomes a removable tag)

### Application Q&A Bank
- Users can save answers to common application form questions (e.g. "Are you a U.S. citizen?", "Do you require sponsorship?", "Are you authorized to work in the US?")
- Each Q&A entry has a question text and stored answer
- Downstream automation (Phase 8) pulls from this bank to auto-fill matching form questions
- Users can add, edit, and remove Q&A entries manually

### Claude's Discretion
- Profile editing UI layout details (tabs vs accordion vs single scroll for profile sections)
- Exact predefined lists for role types and industries
- File storage location strategy (local filesystem path structure)
- Q&A bank matching strategy (exact match vs fuzzy match — implementation detail for Phase 8)
- Loading states and progress indicators during resume parsing

</decisions>

<specifics>
## Specific Ideas

- Q&A bank is a key differentiator — common questions like citizenship, work authorization, start date availability should be answerable once and reused across all applications
- Resume parsing should be thorough — extract everything possible, let user clean up manually rather than miss data
- Single-resume model keeps it simple — user has one active resume at a time

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx`: Card component for profile sections
- `src/components/ui/button.tsx`: Button component for actions
- `src/components/ui/input.tsx`: Input component for form fields
- `src/components/ui/label.tsx`: Label component for form labels
- `src/components/nav/top-nav.tsx`: Top navigation — add "Profile" link
- `src/lib/prisma.ts`: Prisma client singleton for database access
- `src/lib/validators.ts`: Validation utilities — extend for profile validation

### Established Patterns
- shadcn/ui (Radix UI + Tailwind CSS) for all UI components
- Dark mode default with zinc palette
- Server actions in co-located `actions.ts` files (see login/register pattern)
- API routes under `src/app/api/`

### Integration Points
- Prisma schema needs new models: Profile, Education, WorkHistory, Skill, Project, Certification, JobPreference, QAEntry
- User model already exists — profile connects via userId
- Dashboard layout at `src/app/(dashboard)/layout.tsx` — add profile page route
- Top nav needs "Profile" link added

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-profile-resume*
*Context gathered: 2026-03-07*
