# Phase 4: Extended Platform Scrapers - Research

**Researched:** 2026-03-10
**Domain:** Web scraping (Workday, LinkedIn, Handshake), AI-powered career page crawling
**Confidence:** MEDIUM

## Summary

Phase 4 adds four new scrapers (Workday, LinkedIn, Handshake, generic career page crawler) to the existing scraping infrastructure built in Phases 3 and 3.1. The existing codebase has a clean `ScraperAdapter` interface, established patterns for API-first scraping with curated company lists (Greenhouse, Lever), shared filtering utilities, and a worker loop that iterates scrapers sequentially.

The four new scrapers vary significantly in complexity. Workday and LinkedIn can use unauthenticated HTTP endpoints (Workday's internal `wday/cxs` JSON API, LinkedIn's guest jobs API). Handshake requires authenticated browser-based SSO login, making it the most fragile. The generic career page crawler requires AI extraction via Claude API with the Vercel AI SDK for structured output.

**Primary recommendation:** Build each scraper as an independent plan following the established adapter pattern. Prioritize Workday and LinkedIn (HTTP-based, no auth) first, then the career page crawler (new AI capability), and Handshake last (most fragile, SSO-dependent).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Workday: Curated list of 30-50 known companies, same pattern as Greenhouse/Lever constants. JSON API first, fall back to stealth browser. Combined filtering (native fields + regex fallback). Paginate all results
- Handshake: User provides credentials (university, email, password) via settings form. Browser-based SSO flow using Playwright (handles Okta, CAS, custom SSO). Use Handshake's native filters (internship/co-op, location)
- LinkedIn: Read-only discovery only, no application submission
- Generic Career Page Crawler: AI extraction using Claude API. User adds career page URLs via settings section. Single page + 1 level deep link following. HTTP fetch first, retry with Playwright browser if JS-rendered

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

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-03 | System scrapes job listings from company career pages (Lever, Workday) | Lever already done in Phase 3.1. Workday scraper uses internal `wday/cxs` JSON API with curated company list |
| DISC-04 | System scrapes job listings from LinkedIn (read-only discovery) | LinkedIn guest jobs API (`/jobs-guest/jobs/api/seeMoreJobPostings/search`) requires no auth, returns HTML cards |
| DISC-05 | System scrapes job listings from Handshake | Browser-based SSO auth via Playwright, then use Handshake's native search filters |
| DISC-10 | System crawls company career pages directly using AI extraction | Vercel AI SDK `generateObject` with Zod schema to extract structured job data from page HTML/text |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rebrowser-playwright | ^1.52.0 | Stealth browser automation | Already in project; needed for Handshake SSO and JS-rendered career pages |
| ai (Vercel AI SDK) | ^4.x | AI-powered data extraction | Project uses Next.js; SDK provides `generateObject` with Zod schema validation for structured extraction |
| @ai-sdk/anthropic | ^1.x | Claude provider for AI SDK | Career page crawler needs Claude API; Anthropic provider integrates with Vercel AI SDK |
| zod | ^4.3.6 | Schema validation | Already in project; defines DiscoveredJob extraction schema for AI output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright (peer dep) | ^1.58.2 | Peer dependency for rebrowser-playwright | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | Direct Anthropic SDK | AI SDK provides structured output with Zod validation out of the box; direct SDK requires manual JSON parsing |
| rebrowser-playwright for Handshake | Puppeteer | rebrowser-playwright already in project, better stealth |

**Installation:**
```bash
npm install ai @ai-sdk/anthropic
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/scrapers/
  workday.ts           # WorkdayScraper class
  linkedin.ts          # LinkedInScraper class
  handshake.ts         # HandshakeScraper class
  career-page.ts       # CareerPageCrawler class
  constants.ts         # Add WORKDAY_COMPANIES
  types.ts             # Existing ScraperAdapter interface (unchanged)
  filters.ts           # Existing filtering utils (unchanged)
  stealth.ts           # Existing stealth browser (unchanged)
  dedup.ts             # Existing dedup (unchanged)
prisma/schema.prisma   # Add CareerPageUrl model
src/app/(dashboard)/profile/
  components/
    career-pages.tsx    # Career page URL management UI
    handshake-credentials.tsx  # Handshake login form
```

