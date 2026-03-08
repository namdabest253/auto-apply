# Phase 3: Scraping Infrastructure - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

System discovers internship listings from Indeed and Greenhouse job boards using stealth browser automation. Scraping runs as background jobs via BullMQ with retry on failure. Discovered jobs are displayed in a table view on the dashboard. This phase establishes the scraper adapter pattern and queue infrastructure that Phase 4+ will extend.

</domain>

<decisions>
## Implementation Decisions

### Job Listing Display
- Table/list view (not cards) — dense rows with sortable columns for scanning large volumes
- Row shows essentials only: title, company, location, date posted — click to expand
- Clicking a row opens a slide-out side panel with full job details (description, requirements, link to original posting)
- Jobs page becomes the default landing page after login (replaces placeholder dashboard) — this is the "jump to action" view decided in Phase 1

### Scraper Trigger & Control
- Manual trigger only — "Discover Jobs" button on the jobs page. Scheduled/recurring scraping deferred to Phase 5 (DISC-08)
- Status bar/banner at top of jobs page showing scrape state: idle, running (with platform name), completed (X new jobs found), or failed. Disappears after a few seconds on success
- Scrape all configured platforms at once with one button — no per-platform selection
- Search terms pulled automatically from user's job preferences (keywords, role types, locations from Phase 2) — no manual search input

### Stealth & Resilience
- Exponential backoff on block/rate-limit: 30s, 1min, 5min with max 3 retries per platform. Report failure to user after retries exhausted
- No proxy/IP rotation in this phase — stealth browser config (anti-fingerprinting, realistic user-agent, human-like delays) should suffice for initial Indeed/Greenhouse scraping
- Human-like random delays between 2-5 seconds per page load, with occasional longer pauses to mimic browsing patterns
- Partial-safe saving — each job listing saved to database as found. If scraper fails halfway, keep what was found so far

### Job Data Model
- Deduplicate by job posting URL (unique key per platform) — skip if URL already exists
- Keep all listings forever, mark as "stale" after 30 days (visual indicator in table). User can filter stale jobs out
- Store whatever data the scraper finds — missing fields show as "Not specified" in UI. Most internship postings lack salary anyway
- Store both raw HTML (for rich rendering in side panel) and extracted plain text (for AI processing in later phases)
- Track each scrape run as its own ScrapeRun record: timestamp, platforms scraped, jobs found count, errors, duration

### Greenhouse Discovery
- Ship with a curated list of known companies using Greenhouse (Stripe, Airbnb, Coinbase, etc.)
- User can add more company board URLs via settings/config
- System tries boards.greenhouse.io/{company-slug} pattern for discovery

### Claude's Discretion
- Exact table column widths and sort defaults
- Side panel width and animation
- Status bar styling and auto-dismiss timing
- BullMQ queue naming, concurrency settings, and job priority
- Stealth browser plugin selection and configuration details
- Curated Greenhouse company list contents
- Scrape run detail page (if any beyond status bar)

</decisions>

<specifics>
## Specific Ideas

- Jobs page replaces the current placeholder dashboard homepage — after login, you land on the job listings table
- "Discover Jobs" button should feel like a single action — click once, system handles both Indeed and Greenhouse in parallel via BullMQ
- Side panel for job details follows common patterns (like Linear's detail panel or GitHub's PR file review panel) — list stays visible on the left
- Greenhouse boards discovered via curated company list, not user-provided URLs — system handles the boards.greenhouse.io/{slug} pattern automatically

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx`: Card component — could be used for status bar styling
- `src/components/nav/top-nav.tsx`: Top navigation — needs "Jobs" link added (or make it the home route)
- `src/lib/prisma.ts`: Prisma client singleton — use for job storage
- `src/lib/constants.ts`: ROLE_TYPES, LOCATIONS, INDUSTRIES arrays — scraper can use these for search term generation
- `src/lib/validators.ts`: Zod validation — extend for job data validation

### Established Patterns
- shadcn/ui (Radix UI + Tailwind CSS) for all UI components — table and side panel should use these
- Dark mode default with zinc palette — job listing table follows this
- Server actions in co-located `actions.ts` files (see login/register pattern)
- API routes under `src/app/api/` with auth checks via `auth()` from next-auth
- Prisma transactions for atomic multi-step data operations (see resume upload pattern)

### Integration Points
- Docker Compose already provisions Redis on port 6379 — ready for BullMQ
- `REDIS_URL` environment variable already set in docker-compose.yml and .env.example
- Dashboard layout at `src/app/(dashboard)/layout.tsx` — add jobs page route
- `src/app/(dashboard)/page.tsx` — current placeholder, becomes jobs listing page
- JobPreference model in Prisma schema — scraper reads user preferences for search terms
- `.planning/research/ARCHITECTURE.md` — contains platform adapter pattern and job queue pipeline guidance

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-scraping-infrastructure*
*Context gathered: 2026-03-08*
