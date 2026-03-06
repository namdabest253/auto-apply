# Architecture Research

**Domain:** Automated job application engine (web scraping + browser automation + AI generation)
**Researched:** 2026-03-06
**Confidence:** MEDIUM (based on established patterns in browser automation, queue-based systems, and AI integration; no live web verification available)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Web Dashboard (Frontend)                      │
│  ┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐       │
│  │  Profile   │ │  Job     │ │   Review     │ │  Application  │       │
│  │  Manager   │ │  Browser │ │   Queue      │ │  Tracker      │       │
│  └─────┬─────┘ └────┬─────┘ └──────┬───────┘ └───────┬───────┘       │
│        │            │              │                 │               │
├────────┴────────────┴──────────────┴─────────────────┴───────────────┤
│                         API Server (Backend)                          │
│  ┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐       │
│  │  Profile   │ │  Jobs    │ │   Review     │ │  Application  │       │
│  │  Service   │ │  Service │ │   Service    │ │  Service      │       │
│  └─────┬─────┘ └────┬─────┘ └──────┬───────┘ └───────┬───────┘       │
│        │            │              │                 │               │
├────────┴────────────┴──────────────┴─────────────────┴───────────────┤
│                         Worker Layer (Background)                     │
│  ┌───────────────┐ ┌──────────────┐ ┌──────────────────────┐         │
│  │  Scraping      │ │  AI          │ │  Browser Automation  │         │
│  │  Workers       │ │  Generation  │ │  Engine              │         │
│  └───────┬───────┘ └──────┬───────┘ └──────────┬───────────┘         │
│          │                │                    │                     │
├──────────┴────────────────┴────────────────────┴─────────────────────┤
│                         Data Layer                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐        │
│  │  Database │  │  Job     │  │  File    │  │  Browser       │        │
│  │  (SQLite/ │  │  Queue   │  │  Storage │  │  Profiles      │        │
│  │  Postgres)│  │  (Bull)  │  │  (Resume │  │  (Stealth      │        │
│  │          │  │          │  │   PDFs)  │  │   Configs)     │        │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │  External Services  │
                    ├─────────────────────┤
                    │  AI Providers       │
                    │  (OpenAI / Claude)  │
                    │                     │
                    │  CAPTCHA Solvers    │
                    │  (2Captcha/CapSol.) │
                    │                     │
                    │  Proxy Services     │
                    │  (optional)         │
                    └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Web Dashboard** | User interface for profile setup, job browsing, review queue, application tracking | React/Next.js SPA with REST or tRPC calls to backend |
| **API Server** | Business logic orchestration, auth, CRUD, worker dispatch | Node.js (Express/Fastify) or Next.js API routes |
| **Profile Service** | Resume parsing, profile storage, resume template management | Stores structured profile data; parses uploaded PDFs |
| **Jobs Service** | Job listing CRUD, deduplication, match scoring against profile | Manages scraped listings, filters, search, scoring |
| **Review Service** | Manages the approve/reject queue for prepared applications | Aggregates generated materials with job listing for review |
| **Application Service** | Tracks submitted applications, statuses, error logs | Write-heavy service logging every submission attempt |
| **Scraping Workers** | Discover and extract job listings from multiple platforms | Playwright-based scrapers with platform-specific adapters |
| **AI Generation Service** | Resume tailoring, cover letter generation, form answer generation | Adapter pattern over multiple LLM providers |
| **Browser Automation Engine** | Fill forms, navigate application flows, handle CAPTCHAs, submit | Playwright with stealth plugins, platform-specific scripts |
| **Job Queue** | Orchestrate async work: scraping, generation, submission | BullMQ on Redis -- reliable, retryable, priority-based |
| **Database** | Persistent storage for profiles, jobs, applications, generated docs | PostgreSQL for production; SQLite acceptable for single-user |
| **File Storage** | Resume PDFs, generated cover letters, screenshots of submissions | Local filesystem for self-hosted; S3-compatible for scale |

## Recommended Project Structure