### Pattern 1: API-First Scraping (Workday, LinkedIn)
**What:** Hit JSON/HTML API endpoints directly with `fetch()`, no browser needed
**When to use:** Platform exposes unauthenticated endpoints for job listings
**Example:**
```typescript
// Workday: POST to internal career site API
const url = `https://${company.domain}/wday/cxs/${company.slug}/${company.site}/jobs`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    appliedFacets: {},
    limit: 20,
    offset: 0,
    searchText: "",
  }),
});
const data = await res.json(); // { jobPostings: [...], total: N }

// LinkedIn: GET guest API (returns HTML)
const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=intern&location=United+States&f_JT=I&start=${offset}`;
const res = await fetch(url, {
  headers: { "User-Agent": getRandomUserAgent() },
});
const html = await res.text(); // Parse with regex/DOM
```

### Pattern 2: Browser-Based Auth (Handshake)
**What:** Use Playwright stealth browser to walk through SSO login, then scrape authenticated pages
**When to use:** Platform requires university SSO authentication
**Example:**
```typescript
// 1. Navigate to Handshake login
// 2. Enter university, get redirected to SSO provider
// 3. Fill SSO credentials (Okta/CAS/custom)
// 4. Wait for redirect back to Handshake
// 5. Use authenticated session to search jobs with native filters
// 6. Extract job data from search results
```

### Pattern 3: AI-Powered Extraction (Career Page Crawler)
**What:** Fetch page HTML, send to Claude via Vercel AI SDK `generateObject`, get structured job data
**When to use:** Arbitrary career pages with no standard API
**Example:**
```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const jobSchema = z.object({
  jobs: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    location: z.string().nullable(),
    datePosted: z.string().nullable(),
    description: z.string().nullable(),
  })),
});

const { object } = await generateObject({
  model: anthropic("claude-sonnet-4-20250514"),
  schema: jobSchema,
  prompt: `Extract all job listings from this career page content. Return structured data for each job.\n\nPage content:\n${pageText}`,
});
```

### Pattern 4: Curated Company List (Workday)
**What:** Constant array of `{ name, slug, domain, site }` objects, same pattern as Greenhouse/Lever
**When to use:** ATS platform where companies have predictable URL patterns
**Example:**
```typescript
export interface WorkdayCompany {
  name: string;
  slug: string;       // company identifier in URL
  domain: string;     // e.g., "amazon.wd5.myworkdayjobs.com"
  site: string;       // e.g., "AmazonNew" (career site name)
}

export const WORKDAY_COMPANIES: WorkdayCompany[] = [
  { name: "Amazon", slug: "amazon", domain: "amazon.wd5.myworkdayjobs.com", site: "AmazonNew" },
  { name: "JPMorgan Chase", slug: "jpmorganchase", domain: "jpmc.fa.oraclecloud.com", site: "..." },
  // ... 30-50 companies
];
```

### Anti-Patterns to Avoid
- **Building a general-purpose web scraping framework:** Each scraper should be self-contained with platform-specific logic, not abstracted into a generic scraper engine
- **Storing Handshake credentials in plaintext:** Encrypt with a server-side key before storing in UserSetting
- **Sending full HTML to Claude API:** Strip navigation, headers, footers, and scripts first; send only the career page body content to reduce tokens and improve extraction quality
- **Unbounded crawling:** Career page crawler MUST cap at 1 level deep and limit total pages per company to prevent runaway crawling

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured data from HTML | Custom NLP/regex parser | Vercel AI SDK `generateObject` + Zod | Career pages have infinite layouts; AI handles variety that regex cannot |
| HTML to text conversion | Custom HTML stripper | Built-in browser `textContent` or simple regex (like existing `stripHtml`) | Edge cases with entities, nested tags, scripts |
| Credential encryption | Custom crypto | Node.js `crypto.createCipheriv` with AES-256-GCM | Proven symmetric encryption for at-rest secrets |
| LinkedIn HTML parsing | Full DOM parser library | Regex on the well-structured LinkedIn card HTML | Cards have consistent class-based structure; a full parser is overkill |

## Common Pitfalls

