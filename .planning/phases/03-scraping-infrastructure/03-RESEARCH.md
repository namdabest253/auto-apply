# Phase 3: Scraping Infrastructure - Research

**Researched:** 2026-03-08
**Domain:** Web scraping (Indeed + Greenhouse), background job queues (BullMQ), data table UI
**Confidence:** MEDIUM-HIGH

## Summary

This phase introduces three major subsystems: (1) a scraping engine using Playwright with stealth patches for Indeed and the Greenhouse public JSON API for job discovery, (2) BullMQ-based background workers running as a separate process alongside the Next.js app, and (3) a data table UI built with shadcn/ui Table + TanStack Table with a Sheet slide-out panel for job details.

The key architectural insight is that Greenhouse has a **public JSON API** (`boards-api.greenhouse.io`) that requires no authentication for reading job listings -- no browser automation needed. Indeed requires browser-based scraping with stealth measures due to anti-bot protection. Both platforms feed into a unified `JobListing` model with deduplication by URL. BullMQ workers run as a separate `tsx` process, communicating with the Next.js app only via Redis queues and the shared PostgreSQL database.

**Primary recommendation:** Use `rebrowser-playwright` (stealth-patched Playwright drop-in) for Indeed scraping, plain `fetch` for Greenhouse API, BullMQ v5 for queue management, and shadcn Table + TanStack Table for the jobs UI.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Table/list view (not cards) for job listings -- dense rows with sortable columns
- Row shows essentials: title, company, location, date posted -- click to expand
- Clicking a row opens a slide-out side panel with full job details
- Jobs page becomes the default landing page after login (replaces placeholder dashboard)
- Manual trigger only -- "Discover Jobs" button, no scheduled scraping
- Status bar/banner showing scrape state: idle, running, completed, failed
- Scrape all configured platforms at once with one button
- Search terms pulled from user's job preferences (keywords, role types, locations)
- Exponential backoff: 30s, 1min, 5min with max 3 retries per platform
- No proxy/IP rotation -- stealth browser config only
- Human-like random delays 2-5 seconds per page load
- Partial-safe saving -- each job saved as found
- Deduplicate by job posting URL (unique key per platform)
- Keep all listings forever, mark as "stale" after 30 days
- Store raw HTML and extracted plain text
- Track each scrape run as ScrapeRun record
- Ship with curated list of known Greenhouse companies
- User can add more company board URLs via settings/config
- System tries boards.greenhouse.io/{company-slug} pattern

### Claude's Discretion
- Exact table column widths and sort defaults
- Side panel width and animation
- Status bar styling and auto-dismiss timing
- BullMQ queue naming, concurrency settings, and job priority
- Stealth browser plugin selection and configuration details
- Curated Greenhouse company list contents
- Scrape run detail page (if any beyond status bar)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | System scrapes job listings from Indeed | rebrowser-playwright with stealth patches; extract embedded JSON from `window.mosaic.providerData`; URL pattern `indeed.com/jobs?q={query}&l={location}&jt=internship` |
| DISC-02 | System scrapes job listings from Greenhouse job boards | Public JSON API at `boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`; no authentication required; curated company slug list |
| PLAT-01 | System uses stealth browser configuration (anti-fingerprinting, behavioral patterns) | rebrowser-playwright patches navigator.webdriver, User-Agent, and other fingerprint leaks; combined with human-like delays and randomized timing |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rebrowser-playwright | ~1.52.0 | Stealth browser automation for Indeed scraping | Drop-in Playwright replacement with anti-detection patches; avoids stale playwright-extra (last updated 3 years ago) |
| bullmq | ^5.70.4 | Background job queue for scrape workers | Standard Redis-based queue for Node.js; retries, concurrency, events built-in |
| ioredis | ^5.x | Redis client for BullMQ connection | Required by BullMQ; already implicit dependency |
| @tanstack/react-table | ^8.x | Headless table logic (sorting, filtering, pagination) | Standard pairing with shadcn/ui Table component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright (standard) | ^1.52.0 | Fallback / types reference | If rebrowser-playwright has compatibility issues; types are shared |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rebrowser-playwright | playwright-extra + stealth plugin | playwright-extra last published 3 years ago; rebrowser-patches are actively maintained and pass modern bot detectors |
| rebrowser-playwright | patchright | Another stealth option; rebrowser has broader community adoption |
| @tanstack/react-table | ag-grid | Overkill for this use case; TanStack is lighter and pairs natively with shadcn |

