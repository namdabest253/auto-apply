---
phase: 04-extended-platform-scrapers
plan: 02
subsystem: scraping
tags: [ai-sdk, anthropic, career-page, crawler, playwright, prisma]

# Dependency graph
requires:
  - phase: 03-scraping-infrastructure
    provides: ScraperAdapter interface, stealth browser, filters
provides:
  - CareerPageCrawler implementing ScraperAdapter
  - CareerPageUrl Prisma model for user-configured URLs
  - Career page settings UI in profile page
  - AI-powered job extraction from arbitrary career pages
affects: [05-job-pipeline, scrape-worker-integration]

# Tech tracking
tech-stack:
  added: [ai@6.0.116, @ai-sdk/anthropic@3.0.58]
  patterns: [AI extraction via generateObject with Zod schema, HTTP-first with Playwright fallback]

key-files:
  created:
    - src/lib/scrapers/career-page.ts
    - src/lib/scrapers/career-page.test.ts
    - src/app/(dashboard)/profile/components/career-pages.tsx
  modified:
    - prisma/schema.prisma
    - src/app/(dashboard)/profile/actions.ts
    - src/app/(dashboard)/profile/components/profile-page-client.tsx
    - src/app/(dashboard)/profile/page.tsx
    - package.json

key-decisions:
  - "Constructor injection for userId (CareerPageCrawler(userId)) instead of extending SearchParams"
  - "Vercel AI SDK generateObject with Zod schema for structured job extraction"
  - "30K character cap on content sent to AI to control token costs"
  - "20-page cap per career URL to prevent runaway crawling"

patterns-established:
  - "AI extraction pattern: strip HTML to text, generateObject with Zod schema, map to domain types"
  - "HTTP-first with Playwright fallback: isMinimalContent check triggers JS rendering"

requirements-completed: [DISC-10]

# Metrics
duration: 8min
completed: 2026-03-11
---

# Phase 04 Plan 02: Career Page Crawler Summary

**AI-powered career page crawler with HTTP/Playwright fetch, structured job extraction via Vercel AI SDK, and profile settings UI for managing target URLs**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-11T02:07:24Z
- **Completed:** 2026-03-11T02:15:47Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- CareerPageCrawler class implementing ScraperAdapter with AI-powered job extraction
- CareerPageUrl Prisma model with userId+url unique constraint for user-managed URLs
- Career pages settings UI integrated into profile page with add/remove functionality
- HTTP-first fetching with Playwright fallback for JS-rendered pages
- 1-level-deep link crawling to discover individual job postings
- 13 passing tests covering all utility functions and crawler behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK deps, add CareerPageUrl Prisma model, create career page settings UI** - `65c0ee6` (feat) -- already committed in prior work
2. **Task 2 RED: Career page crawler tests** - `004a312` (test)
3. **Task 2 GREEN: Career page crawler implementation** - `16adc62` (feat)

## Files Created/Modified
- `src/lib/scrapers/career-page.ts` - CareerPageCrawler with AI extraction, HTTP/Playwright fetch
- `src/lib/scrapers/career-page.test.ts` - 13 tests covering crawler, content extraction, link identification
- `src/app/(dashboard)/profile/components/career-pages.tsx` - Career page URL management UI
- `prisma/schema.prisma` - CareerPageUrl model added
- `src/app/(dashboard)/profile/actions.ts` - addCareerPage, removeCareerPage, getCareerPages server actions
- `src/app/(dashboard)/profile/components/profile-page-client.tsx` - Wired career pages section
- `src/app/(dashboard)/profile/page.tsx` - Fetch career pages data for client component
- `package.json` - Added ai and @ai-sdk/anthropic dependencies

## Decisions Made
- Used constructor injection (`new CareerPageCrawler(userId)`) rather than extending SearchParams interface, keeping the adapter interface clean
- Vercel AI SDK `generateObject` with Zod schema for structured extraction -- ensures typed output from AI
- Content capped at 30K characters before AI extraction to control token costs
- 20-page cap per career URL prevents runaway crawling on large career sites
- Deduplication by externalUrl across main page and sub-page extractions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used --legacy-peer-deps for npm install**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Peer dependency conflict between eslint-config-next and other packages
- **Fix:** Used `npm install --legacy-peer-deps` flag
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm ls ai @ai-sdk/anthropic` shows both installed

**2. [Rule 1 - Bug] Fixed test mock HTML content length**
- **Found during:** Task 2 GREEN (AI extraction mapping test)
- **Issue:** Mock HTML too short, triggering isMinimalContent check and Playwright fallback in test
- **Fix:** Added sufficient text content to mock HTML to pass minimal content check
- **Files modified:** src/lib/scrapers/career-page.test.ts
- **Verification:** All 13 tests pass

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct installation and testing. No scope creep.

## Issues Encountered
- Task 1 changes (Prisma model, server actions, UI, AI SDK deps) were already committed in prior work (04-03 commits), so no new commit was needed for Task 1
- Zod import uses `"zod"` (not `"zod/v4"`) since zod@4.3.6 is the installed version

## User Setup Required

ANTHROPIC_API_KEY environment variable must be set for AI extraction to work at runtime. This is standard for the @ai-sdk/anthropic package.

## Next Phase Readiness
- CareerPageCrawler ready for integration into scrape worker
- Needs to be registered in the scrape worker's adapter list alongside Greenhouse, Indeed, Lever
- ANTHROPIC_API_KEY required in production environment

## Self-Check: PASSED

- FOUND: src/lib/scrapers/career-page.ts
- FOUND: src/lib/scrapers/career-page.test.ts
- FOUND: src/app/(dashboard)/profile/components/career-pages.tsx
- FOUND: .planning/phases/04-extended-platform-scrapers/04-02-SUMMARY.md
- FOUND: 004a312 (test commit)
- FOUND: 16adc62 (feat commit)

---
*Phase: 04-extended-platform-scrapers*
*Completed: 2026-03-11*