### Pitfall 1: Workday URL Format Variation
**What goes wrong:** Workday career sites use different subdomain patterns (`company.wd1.myworkdayjobs.com`, `company.wd5.myworkdayjobs.com`, `company.fa.oraclecloud.com`)
**Why it happens:** Workday has multiple data centers (wd1-wd5) and Oracle Cloud fusion instances
**How to avoid:** Store full domain in the company constant, not just a slug. Each company entry needs its own domain field.
**Warning signs:** 404 errors when constructing URLs from a template pattern

### Pitfall 2: LinkedIn Rate Limiting
**What goes wrong:** LinkedIn blocks requests after too many in quick succession (403, CAPTCHA, redirect to login)
**Why it happens:** LinkedIn aggressively detects scraping on the guest API
**How to avoid:** Use longer delays between requests (3-5 seconds), rotate User-Agent strings, limit total pages fetched per run, check response for login redirect
**Warning signs:** Responses suddenly contain login page HTML instead of job cards

### Pitfall 3: Handshake SSO Fragility
**What goes wrong:** SSO flows break because each university uses different providers (Okta, CAS, Duo, custom SAML)
**Why it happens:** There is no standardized SSO form; selectors, flows, and MFA requirements differ per university
**How to avoid:** Build for a limited set of common SSO providers. Accept that this scraper will not work universally. Log detailed error states for debugging. Consider starting with a simpler approach (manual cookie-based auth) and upgrading to full SSO automation later
**Warning signs:** Playwright timeouts waiting for expected selectors after SSO redirect

### Pitfall 4: AI Extraction Token Costs
**What goes wrong:** Sending full page HTML to Claude costs excessive tokens and may exceed context window
**Why it happens:** Modern career pages have massive HTML (50K+ characters) with navigation, scripts, CSS
**How to avoid:** Strip scripts, styles, nav, footer, header elements before sending. Extract just the main content area. Use `claude-sonnet-4-20250514` (cheaper) not opus. Set a character limit (e.g., 30K chars max)
**Warning signs:** Slow responses, high API costs, context window errors

### Pitfall 5: Career Page Crawler Link Following
**What goes wrong:** Crawler follows links to non-job pages (about, contact, blog) and wastes time/tokens
**Why it happens:** Career pages embed links to many non-job resources
**How to avoid:** Use heuristics to identify job links: URL contains `/job/`, `/position/`, `/career/`, `/opening/`, or has a job-ID-like pattern. Filter aggressively before following
**Warning signs:** Many extracted "jobs" with zero or nonsensical titles

### Pitfall 6: JS-Rendered Career Pages Fallback Detection
**What goes wrong:** HTTP fetch returns a page skeleton with no job data (content loads via JavaScript)
**Why it happens:** Many modern career pages are SPAs that render client-side
**How to avoid:** After HTTP fetch, check if the response contains fewer than N job-like elements or has common SPA indicators (empty body, `<div id="root"></div>`, React/Vue mount points). If so, retry with Playwright
**Warning signs:** HTML body is very short (<1KB meaningful content) or contains no text matching job titles

## Code Examples