```
autoapply/
├── apps/
│   ├── web/                    # Frontend dashboard
│   │   ├── src/
│   │   │   ├── pages/          # Route pages
│   │   │   ├── components/     # UI components
│   │   │   └── hooks/          # Data fetching, state
│   │   └── package.json
│   └── server/                 # Backend API + workers
│       ├── src/
│       │   ├── api/            # API route handlers
│       │   │   ├── profile.ts
│       │   │   ├── jobs.ts
│       │   │   ├── review.ts
│       │   │   └── applications.ts
│       │   ├── services/       # Business logic
│       │   │   ├── profile/
│       │   │   ├── jobs/
│       │   │   ├── review/
│       │   │   ├── ai/         # AI provider abstraction
│       │   │   └── applications/
│       │   ├── workers/        # Background job processors
│       │   │   ├── scraper/    # Job scraping workers
│       │   │   │   ├── adapters/   # Platform-specific scrapers
│       │   │   │   │   ├── linkedin.ts
│       │   │   │   │   ├── indeed.ts
│       │   │   │   │   ├── handshake.ts
│       │   │   │   │   ├── greenhouse.ts
│       │   │   │   │   ├── lever.ts
│       │   │   │   │   └── workday.ts
│       │   │   │   └── index.ts
│       │   │   ├── generator/  # AI resume/cover letter generation
│       │   │   └── submitter/  # Browser automation submission
│       │   │       ├── adapters/   # Platform-specific form fillers
│       │   │       │   ├── linkedin.ts
│       │   │       │   ├── greenhouse.ts
│       │   │       │   ├── lever.ts
│       │   │       │   └── workday.ts
│       │   │       ├── captcha.ts  # CAPTCHA solver integration
│       │   │       └── stealth.ts  # Anti-detection config
│       │   ├── db/             # Database schema, migrations, queries
│       │   │   ├── schema.ts
│       │   │   └── migrations/
│       │   ├── queue/          # Job queue setup and definitions
│       │   └── config/         # Environment, constants
│       └── package.json
├── packages/
│   └── shared/                 # Shared types, utils between apps
│       ├── src/
│       │   ├── types/          # TypeScript interfaces
│       │   └── utils/          # Shared utilities
│       └── package.json
├── docker-compose.yml          # Redis, DB, browser
├── package.json                # Monorepo root (pnpm workspaces)
└── turbo.json                  # Build orchestration
```

### Structure Rationale

- **apps/web + apps/server split:** Keeps frontend and backend independently deployable. The server runs long-lived browser automation processes that should not share resources with request serving.
- **workers/ with adapters/:** Each job platform (LinkedIn, Greenhouse, Workday, etc.) has wildly different page structures. The adapter pattern isolates platform-specific logic so adding a new platform is adding a new file, not modifying shared code.
- **services/ separate from api/:** Business logic is testable without HTTP concerns. Workers call the same services the API does.
- **packages/shared/:** Type definitions (Job, Profile, Application, etc.) are used by both frontend and backend. Keeps them in sync.
- **Monorepo:** Single repo with pnpm workspaces. This is a single-developer project -- a monorepo avoids cross-repo coordination overhead while maintaining clean boundaries.

## Architectural Patterns

### Pattern 1: Job Queue Pipeline (Critical Pattern)

**What:** Every major operation (scrape, generate, submit) runs as a queued background job, not as a synchronous API call. Jobs flow through a pipeline: Scrape -> Score/Filter -> Generate Materials -> Queue for Review -> (User Approves) -> Submit.

**When to use:** Always. Browser automation and AI generation are slow (seconds to minutes per operation). They must not block the API server.

**Trade-offs:** Adds complexity (Redis dependency, worker process management), but is non-negotiable for this domain. Synchronous processing would make the dashboard unresponsive and time out.

**Example:**
```typescript
// Queue definitions
const QUEUES = {
  scrape: new Queue('scrape', { connection: redis }),
  generate: new Queue('generate', { connection: redis }),
  submit: new Queue('submit', { connection: redis }),
};

// Pipeline: scrape completion triggers generation
scrapeWorker.on('completed', async (job) => {
  const newJobs = job.returnvalue; // scraped listings
  for (const listing of newJobs) {
    if (listing.matchScore >= threshold) {
      await QUEUES.generate.add('generate-materials', {
        jobId: listing.id,
        profileId: job.data.profileId,
      });
    }
  }
});

// Generation completion creates review queue entry
generateWorker.on('completed', async (job) => {
  await reviewService.createEntry({
    jobId: job.data.jobId,
    resumeVersion: job.returnvalue.resumeId,
    coverLetter: job.returnvalue.coverLetterId,
    status: 'pending_review',
  });
});
```