**Installation:**
```bash
npm install rebrowser-playwright bullmq ioredis @tanstack/react-table
npx rebrowser-playwright install chromium
npx shadcn@latest add table sheet
```

Note: `rebrowser-playwright install chromium` downloads the patched Chromium browser binary needed for stealth scraping.

## Architecture Patterns

### Recommended Project Structure
```
src/
  workers/
    scrape.worker.ts          # BullMQ worker entry point (run as separate process)
    queue.ts                  # Queue + connection setup (shared by API and worker)
  lib/
    scrapers/
      types.ts                # ScraperAdapter interface
      indeed.ts               # Indeed scraper implementation
      greenhouse.ts           # Greenhouse API client (no browser needed)
      stealth.ts              # Browser launch config + helpers
      constants.ts            # Curated Greenhouse company list
  app/(dashboard)/
    page.tsx                  # Jobs table (replaces placeholder)
    components/
      jobs-table.tsx          # DataTable with TanStack Table
      jobs-columns.tsx        # Column definitions
      job-detail-panel.tsx    # Sheet slide-out panel
      scrape-status-bar.tsx   # Status banner component
    actions.ts                # Server actions: trigger scrape, fetch jobs
  app/api/
    scrape/
      trigger/route.ts        # POST: enqueue scrape job
      status/route.ts         # GET: current scrape run status (polling)
```

### Pattern 1: Platform Adapter Interface
**What:** Common interface for all scrapers; each platform implements `discover()`
**When to use:** Every scraper must conform to this contract
**Example:**
```typescript
// src/lib/scrapers/types.ts
export interface ScraperAdapter {
  platform: string;
  discover(params: SearchParams): Promise<DiscoveredJob[]>;
}

export interface SearchParams {
  keywords: string[];
  locations: string[];
  roleTypes: string[];
}

export interface DiscoveredJob {
  externalUrl: string;       // Unique key for dedup
  platform: string;          // "indeed" | "greenhouse"
  title: string;
  company: string;
  location: string | null;
  datePosted: Date | null;
  descriptionHtml: string | null;  // Raw HTML
  descriptionText: string | null;  // Plain text extraction
  salary: string | null;
  metadata: Record<string, unknown>; // Platform-specific extras
}
```

### Pattern 2: BullMQ Worker as Separate Process
**What:** Worker runs via `tsx src/workers/scrape.worker.ts` as a separate process
**When to use:** Always -- browser automation must not run in the Next.js server process
**Example:**
```typescript
// src/workers/queue.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const scrapeQueue = new Queue('scrape', { connection });

// src/workers/scrape.worker.ts
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const worker = new Worker('scrape', async (job: Job) => {
  const { userId, searchParams, platforms } = job.data;
  // Run scrapers, save results to DB
}, {
  connection,
  concurrency: 1,  // One scrape at a time (browser resource constraint)
});
```

### Pattern 3: Greenhouse via Public JSON API (No Browser)
**What:** Greenhouse exposes a public, unauthenticated JSON API for job listings
**When to use:** Always for Greenhouse -- no need for browser automation
**Example:**
```typescript
// src/lib/scrapers/greenhouse.ts
const GREENHOUSE_API = 'https://boards-api.greenhouse.io/v1/boards';

async function fetchGreenhouseJobs(boardToken: string): Promise<DiscoveredJob[]> {
  const res = await fetch(`${GREENHOUSE_API}/${boardToken}/jobs?content=true`);
  const data = await res.json();
  return data.jobs.map((job: any) => ({
    externalUrl: job.absolute_url,
    platform: 'greenhouse',
    title: job.title,
    company: boardToken,  // Resolve to company name from curated list
    location: job.location?.name ?? null,
    datePosted: job.updated_at ? new Date(job.updated_at) : null,
    descriptionHtml: job.content ?? null,
    descriptionText: stripHtml(job.content) ?? null,
    salary: null,
    metadata: { departments: job.departments, offices: job.offices },
  }));
}
```

### Pattern 4: Indeed Embedded JSON Extraction
**What:** Indeed embeds job listing data as JSON in the page HTML rather than requiring DOM parsing
**When to use:** For Indeed scraping -- more reliable than CSS selectors
**Example:**
```typescript
// Extract embedded JSON from Indeed search results page
const content = await page.content();
const match = content.match(/window\.mosaic\.providerData\["mosaic-provider-jobcards"\]=(\{.+?\});/);
if (match) {
  const jobData = JSON.parse(match[1]);
  // Parse job cards from jobData
}
```