### Workday Scraper Core Pattern
```typescript
// Source: Established pattern from Greenhouse/Lever scrapers + Workday API research
import type { ScraperAdapter, SearchParams, DiscoveredJob } from "./types";
import { WORKDAY_COMPANIES } from "./constants";
import { isInternshipRole, isUSLocation } from "./filters";
import { randomDelay } from "./stealth";

export class WorkdayScraper implements ScraperAdapter {
  platform = "workday";

  async discover(params: SearchParams): Promise<DiscoveredJob[]> {
    const allJobs: DiscoveredJob[] = [];

    for (const company of WORKDAY_COMPANIES) {
      try {
        const jobs = await this.fetchCompanyJobs(company);
        const filtered = jobs.filter(
          (j) => isInternshipRole(j.title) && isUSLocation(j.location)
        );
        allJobs.push(...filtered);
        await randomDelay(1000, 3000);
      } catch (error) {
        console.warn(`[WorkdayScraper] Error fetching ${company.name}:`, (error as Error).message);
        continue;
      }
    }

    return allJobs;
  }

  private async fetchCompanyJobs(company: WorkdayCompany): Promise<DiscoveredJob[]> {
    const jobs: DiscoveredJob[] = [];
    let offset = 0;
    const limit = 20;

    while (true) {
      const url = `https://${company.domain}/wday/cxs/${company.slug}/${company.site}/jobs`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFacets: {}, limit, offset, searchText: "" }),
      });

      if (!res.ok) break;
      const data = await res.json();
      const postings = data.jobPostings || [];
      if (postings.length === 0) break;

      for (const posting of postings) {
        jobs.push({
          externalUrl: `https://${company.domain}/en-US/job/${posting.bulletFields?.[0] || posting.externalPath}`,
          platform: "workday",
          title: posting.title,
          company: company.name,
          location: posting.locationsText || null,
          datePosted: posting.postedOn ? new Date(posting.postedOn) : null,
          descriptionHtml: null,
          descriptionText: null,
          salary: null,
          metadata: { workdayId: posting.id, domain: company.domain },
        });
      }

      offset += limit;
      if (offset >= (data.total || 0)) break;
      await randomDelay(500, 1500);
    }

    return jobs;
  }
}
```

### LinkedIn Guest API Scraper Pattern
```typescript
// Source: LinkedIn Guest API documentation (https://gist.github.com/Diegiwg/51c22fa7ec9d92ed9b5d1f537b9e1107)
const LINKEDIN_GUEST_API = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

// Parameters:
// keywords: search terms
// location: "United States"
// f_JT: "I" (internship)
// f_TPR: "r604800" (past week)
// start: pagination offset (increments of 25)
// f_WT: "2" (remote) or omit for all

// Returns HTML with job cards:
// <li><div class="base-card">
//   <a class="base-card__full-link" href="...">
//   <h3 class="base-search-card__title">...</h3>
//   <h4 class="base-search-card__subtitle">company</h4>
//   <span class="job-search-card__location">...</span>
//   <time datetime="2026-03-01">...</time>
// </div></li>
```

### Career Page AI Extraction Pattern
```typescript
// Source: Vercel AI SDK docs (https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const careerPageSchema = z.object({
  jobs: z.array(z.object({
    title: z.string().describe("Job title"),
    url: z.string().describe("Full URL to the job posting, or relative path"),
    location: z.string().nullable().describe("Job location"),
    department: z.string().nullable().describe("Department or team"),
    datePosted: z.string().nullable().describe("Date posted if visible"),
  })),
  jobLinkPattern: z.string().nullable().describe("URL pattern for individual job pages, if detectable"),
});