### Pattern 2: Platform Adapter Pattern (Critical Pattern)

**What:** Each job platform (LinkedIn, Greenhouse, Workday, etc.) gets its own adapter class implementing a common interface. Both scraping and form submission use this pattern independently.

**When to use:** For both scraping and submission. Each platform has completely different DOM structures, authentication flows, and form layouts.

**Trade-offs:** More files to maintain, but each adapter is isolated. When LinkedIn changes their DOM (which happens frequently), only the LinkedIn adapter breaks. Without this pattern, a single change can cascade across the entire system.

**Example:**
```typescript
// Common interface
interface ScraperAdapter {
  name: string;
  login(page: Page, credentials: Credentials): Promise<void>;
  search(page: Page, params: SearchParams): Promise<RawListing[]>;
  extractDetails(page: Page, url: string): Promise<JobDetails>;
}

interface SubmitterAdapter {
  name: string;
  canHandle(url: string): boolean;
  fillApplication(page: Page, profile: Profile, materials: Materials): Promise<void>;
  submit(page: Page): Promise<SubmissionResult>;
}

// Platform-specific implementation
class GreenhouseSubmitter implements SubmitterAdapter {
  name = 'greenhouse';
  canHandle(url: string) {
    return url.includes('greenhouse.io') || url.includes('boards.greenhouse');
  }
  async fillApplication(page, profile, materials) {
    // Greenhouse-specific form filling logic
    await page.fill('#first_name', profile.firstName);
    await page.fill('#last_name', profile.lastName);
    // ... greenhouse-specific selectors and flow
  }
}
```

### Pattern 3: AI Provider Abstraction

**What:** Wrap AI calls (resume tailoring, cover letter generation) behind a provider-agnostic interface. Support OpenAI and Anthropic (Claude) with the same calling convention.

**When to use:** From the start. The project explicitly requires flexible AI provider support.

**Trade-offs:** Slight overhead in abstraction, but switching providers or A/B testing quality is trivial. Both OpenAI and Anthropic SDKs are straightforward to wrap.

**Example:**
```typescript
interface AIProvider {
  generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
  }): Promise<string>;
}

class OpenAIProvider implements AIProvider { /* ... */ }
class ClaudeProvider implements AIProvider { /* ... */ }

// Usage in generation service -- provider injected via config
class MaterialGenerator {
  constructor(private ai: AIProvider) {}

  async tailorResume(profile: Profile, jobDescription: string): Promise<string> {
    return this.ai.generateText({
      systemPrompt: RESUME_TAILOR_PROMPT,
      userPrompt: `Profile:\n${JSON.stringify(profile)}\n\nJob Description:\n${jobDescription}`,
    });
  }
}
```

### Pattern 4: Stealth Browser Pool

**What:** Maintain a pool of browser contexts with anti-detection measures. Reuse contexts for the same platform session, rotate fingerprints across submissions, and throttle actions to mimic human behavior.

**When to use:** For all browser automation -- both scraping and submission. Job platforms actively detect and block automation.

**Trade-offs:** Significant complexity. Stealth measures are an arms race. But without them, accounts get flagged within hours.

## Data Flow

### Primary Pipeline Flow

```
[User sets up Profile]
    |
    v
[Scraping Workers] ---> [Job Listings DB]
    |                         |
    | (on schedule/trigger)   | (match scoring)
    v                         v
[New Jobs Found] -----> [Matched Jobs]
                              |
                              v
                    [AI Generation Worker]
                    (tailor resume, write cover letter)
                              |
                              v
                    [Generated Materials DB]
                              |
                              v
                    [Review Queue] <--- [Dashboard: User reviews]
                              |
                    (user approves)
                              |
                              v
                    [Submission Worker]
                    (browser automation, form fill, CAPTCHA solve)
                              |
                              v
                    [Application Log]
                    (success/failure, screenshots, timestamps)
```

### Key Data Flows

1. **Job Discovery Flow:** Scraping workers run on a schedule (e.g., every 4-6 hours). Each platform adapter searches with the user's configured keywords/filters. Raw listings are deduplicated against existing DB entries (by URL or platform-specific ID). New listings get match-scored against the user profile. Listings above the score threshold enter the generation pipeline automatically.

