# Phase 4: Extended Platform Scrapers - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

System discovers jobs from all target platforms — ATS-specific adapters (Workday), major boards (LinkedIn, Handshake), AND direct company career page crawling using AI extraction for freshness advantage. Each adapter follows the shared ScraperAdapter interface from Phase 3. Lever scraper already built in Phase 3.1 — this phase adds Workday, LinkedIn, Handshake, and a generic career page crawler. User can add target company career page URLs for direct crawling.

</domain>

<decisions>
## Implementation Decisions

### Workday Scraper
- Curated list of 30-50 known companies using Workday (Amazon, Disney, JPMorgan, etc.), same pattern as Greenhouse/Lever constants. User can add more via settings
- JSON API first — hit Workday's internal REST endpoints for job data (faster, no browser needed). Fall back to stealth browser if API is blocked
- Combined filtering — use Workday's native job category/level fields when available for precise filtering, fall back to regex title matching (isInternshipRole + isUSLocation) as safety net
- Paginate all results — fetch every page even for large boards (500+ listings). Workday API returns 20-50 per page; with delays, a large board takes ~30 seconds

### Handshake Scraper
- User provides Handshake credentials (university, email, password) via a settings page form. App stores encrypted credentials and handles login automatically
- Browser-based SSO flow — use Playwright to walk through the university SSO login flow (handles Okta, CAS, custom SSO providers). Fragile but universal
- Use Handshake's native filters (internship/co-op job type, location) in the search query — more efficient than post-fetch filtering. No need to apply our own isInternshipRole since Handshake can filter natively

### LinkedIn Discovery
- No specific decisions discussed — Claude has discretion on implementation approach
- Requirements: read-only discovery only, no application submission

### Generic Career Page Crawler
- AI extraction using Claude API — analyze page HTML/text and extract structured job data into DiscoveredJob format
- User adds career page URLs via a "Career Pages" section in settings — simple list with add button, each URL gets a company name label
- Crawl depth: single page + follow links that look like individual job postings (1 level deep). Covers most career pages without spiraling into unrelated content
- Fetch strategy: HTTP fetch first (fast, lightweight), retry with Playwright browser if page returns minimal content (JS-rendered). Saves resources on simple static pages

### Claude's Discretion
- LinkedIn scraping approach (API, HTML parsing, RSS, or other)
- LinkedIn anti-bot handling and rate limiting strategy
- Workday curated company list contents
- Workday API endpoint discovery and request format
- Handshake SSO flow implementation details and session management
- Claude API prompt design for career page job extraction
- Heuristics for identifying "job posting" links during crawl
- Error handling and retry strategies per platform
- How to detect when HTTP fetch returns JS-rendered minimal content (fallback trigger)

</decisions>

<specifics>
## Specific Ideas

- Workday follows the same curated-list pattern as Greenhouse and Lever — constants file with company slugs/URLs
- Handshake credentials stored encrypted, with a clear settings form (university selector, email, password fields)
- Generic crawler is the "freshness advantage" — discovers jobs on company career pages before they appear on aggregators like Indeed
- Career page URL management is a simple CRUD list in settings, not integrated into the jobs page workflow

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/scrapers/types.ts`: ScraperAdapter interface — all new scrapers implement this
- `src/lib/scrapers/filters.ts`: `isInternshipRole()`, `isUSLocation()` — reuse for Workday fallback filtering
- `src/lib/scrapers/stealth.ts`: `createStealthBrowser()`, `randomDelay()`, `getRandomUserAgent()` — reuse for Handshake SSO and JS-rendered career pages
- `src/lib/scrapers/constants.ts`: `GREENHOUSE_COMPANIES`, `LEVER_COMPANIES` — extend with `WORKDAY_COMPANIES`
- `src/lib/scrapers/dedup.ts`: `filterNewJobs()` — reuse for all new scrapers
- `src/workers/scrape.worker.ts`: Worker loop that iterates scrapers — add new scrapers to the array

### Established Patterns
- API-first scraping (Greenhouse, Lever use JSON APIs) — Workday follows this pattern
- Company list as constants with `{ name, slug }` objects
- Partial-safe saving — each job saved as found, progress preserved on failure
- Sequential scraper execution in worker with error isolation per platform
- `completed_with_errors` status for partial scraper failures

### Integration Points
- `src/workers/scrape.worker.ts` line 39: `const scrapers = [...]` — add WorkdayScraper, LinkedInScraper, HandshakeScraper, CareerPageCrawler
- Settings page for career page URL management and Handshake credentials
- Prisma schema may need a model for user-provided career page URLs
- Claude API key needed for career page AI extraction (new env variable)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-extended-platform-scrapers*
*Context gathered: 2026-03-10*