### Pattern 5: Polling for Scrape Status
**What:** Dashboard polls an API endpoint for scrape run status updates
**When to use:** To show the status bar progress without WebSocket complexity
**Example:**
```typescript
// Client-side polling in scrape-status-bar.tsx
useEffect(() => {
  if (scrapeRunId) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/scrape/status?runId=${scrapeRunId}`);
      const data = await res.json();
      setStatus(data.status);
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }
}, [scrapeRunId]);
```

### Anti-Patterns to Avoid
- **Running Playwright in API routes:** Browser automation is memory-intensive (200-400MB per context). Run in separate worker process only.
- **Parsing Indeed HTML with CSS selectors:** Indeed changes DOM frequently. Extract embedded JSON (`window.mosaic.providerData`) instead.
- **Using playwright-extra for stealth:** Last published 3 years ago. Use rebrowser-playwright which is actively maintained.
- **Building a custom job queue:** BullMQ handles retries, concurrency, events, and persistence. Do not hand-roll.
- **Scraping Greenhouse with a browser:** They have a free public JSON API. Using a browser wastes resources and is more fragile.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job queue with retries | Custom Redis pub/sub queue | BullMQ | Retry logic, backoff, concurrency, job events, persistence -- all solved |
| Data table with sorting/pagination | Custom table with manual sort | TanStack Table + shadcn Table | Column definitions, sort state, pagination math handled |
| Slide-out panel | Custom absolute-positioned div | shadcn Sheet | Focus trapping, keyboard nav, accessibility, animations |
| Browser stealth | Manual navigator.webdriver patches | rebrowser-playwright | Dozens of detection vectors patched; arms race maintained by community |
| HTML to plain text | Regex strip tags | Built-in DOMParser or a small utility | Edge cases in HTML entities, nested tags, etc. |

## Common Pitfalls

### Pitfall 1: BullMQ Worker Not Starting
**What goes wrong:** Worker file is created but never actually runs because there is no process to execute it
**Why it happens:** Next.js only runs what is imported into pages/API routes. Workers need a separate entry point.
**How to avoid:** Add a `"worker:scrape"` script to package.json: `"tsx --watch src/workers/scrape.worker.ts"`. Run it alongside `next dev`.
**Warning signs:** Jobs get added to queue but nothing processes them

### Pitfall 2: IORedis maxRetriesPerRequest
**What goes wrong:** BullMQ worker crashes with "ReplyError: MAXRETRIES" or hangs
**Why it happens:** IORedis defaults `maxRetriesPerRequest` to 20. BullMQ requires it set to `null` for blocking commands.
**How to avoid:** Always create IORedis connection with `{ maxRetriesPerRequest: null }` for BullMQ workers
**Warning signs:** Intermittent worker crashes, especially under load

### Pitfall 3: Indeed Anti-Bot Blocking
**What goes wrong:** Indeed returns 403 or CAPTCHA pages instead of job listings
**Why it happens:** Indeed actively detects automated browsers. Standard Playwright is fingerprinted immediately.
**How to avoid:** Use rebrowser-playwright patches; add human-like delays (2-5s random); randomize User-Agent; limit pages scraped per session; accept that some sessions will fail and retry with backoff
**Warning signs:** Empty results or HTML containing CAPTCHA/block page content

### Pitfall 4: Prisma Client in Worker Process
**What goes wrong:** Worker cannot access the database because Prisma client is not initialized
**Why it happens:** Worker runs as a separate process; the generated Prisma client from `src/generated/prisma` must be imported there too. Also, the `DATABASE_URL` env var must be available.
**How to avoid:** Import the same Prisma singleton (`src/lib/prisma.ts`) in the worker. Ensure `.env` is loaded (use `dotenv` or `tsx` which handles it).
**Warning signs:** "PrismaClientInitializationError" in worker logs

### Pitfall 5: Stale Data in Table After Scrape
**What goes wrong:** User triggers scrape, it completes, but table still shows old data
**Why it happens:** Next.js server components cache by default; client-side data does not auto-refresh
**How to avoid:** After scrape completion detected by polling, call `router.refresh()` or invalidate/refetch the jobs query
**Warning signs:** User has to manually reload page to see new jobs

### Pitfall 6: Greenhouse Board Token vs Company Name
**What goes wrong:** System stores the board token (e.g., "stripe") as company name
**Why it happens:** The Greenhouse API does not return a human-readable company name -- only the board token is in the URL
**How to avoid:** Curated list should map `{ slug: "stripe", name: "Stripe", ... }`. Use the name from the list, not the slug.
**Warning signs:** Jobs showing slug-like company names in the table

## Code Examples

### Prisma Schema Additions (New Models)
```prisma
model JobListing {
  id              String    @id @default(cuid())
  userId          String
  externalUrl     String
  platform        String    // "indeed" | "greenhouse"
  title           String
  company         String
  location        String?
  datePosted      DateTime?
  descriptionHtml String?   @db.Text
  descriptionText String?   @db.Text
  salary          String?
  metadata        Json?
  isStale         Boolean   @default(false)
  scrapeRunId     String?
  scrapeRun       ScrapeRun? @relation(fields: [scrapeRunId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, externalUrl])
  @@index([userId, createdAt])
  @@index([userId, isStale])
}