2. **Material Generation Flow:** For each matched job, the AI service receives the job description + user profile. It produces: (a) a tailored resume with keyword-optimized bullet points, (b) a custom cover letter. Both are stored and linked to the job listing. A review queue entry is created with status `pending_review`.

3. **Review and Submission Flow:** User opens dashboard, sees queue of prepared applications. Each entry shows: job listing details, tailored resume diff, generated cover letter. User can approve, reject, or edit materials. On approve, a submission job is queued. The browser automation engine opens the application page, selects the correct platform adapter, fills the form, handles CAPTCHAs, and submits. Result (success/failure/error) is logged with a screenshot.

4. **Error Recovery Flow:** Failed submissions are marked with error details and can be retried. Common failures: CAPTCHA timeout, session expiry, DOM change (adapter broken), rate limit hit. The queue system handles retries with exponential backoff. Persistent failures surface in the dashboard for manual intervention.

### State Management

```
Database (source of truth)
    |
    v
API Server (queries + mutations)
    |
    ├──> Dashboard (REST/tRPC polling or WebSocket for live updates)
    |
    └──> Workers (read profile/jobs, write results/logs)
```

The dashboard does not need complex client-side state management. Server state is the source of truth. Use React Query (TanStack Query) for data fetching with automatic refetching -- this gives the dashboard near-real-time visibility into worker progress without WebSocket complexity in phase 1.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user (self-hosted) | SQLite database, single worker process, local file storage. No Redis needed -- use in-memory queue (BullMQ with IORedis or even a simple in-process queue). This is the target scale. |
| 2-10 users | PostgreSQL, Redis for queue, separate worker process. Still single server. |
| 10+ users | Separate worker servers, S3 for file storage, connection pooling. Unlikely needed for this project. |

### Scaling Priorities

1. **First bottleneck: Browser automation concurrency.** Each submission takes 30-120 seconds of browser time. With one browser context, submitting 50 applications takes over an hour. Solution: run 3-5 concurrent browser contexts (Playwright handles this natively). Memory cost is ~200-400MB per context.

2. **Second bottleneck: AI generation throughput.** Each resume + cover letter pair costs 2-5 seconds of API time. For 50 jobs, that is 2-4 minutes. Solution: parallel API calls (most AI providers allow concurrent requests). This is unlikely to be a real bottleneck.

3. **Third bottleneck: Scraping rate limits.** Platforms throttle repeated requests. Solution: spread scraping across time windows, use request delays, rotate user agents. Do not try to scrape faster -- respect rate limits to avoid account bans.

## Anti-Patterns

### Anti-Pattern 1: Synchronous Application Pipeline

**What people do:** Process the entire apply flow (scrape -> generate -> submit) in a single synchronous request from the dashboard.
**Why it is wrong:** Browser automation takes 30-120 seconds per application. AI generation takes 2-5 seconds. The HTTP request will time out, the user sees a spinner forever, and any failure loses all progress.
**Do this instead:** Use the job queue pipeline. Every step is an async job. The dashboard polls or subscribes for updates. Each step is independently retryable.

### Anti-Pattern 2: Universal Form Filler

**What people do:** Build one generic form-filling algorithm that tries to work on every job platform by analyzing the DOM at runtime.
**Why it is wrong:** Job platform forms are deeply inconsistent. Workday has multi-page wizard flows with dynamic validation. Greenhouse has single-page forms. LinkedIn has a modal flow. A universal filler spends 80% of its time handling edge cases and still fails on 30% of applications.
**Do this instead:** Use the platform adapter pattern. Each platform gets purpose-built automation. Start with 2-3 platforms (LinkedIn Easy Apply, Greenhouse, Lever -- these cover a large percentage of internship applications). Add platforms incrementally.

### Anti-Pattern 3: Storing Generated Materials Only In-Memory

**What people do:** Generate resume/cover letter and pass them directly to the submission step without persisting.
**Why it is wrong:** If submission fails, the generated materials are lost and must be regenerated (wasting AI tokens and time). The user also cannot review what was generated before approving.
**Do this instead:** Persist every generated artifact to the database immediately. The review queue references stored materials. Submission reads from storage. Re-generation is a separate, explicit action.

### Anti-Pattern 4: Running Browser Automation in the API Process

