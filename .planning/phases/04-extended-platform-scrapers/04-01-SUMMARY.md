---
phase: 04-extended-platform-scrapers
plan: 01
subsystem: scraping
tags: [workday, linkedin, scraper, playwright, stealth, html-parsing]

requires:
  - phase: 03-scraping-infrastructure
    provides: ScraperAdapter interface, stealth browser, filter utilities
  - phase: 03.1-internship-discovery
    provides: Expanded company lists, internship filtering patterns
provides:
  - WorkdayScraper with JSON API + browser fallback for enterprise internships
  - LinkedInScraper with guest API HTML parsing for broad internship discovery
  - WORKDAY_COMPANIES curated list (40 enterprise employers)
affects: [04-04-worker-registration, scrape-worker]

tech-stack:
  added: []
  patterns: [workday-json-api-with-browser-fallback, linkedin-guest-api-html-regex-parsing]

key-files:
  created:
    - src/lib/scrapers/workday.ts
    - src/lib/scrapers/linkedin.ts
    - src/lib/scrapers/workday.test.ts
    - src/lib/scrapers/linkedin.test.ts
  modified:
    - src/lib/scrapers/constants.ts

key-decisions:
  - "Workday JSON API first with stealth browser fallback on 403/429 (per user decision)"
  - "LinkedIn guest API with regex HTML parsing (no DOM parser dependency needed)"
  - "40 Workday companies with domain/slug/site per entry for varied Workday subdomain patterns"
  - "LinkedIn uses 3-5s delays between pages to avoid aggressive rate limiting"

patterns-established:
  - "Workday API pattern: POST to /wday/cxs/{slug}/{site}/jobs with JSON body for pagination"
  - "Browser fallback pattern: detect 403/429, launch stealth browser, extract job cards from rendered HTML"
  - "LinkedIn HTML parsing pattern: regex extraction of job cards from guest API response"

requirements-completed: [DISC-03, DISC-04]

duration: 5min
completed: 2026-03-11
---

# Phase 04 Plan 01: Workday & LinkedIn Scrapers Summary

**Workday JSON API scraper with stealth browser fallback for 40 enterprise employers, plus LinkedIn guest API scraper with regex HTML parsing for broad internship discovery**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T02:11:07Z
- **Completed:** 2026-03-11T02:16:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- WorkdayScraper with paginated JSON API and automatic browser fallback on 403/429
- LinkedInScraper with guest API HTML regex parsing, pagination, and block detection
- 40-company WORKDAY_COMPANIES list covering major enterprise employers (Amazon, JPMorgan, Disney, Goldman Sachs, Big 4, defense, pharma, tech)
- 17 unit tests covering both scrapers (10 Workday, 7 LinkedIn)

## Task Commits

Each task was committed atomically:

1. **Task 1: Workday scraper with curated company list and browser fallback**
   - `a7d64e6` (test) - Failing tests for Workday scraper
   - `f73624f` (feat) - Implement WorkdayScraper with API + browser fallback
2. **Task 2: LinkedIn guest API scraper**
   - `dba0e5d` (test) - Failing tests for LinkedIn scraper
   - `a81b02a` (feat) - Implement LinkedInScraper with guest API HTML parsing

_TDD: Each task had RED (test) then GREEN (feat) commits._

## Files Created/Modified
- `src/lib/scrapers/workday.ts` - WorkdayScraper class with JSON API + browser fallback
- `src/lib/scrapers/linkedin.ts` - LinkedInScraper class with guest API HTML regex parsing
- `src/lib/scrapers/workday.test.ts` - 10 tests for Workday scraper
- `src/lib/scrapers/linkedin.test.ts` - 7 tests for LinkedIn scraper
- `src/lib/scrapers/constants.ts` - Added WorkdayCompany interface and 40-entry WORKDAY_COMPANIES array

## Decisions Made
- Workday JSON API first, browser fallback on 403/429 -- follows user's decision from research phase
- LinkedIn uses regex HTML parsing instead of DOM parser library -- avoids extra dependency, HTML structure is simple enough for regex
- Workday company list stores full domain per entry since Workday uses varied subdomains (wd1-wd5)
- LinkedIn delays set to 3-5 seconds between pages due to aggressive rate limiting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both scrapers implement ScraperAdapter interface, ready for worker registration in plan 04-04
- TypeScript compiles clean, all 17 tests pass
- Scrapers follow identical pattern to Greenhouse/Lever scrapers

## Self-Check: PASSED

- All 5 files verified present on disk
- All 4 commits verified in git history (a7d64e6, f73624f, dba0e5d, a81b02a)

---
*Phase: 04-extended-platform-scrapers*
*Completed: 2026-03-11*