model ScrapeRun {
  id          String       @id @default(cuid())
  userId      String
  status      String       // "running" | "completed" | "failed"
  platforms   String[]     // ["indeed", "greenhouse"]
  jobsFound   Int          @default(0)
  errors      Json?
  startedAt   DateTime     @default(now())
  completedAt DateTime?
  duration    Int?         // milliseconds
  jobs        JobListing[]
}
```

### Stealth Browser Launch Config
```typescript
// src/lib/scrapers/stealth.ts
import { chromium } from 'rebrowser-playwright';

export async function createStealthBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  return { browser, context };
}

function getRandomUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

export function randomDelay(min = 2000, max = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}
```

### BullMQ Retry Configuration (Exponential Backoff)
```typescript
// Per user decision: 30s, 1min, 5min with max 3 retries
await scrapeQueue.add('discover', { userId, searchParams }, {
  attempts: 4,  // 1 initial + 3 retries
  backoff: {
    type: 'custom',
  },
});

// In worker definition:
const worker = new Worker('scrape', processor, {
  connection,
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      // 30s, 60s, 300s
      const delays = [30000, 60000, 300000];
      return delays[Math.min(attemptsMade - 1, delays.length - 1)];
    },
  },
});
```

### Server Action to Trigger Scrape
```typescript
// src/app/(dashboard)/actions.ts
'use server';

import { auth } from '@/auth';
import { scrapeQueue } from '@/workers/queue';
import { prisma } from '@/lib/prisma';

export async function triggerScrape() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // Get user's job preferences for search terms
  const profile = await prisma.profile.findFirst({
    where: { userId: session.user.id },
    include: { jobPreferences: true },
  });

  if (!profile?.jobPreferences) {
    return { error: 'Set job preferences before discovering jobs' };
  }

  // Create ScrapeRun record
  const run = await prisma.scrapeRun.create({
    data: {
      userId: session.user.id,
      status: 'running',
      platforms: ['indeed', 'greenhouse'],
    },
  });

  // Enqueue the job
  await scrapeQueue.add('discover', {
    userId: session.user.id,
    runId: run.id,
    searchParams: {
      keywords: profile.jobPreferences.keywords,
      locations: profile.jobPreferences.locations,
      roleTypes: profile.jobPreferences.roleTypes,
    },
  });

  return { runId: run.id };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| playwright-extra + stealth plugin | rebrowser-playwright (patched drop-in) | 2024 | playwright-extra stale (3yr); rebrowser actively maintained |
| CSS selector scraping for Indeed | Embedded JSON extraction (`window.mosaic.providerData`) | 2023+ | More reliable; survives DOM changes |
| Browser scraping for Greenhouse | Public JSON API (`boards-api.greenhouse.io`) | Always available | No browser needed; faster, more reliable, officially supported |
| Bull (v3/v4) | BullMQ v5 | 2023+ | BullMQ is the official successor with better TypeScript support |

**Deprecated/outdated:**
- `playwright-extra`: Last published 3 years ago, incompatible with modern Playwright versions
- `bull` (original): Superseded by BullMQ; still works but no new features
- Indeed Publisher API: Deprecated/restricted; web scraping is the remaining approach

## Open Questions