**What people do:** Import Playwright directly in the API server and run browser automation in request handlers.
**Why it is wrong:** Browser automation is memory-intensive (200-400MB per context) and CPU-intensive. It will starve the API server of resources, causing dashboard timeouts and crashes.
**Do this instead:** Workers run in a separate process (or at minimum, a separate thread pool). The API server is lightweight -- it serves the dashboard and dispatches jobs to the queue.

### Anti-Pattern 5: No Screenshot/Evidence Capture

**What people do:** Submit applications and only log success/failure as a boolean.
**Why it is wrong:** When something fails, you have no idea what actually happened. When it "succeeds," you cannot verify the application actually went through. Platforms may show a confirmation page that is actually an error.
**Do this instead:** Capture a screenshot after every submission attempt. Store it with the application log. This is trivial with Playwright (`page.screenshot()`) and invaluable for debugging.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI / Claude API | REST API via official SDK, behind AIProvider interface | Rate limits apply; implement retry with backoff. Cost tracking per application is valuable. |
| 2Captcha / CapSolver | REST API with polling (submit CAPTCHA image, poll for solution) | Adds 10-30 seconds per CAPTCHA. Budget ~$2-3 per 1000 solves. Must handle timeout gracefully. |
| Proxy Service (optional) | HTTP/SOCKS5 proxy rotation for scraping | Only needed if scraping from a single IP gets blocked. Not needed for submission (use real browser profile). |
| LinkedIn / Indeed / etc. | Browser automation (no public API for applications) | Must maintain login sessions. Session cookies should be stored and reused. |
| Greenhouse / Lever / Workday | Browser automation on their hosted application forms | These are the actual application targets. Each has distinct form structure requiring its own adapter. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Dashboard <-> API Server | REST or tRPC over HTTP | Standard request-response. TanStack Query handles caching and polling on the client. |
| API Server <-> Job Queue | BullMQ producer (API adds jobs) | API server only enqueues work; never processes it directly. |
| Job Queue <-> Workers | BullMQ consumer (workers process jobs) | Workers are separate processes reading from the same Redis-backed queue. |
| Workers <-> Database | Direct DB queries via ORM/query builder | Workers read profiles/jobs, write results/logs. Same DB connection as API server. |
| Workers <-> External APIs | HTTP REST calls | AI providers, CAPTCHA services. Always with retry logic and timeout handling. |
| Workers <-> Browser | Playwright API (in-process) | Workers own browser lifecycle. One browser pool per worker process. |

## Suggested Build Order

Based on component dependencies, the system should be built in this order:

1. **Database schema + Profile service + basic API** -- Everything depends on having a data model and the ability to store/retrieve profiles and jobs. This is the foundation.

2. **Web dashboard shell** -- Even a basic UI accelerates development by making it easy to inspect data, test flows, and see what is happening.

3. **Job scraping workers (1-2 platforms)** -- Start populating the jobs database. LinkedIn and one ATS platform (Greenhouse) cover a wide range. This validates the adapter pattern.

4. **AI generation service** -- Depends on having job listings and profiles in the DB. Build the provider abstraction, implement resume tailoring and cover letter generation.

5. **Review queue** -- Depends on having generated materials. This is the user's primary interaction point -- reviewing and approving prepared applications.

6. **Browser automation submission engine (1-2 platforms)** -- The hardest and most fragile component. Build last because it depends on everything else being stable. Start with the easiest platform (Greenhouse or Lever -- they have the most predictable forms).

7. **Polish: CAPTCHA integration, stealth measures, error recovery, additional platforms** -- These are enhancements to the submission engine. Add incrementally.

**Key dependency chain:** Profile -> Scraping -> AI Generation -> Review Queue -> Submission. Each step requires the previous to produce data. Building out of order means mocking dependencies extensively, which is wasteful for a single-developer project.

## Sources

- Playwright documentation: stealth mode, browser contexts, page.screenshot, concurrent contexts
- BullMQ documentation: queue patterns, job pipelines, retry strategies
- Established patterns from open-source auto-apply projects (Easy Apply bots, JobSpy scrapers)
- ATS platform patterns: Greenhouse, Lever, and Workday all use distinct form architectures well-documented in developer communities
- Note: Web search was unavailable during this research session. Recommendations are based on established browser automation, queue-based processing, and AI integration architectural patterns. Confidence is MEDIUM; verify specific library versions and stealth techniques during implementation.

---
*Architecture research for: AutoApply -- Automated Internship Application Engine*
*Researched: 2026-03-06*