// Strip non-content HTML before sending
function extractMainContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30000); // Cap at 30K chars
}
```

### Prisma Schema Addition for Career Page URLs
```prisma
model CareerPageUrl {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  url       String
  label     String   // Company name label
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, url])
}
```

### Credential Encryption Pattern
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
// ENCRYPTION_KEY from env (32 bytes, hex-encoded)

export function encrypt(text: string, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(data: string, key: Buffer): string {
  const [ivHex, tagHex, encHex] = data.split(":");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8");
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Workday HTML scraping with browser | Workday `wday/cxs` POST JSON API | Always available but undocumented | No browser needed; faster, more reliable |
| LinkedIn official API | LinkedIn guest API (no auth) | LinkedIn restricted official API access ~2023 | Must use undocumented guest endpoint; higher ban risk |
| Full page to LLM | Stripped content + structured output | Vercel AI SDK 3.x+ (2024) | `generateObject` with Zod schemas ensures type-safe extraction |

**Deprecated/outdated:**
- LinkedIn official Job Search API: No longer publicly available to most developers
- Workday SOAP API: Still exists but REST + frontend JSON API is simpler for career page scraping

## Open Questions

1. **Workday `wday/cxs` API request/response exact format**
   - What we know: Endpoint is `POST /wday/cxs/{company}/{site}/jobs` with JSON body containing `limit`, `offset`, `searchText`, `appliedFacets`
   - What's unclear: Exact response shape, available facet filters, rate limits
   - Recommendation: Discover by inspecting network requests on a live Workday career page (e.g., amazon.wd5.myworkdayjobs.com) during implementation. Build scraper iteratively with logging.

2. **Handshake SSO provider variety**
   - What we know: Universities use SAML, CAS, Okta, LDAP, and custom SSO providers
   - What's unclear: How many distinct flows need handling; whether MFA (Duo) is universally required
   - Recommendation: Start with the simplest path -- if the user's university uses a standard Okta or CAS login with username/password, automate that. If MFA is required, prompt user to complete MFA manually (Playwright waits). Document which SSO types are supported.

3. **LinkedIn guest API longevity and rate limits**
   - What we know: The `/jobs-guest/` endpoint works without authentication, returns HTML cards, paginates by 25
   - What's unclear: Exact rate limits before blocking; whether LinkedIn will deprecate this endpoint
   - Recommendation: Be very conservative -- max 3-5 pages per run, 3-5 second delays, detect blocks early. Accept lower coverage for reliability.

4. **Vercel AI SDK version compatibility**
   - What we know: Project uses Next.js 15 and React 19; AI SDK 4.x is current
   - What's unclear: Whether `ai` package has specific Next.js 15 compatibility requirements
   - Recommendation: Install and verify during implementation. The SDK is well-maintained and should work.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | vitest.config.mts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-03 | Workday scraper discovers and filters jobs | unit | `npx vitest run src/lib/scrapers/workday.test.ts -x` | No - Wave 0 |
| DISC-04 | LinkedIn scraper discovers jobs via guest API | unit | `npx vitest run src/lib/scrapers/linkedin.test.ts -x` | No - Wave 0 |
| DISC-05 | Handshake scraper discovers jobs after SSO auth | unit | `npx vitest run src/lib/scrapers/handshake.test.ts -x` | No - Wave 0 |
| DISC-10 | Career page crawler extracts jobs via AI | unit | `npx vitest run src/lib/scrapers/career-page.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/scrapers/{scraper}.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/scrapers/workday.test.ts` -- covers DISC-03
- [ ] `src/lib/scrapers/linkedin.test.ts` -- covers DISC-04
- [ ] `src/lib/scrapers/handshake.test.ts` -- covers DISC-05
- [ ] `src/lib/scrapers/career-page.test.ts` -- covers DISC-10

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/scrapers/*.ts` -- established ScraperAdapter pattern, Greenhouse/Lever examples
- LinkedIn Guest API Documentation: https://gist.github.com/Diegiwg/51c22fa7ec9d92ed9b5d1f537b9e1107 -- endpoint URLs, parameters, pagination
- Vercel AI SDK docs: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data -- `generateObject` with Zod schemas
- Vercel Academy: https://vercel.com/academy/ai-sdk/structured-data-extraction -- structured data extraction patterns

### Secondary (MEDIUM confidence)
- Workday `wday/cxs` endpoint format: Multiple scraping tools reference this pattern (Apify scrapers, GitHub repos). URL format `https://{domain}/wday/cxs/{company}/{site}/jobs` with POST body is well-established but undocumented officially
- Handshake SSO support: https://support.joinhandshake.com/hc/en-us/sections/360002580813-SSO-Setup-Management -- confirms SAML, CAS, LDAP support
- Handshake cookie-based auth: https://github.com/khangly/handshook -- confirms cookie-based requests work for authenticated access

### Tertiary (LOW confidence)
- Workday API exact response format: Based on scraper tool descriptions, not direct verification. Need to inspect live responses during implementation
- LinkedIn rate limit thresholds: Anecdotal from scraping blogs; actual limits may differ and change over time
- Handshake internal GraphQL API: Referenced in Handshake tech blog but no public documentation available

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - leverages existing project patterns and well-documented libraries
- Architecture: HIGH - four independent scrapers following established adapter pattern
- Workday API: MEDIUM - endpoint pattern well-referenced but officially undocumented
- LinkedIn API: MEDIUM - guest API works but is unofficial and may change
- Handshake SSO: LOW - highly variable per university, fragile by nature
- Career page AI extraction: MEDIUM - Vercel AI SDK is well-documented but prompt engineering needs iteration
- Pitfalls: HIGH - well-known challenges in web scraping domain

**Research date:** 2026-03-10
**Valid until:** 2026-03-24 (14 days -- web scraping targets may change anti-bot measures)