1. **rebrowser-playwright compatibility with latest Playwright**
   - What we know: rebrowser-playwright 1.52.0 was last published ~8 months ago; Playwright is now at 1.58.x
   - What's unclear: Whether the version mismatch causes issues in practice
   - Recommendation: Install rebrowser-playwright; if it fails, fall back to standard playwright + manual stealth config (set `navigator.webdriver = false`, randomize User-Agent)

2. **Indeed scraping reliability without proxies**
   - What we know: Indeed has aggressive anti-bot; user decided no proxy/IP rotation for this phase
   - What's unclear: How many pages can be scraped per session before blocking
   - Recommendation: Limit to 3-5 search result pages per scrape run; implement graceful failure; accept partial results per the user's "partial-safe saving" decision

3. **Worker process management in Docker**
   - What we know: Docker Compose runs a single `app` service
   - What's unclear: Whether to add a separate worker service or run both processes in one container
   - Recommendation: Add a `worker` service to docker-compose.yml with the same image but different command (`tsx src/workers/scrape.worker.ts`)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.mts` (exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | Indeed scraper extracts job data from embedded JSON | unit | `npx vitest run src/lib/scrapers/indeed.test.ts -t "parses" --reporter=verbose` | No -- Wave 0 |
| DISC-02 | Greenhouse API client fetches and transforms jobs | unit | `npx vitest run src/lib/scrapers/greenhouse.test.ts --reporter=verbose` | No -- Wave 0 |
| PLAT-01 | Stealth browser config sets correct options | unit | `npx vitest run src/lib/scrapers/stealth.test.ts --reporter=verbose` | No -- Wave 0 |
| DISC-01/02 | Deduplication skips existing URLs | unit | `npx vitest run src/lib/scrapers/dedup.test.ts --reporter=verbose` | No -- Wave 0 |
| -- | BullMQ queue enqueues and processes jobs | integration | `npx vitest run src/workers/scrape.worker.test.ts --reporter=verbose` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/scrapers/indeed.test.ts` -- unit tests for Indeed JSON extraction (mock HTML with embedded JSON)
- [ ] `src/lib/scrapers/greenhouse.test.ts` -- unit tests for Greenhouse API response transformation (mock fetch)
- [ ] `src/lib/scrapers/stealth.test.ts` -- verify browser launch args and user agent rotation
- [ ] `src/workers/scrape.worker.test.ts` -- integration test for queue processing (requires Redis mock or test Redis)

## Sources

### Primary (HIGH confidence)
- [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html) -- official API docs confirming public unauthenticated endpoints, response structure, `?content=true` parameter
- [BullMQ Documentation](https://docs.bullmq.io/) -- queue setup, worker patterns, connection config, retry strategies
- [BullMQ npm](https://www.npmjs.com/package/bullmq) -- v5.70.4 confirmed current
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) -- TanStack Table integration pattern
- [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/radix/sheet) -- slide-out panel component

### Secondary (MEDIUM confidence)
- [rebrowser-playwright GitHub](https://github.com/rebrowser/rebrowser-playwright) -- stealth patches, drop-in replacement approach
- [ScrapFly Indeed Guide](https://scrapfly.io/blog/posts/how-to-scrape-indeedcom) -- Indeed URL structure, embedded JSON extraction pattern (`window.mosaic.providerData`)
- [BullMQ + Next.js Integration](https://medium.com/@asanka_l/integrating-bullmq-with-nextjs-typescript-f41cca347ef8) -- separate worker process pattern with tsx

### Tertiary (LOW confidence)
- [rebrowser-playwright npm](https://www.npmjs.com/package/rebrowser-playwright) -- version 1.52.0 last published ~8 months ago; may need compatibility check with current Playwright
- Indeed page structure (CSS selectors, embedded JSON variable names) -- may have changed since sources were written; needs live verification during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH -- BullMQ and shadcn/TanStack are well-established; rebrowser-playwright is newer but well-documented
- Architecture: HIGH -- adapter pattern, separate worker process, and Greenhouse JSON API are all well-proven patterns
- Pitfalls: HIGH -- common issues with BullMQ (maxRetriesPerRequest), Prisma in workers, and Indeed anti-bot are well-documented
- Indeed scraping specifics: MEDIUM -- page structure may have changed; stealth effectiveness without proxies is uncertain

**Research date:** 2026-03-08
**Valid until:** 2026-03-22 (14 days -- scraping targets may change detection methods)
