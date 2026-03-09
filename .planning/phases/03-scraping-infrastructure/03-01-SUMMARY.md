---
phase: 03-scraping-infrastructure
plan: 01
subsystem: scraping
tags: [playwright, stealth, greenhouse, indeed, prisma, scraping, dedup]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: User model and Prisma client singleton
  - phase: 02-profile-resume
    provides: JobPreference model for search terms
provides:
  - ScraperAdapter interface for platform scrapers
  - IndeedScraper with stealth browser and mosaic JSON extraction
  - GreenhouseScraper using public JSON API
  - JobListing and ScrapeRun Prisma models
  - Dedup helper filtering jobs by existing URLs
  - Stealth browser config with anti-fingerprinting
  - Curated Greenhouse company list (20 companies)
affects: [03-02-worker, 03-03-ui, 04-pipeline]

# Tech tracking
tech-stack:
  added: [rebrowser-playwright, playwright]
  patterns: [ScraperAdapter interface, stealth browser launch, embedded JSON extraction, public API client]

key-files:
  created:
    - src/lib/scrapers/types.ts
    - src/lib/scrapers/stealth.ts
    - src/lib/scrapers/constants.ts
    - src/lib/scrapers/indeed.ts
    - src/lib/scrapers/greenhouse.ts
    - src/lib/scrapers/dedup.ts
    - src/lib/scrapers/stealth.test.ts
    - src/lib/scrapers/indeed.test.ts
    - src/lib/scrapers/greenhouse.test.ts
    - src/lib/scrapers/dedup.test.ts
  modified:
    - prisma/schema.prisma
    - prisma.config.ts
    - package.json

key-decisions:
  - "rebrowser-playwright requires standard playwright as peer dependency"
  - "Prisma config needs dotenv/config import for env var loading"
  - "ES2017 target requires \\s\\S instead of /s dotAll flag in regex"

patterns-established:
  - "ScraperAdapter: interface with platform string and discover(params) method"
  - "Stealth browser: createStealthBrowser() returns browser + context with anti-fingerprinting"
  - "Dedup: filterNewJobs queries existing URLs before upserting"

requirements-completed: [DISC-01, DISC-02, PLAT-01]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 3 Plan 1: Scraper Adapters Summary

**Indeed stealth scraper with mosaic JSON extraction, Greenhouse public API client, dedup helper, and JobListing/ScrapeRun Prisma models**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T01:53:01Z
- **Completed:** 2026-03-09T02:00:29Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- JobListing and ScrapeRun models added to Prisma schema with dedup constraint (@@unique userId+externalUrl)
- IndeedScraper extracts job listings from embedded mosaic JSON with stealth browser and CAPTCHA detection
- GreenhouseScraper fetches from public JSON API with keyword filtering and proper company name mapping
- Dedup helper filters out already-stored jobs by URL before database writes
- 22 unit tests covering all scrapers, stealth config, and dedup logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema + scraper types + stealth config** - `ca5472d` (feat)
2. **Task 2: Indeed + Greenhouse scraper adapters + dedup helper** - `695e541` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added JobListing and ScrapeRun models with indexes
- `prisma.config.ts` - Added dotenv/config import for env var loading
- `src/lib/scrapers/types.ts` - ScraperAdapter interface, SearchParams, DiscoveredJob types
- `src/lib/scrapers/stealth.ts` - Stealth browser launch, randomDelay, getRandomUserAgent
- `src/lib/scrapers/constants.ts` - GREENHOUSE_COMPANIES curated list (20 companies)
- `src/lib/scrapers/indeed.ts` - IndeedScraper with mosaic JSON extraction and CAPTCHA detection
- `src/lib/scrapers/greenhouse.ts` - GreenhouseScraper fetching public JSON API
- `src/lib/scrapers/dedup.ts` - filterNewJobs dedup helper
- `src/lib/scrapers/stealth.test.ts` - 6 tests for stealth config
- `src/lib/scrapers/indeed.test.ts` - 6 tests for Indeed scraper
- `src/lib/scrapers/greenhouse.test.ts` - 5 tests for Greenhouse scraper
- `src/lib/scrapers/dedup.test.ts` - 5 tests for dedup logic

## Decisions Made
- rebrowser-playwright requires standard playwright as a peer dependency (compatibility issue documented in research was confirmed)
- Prisma config needed dotenv/config import since Prisma 7 does not auto-load .env files
- Used [\s\S] instead of /s dotAll regex flag due to ES2017 target in tsconfig

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added playwright as peer dependency for rebrowser-playwright**
- **Found during:** Task 1 (dependency installation)
- **Issue:** rebrowser-playwright CLI failed with MODULE_NOT_FOUND for playwright/lib/transform/esmLoader
- **Fix:** Installed playwright alongside rebrowser-playwright
- **Files modified:** package.json, package-lock.json
- **Verification:** npx rebrowser-playwright install chromium succeeded
- **Committed in:** ca5472d

**2. [Rule 3 - Blocking] Added dotenv/config import to prisma.config.ts**
- **Found during:** Task 1 (prisma db push)
- **Issue:** Prisma could not resolve DATABASE_URL environment variable
- **Fix:** Added import "dotenv/config" to prisma.config.ts
- **Files modified:** prisma.config.ts
- **Verification:** npx prisma db push succeeded
- **Committed in:** ca5472d

**3. [Rule 1 - Bug] Fixed regex dotAll flag for ES2017 target**
- **Found during:** Task 2 (TypeScript type check)
- **Issue:** /s regex flag requires ES2018+, tsconfig targets ES2017
- **Fix:** Replaced .+? with [\s\S]+? to match across newlines without dotAll flag
- **Files modified:** src/lib/scrapers/indeed.ts
- **Verification:** npx tsc --noEmit passes, all tests still pass
- **Committed in:** 695e541

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for correct operation. No scope creep.

## Issues Encountered
- npm peer dependency conflicts required --legacy-peer-deps flag for installation

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ScraperAdapter interface ready for Plan 02 (BullMQ worker) to orchestrate
- JobListing model ready for Plan 03 (UI) to display
- Dedup helper ready for worker to call before upserting jobs

## Self-Check: PASSED

All 10 created files verified present. Both task commits (ca5472d, 695e541) verified in git log. JobListing and ScrapeRun models confirmed in schema. All 22 tests pass. TypeScript compiles clean.

---
*Phase: 03-scraping-infrastructure*
*Completed: 2026-03-09*
