# Roadmap: AutoApply

## Overview

AutoApply is built as a pipeline: profile data feeds job discovery, which feeds AI generation, which feeds a review queue, which feeds browser automation submission. The phases follow this data flow, starting with foundation and auth, building up profile management, then layering on scraping infrastructure, expanding platform coverage, adding AI generation, building the review interface, implementing browser automation, and hardening the submission pipeline. Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Project scaffolding, database, authentication, and app shell (completed 2026-03-07)
- [ ] **Phase 2: Profile & Resume** - Resume upload/parsing, profile editing, and job preferences
- [ ] **Phase 3: Scraping Infrastructure** - Queue system, stealth browser setup, and first two platform scrapers
- [ ] **Phase 4: Extended Platform Scrapers** - Additional platform adapters for Lever, Workday, LinkedIn, and Handshake
- [ ] **Phase 5: Discovery Features** - Job filtering, match scoring, scheduled discovery, and deduplication
- [ ] **Phase 6: AI Generation** - Resume tailoring, cover letter generation, provider abstraction, and hallucination detection
- [ ] **Phase 7: Review Queue** - Batch review interface with approve/reject/edit and diff view
- [ ] **Phase 8: Browser Automation** - Form filling engine, ATS submission adapters, and CAPTCHA solving
- [ ] **Phase 9: Submission Hardening** - Screenshot capture, application logging, rate limits, and circuit breakers

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: User can access a running web application with secure authentication
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01
**Success Criteria** (what must be TRUE):
  1. User can create an account with email/password on the web dashboard
  2. User can log in and maintain a session across page refreshes
  3. User can log out from any page in the dashboard
  4. The application runs via Docker Compose with PostgreSQL and Redis provisioned
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js project, Docker Compose, Prisma schema, core libraries, and test infrastructure
- [x] 01-02-PLAN.md — Auth.js authentication, login/register pages, dashboard shell with dark-themed top nav

### Phase 2: Profile & Resume
**Goal**: User can build a complete applicant profile from an uploaded resume and manual edits
**Depends on**: Phase 1
**Requirements**: AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can upload a PDF or DOCX resume and see it parsed into structured fields (education, work history, skills)
  2. User can manually edit any parsed profile field and save changes
  3. User can set job preferences (location, role type, industries, keywords) that persist across sessions
  4. Profile data is stored in a structured format ready for downstream consumption by AI and matching
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Prisma schema expansion, TypeScript types, and TDD resume parser
- [ ] 02-02-PLAN.md — Resume upload API route, profile page with drag-and-drop upload and editable sections
- [ ] 02-03-PLAN.md — Job preferences (locations, roles, industries, keywords) and Q&A bank

### Phase 3: Scraping Infrastructure
**Goal**: System can discover internship listings from Indeed and Greenhouse job boards using stealth browser automation
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, PLAT-01
**Success Criteria** (what must be TRUE):
  1. System scrapes real job listings from Indeed and stores them in the database
  2. System scrapes real job listings from Greenhouse job boards and stores them in the database
  3. Scraping uses stealth browser configuration that passes basic anti-bot detection
  4. Scraping jobs run as background workers via BullMQ with retry on failure
  5. User can see discovered jobs listed in the dashboard
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Extended Platform Scrapers
**Goal**: System discovers jobs from all target platforms, covering the major ATS and job board ecosystem
**Depends on**: Phase 3
**Requirements**: DISC-03, DISC-04, DISC-05
**Success Criteria** (what must be TRUE):
  1. System scrapes job listings from Lever and Workday career pages
  2. System scrapes job listings from LinkedIn (read-only discovery, no application)
  3. System scrapes job listings from Handshake
  4. Each platform adapter follows the shared adapter interface established in Phase 3
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Discovery Features
**Goal**: User can efficiently find relevant jobs through filtering, scoring, and automated recurring discovery
**Depends on**: Phase 3, Phase 2
**Requirements**: DISC-06, DISC-07, DISC-08, DISC-09
**Success Criteria** (what must be TRUE):
  1. User can filter discovered jobs by location, role type, company, and keywords in the dashboard
  2. Each job listing shows a match score computed against the user's profile and preferences
  3. System runs job discovery on a recurring schedule without manual triggering
  4. System deduplicates jobs found across multiple platforms so the same role appears only once
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: AI Generation
**Goal**: System produces tailored resumes and custom cover letters for each job using swappable AI providers
**Depends on**: Phase 2, Phase 3
**Requirements**: AIGEN-01, AIGEN-02, AIGEN-03, AIGEN-04
**Success Criteria** (what must be TRUE):
  1. System generates a tailored version of the user's resume with bullet points optimized for a specific job description
  2. System generates a custom cover letter for each role that references the job and company
  3. User can switch between OpenAI and Claude as the AI provider without changing anything else
  4. System flags any generated content that introduces qualifications not present in the original profile
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

### Phase 7: Review Queue
**Goal**: User can review, edit, and approve/reject all prepared applications before anything is submitted
**Depends on**: Phase 6
**Requirements**: REVW-01, REVW-02, REVW-03
**Success Criteria** (what must be TRUE):
  1. User can view a batch of prepared applications in a queue showing job, tailored resume, and cover letter
  2. User can approve, reject, or edit each application individually before submission
  3. User can see a diff view comparing the original resume against the tailored version for each application
  4. Rejected applications are removed from the submission pipeline and approved ones are queued for submission
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Browser Automation
**Goal**: System can automatically fill out and submit application forms on major ATS platforms
**Depends on**: Phase 7, Phase 3
**Requirements**: REVW-04, PLAT-02, PLAT-03
**Success Criteria** (what must be TRUE):
  1. System fills out application forms via Playwright on Greenhouse and Lever career pages
  2. System integrates a CAPTCHA solving service and successfully resolves CAPTCHAs during form submission
  3. System uses platform-specific ATS adapters that handle form field mapping for each supported platform
  4. Approved applications from the review queue are submitted automatically without manual intervention
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Submission Hardening
**Goal**: System produces verifiable submission evidence and operates within safe rate limits
**Depends on**: Phase 8
**Requirements**: REVW-05, REVW-06, PLAT-04
**Success Criteria** (what must be TRUE):
  1. System captures a screenshot of each submitted application as proof of submission
  2. User can view an application log showing what was submitted, when, where, and its current status
  3. System enforces per-platform rate limits and circuit breakers that halt submission on repeated failures
  4. The full pipeline works end-to-end: discover job, generate materials, review, submit, log with screenshot
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
(Phases 3 and 4 can overlap with Phase 2; Phase 5 depends on both 2 and 3; Phase 6 depends on both 2 and 3)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 2/2 | Complete   | 2026-03-07 |
| 2. Profile & Resume | 1/3 | In Progress|  |
| 3. Scraping Infrastructure | 0/3 | Not started | - |
| 4. Extended Platform Scrapers | 0/3 | Not started | - |
| 5. Discovery Features | 0/2 | Not started | - |
| 6. AI Generation | 0/3 | Not started | - |
| 7. Review Queue | 0/2 | Not started | - |
| 8. Browser Automation | 0/3 | Not started | - |
| 9. Submission Hardening | 0/2 | Not started | - |
