# Stack Research

**Domain:** Automated job application platform (browser automation + AI + web dashboard)
**Researched:** 2026-03-06
**Confidence:** MEDIUM (web verification tools unavailable; versions based on training data through May 2025 -- verify before installing)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | ^15 | Full-stack web framework (dashboard + API routes) | App Router is stable, server components reduce client bundle, API routes co-locate backend logic, eliminates need for separate backend server for the dashboard layer |
| Playwright | ^1.49 | Browser automation for form filling and job scraping | Superior to Puppeteer: built-in auto-wait, multi-browser support, better selector engine, actively maintained by Microsoft. Native stealth is weaker but plugin ecosystem covers it |
| TypeScript | ^5.6 | Type safety across entire codebase | Non-negotiable for a project with this many moving parts (scraper configs, form schemas, AI prompts, queue payloads). Catches integration bugs at compile time |
| PostgreSQL | 16+ | Primary database for jobs, applications, profiles, logs | Relational data with complex queries (filter jobs by status, join applications to profiles). JSONB columns handle semi-structured scrape data without a separate document store |
| Redis | 7+ | Job queue backing store + caching | Required by BullMQ for queue persistence. Also caches scrape results and rate-limit counters |
| Prisma | ^6 | Database ORM and migrations | Type-safe queries that match TypeScript-first approach. Schema-as-code migrations. Excellent Next.js integration |

### AI Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel AI SDK | ^4 | Unified AI provider interface | Abstracts OpenAI, Anthropic, and other providers behind one API. Supports streaming. Handles provider switching without rewriting prompt logic. Built for Next.js |
| OpenAI API | ^4.70 | Primary AI provider for resume tailoring and cover letters | GPT-4o is the best cost/quality ratio for document generation. Fast enough for batch processing |
| Anthropic SDK | ^0.35 | Alternative AI provider | Claude excels at following detailed formatting instructions -- valuable for resume formatting. User choice per PROJECT.md |

### Browser Automation & Scraping

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Playwright | ^1.49 | Core browser automation engine | See core technologies above |
| playwright-extra | ^4.3 | Plugin system for Playwright | Enables stealth plugin and other extensions without forking Playwright |
| puppeteer-extra-plugin-stealth | ^2.11 | Anti-bot detection evasion | The stealth plugin works with playwright-extra. Patches WebGL, navigator, WebRTC fingerprinting. Essential for LinkedIn/Indeed |
| Cheerio | ^1.0 | HTML parsing for lightweight scraping | For pages that don't need full browser rendering (RSS feeds, simple career pages). 10-50x faster than spinning up a browser |

### Queue & Background Jobs

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| BullMQ | ^5 | Job queue for scraping, AI generation, form submission | Redis-backed, supports priority queues, rate limiting, retries with backoff, job scheduling. The standard for Node.js background processing |
| Bull Board | ^6 | Queue monitoring dashboard | Visual monitoring of job queues -- essential for debugging stuck scrapes or failed submissions |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^3.23 | Runtime validation and schema definition | Validate scraped job data, API inputs, form field mappings. Pairs with TypeScript for end-to-end type safety |
| NextAuth.js (Auth.js) | ^5 | Authentication | Single-user or multi-user dashboard auth. Simple credential provider for self-hosted |
| Tailwind CSS | ^4 | Dashboard styling | Utility-first CSS for rapid dashboard UI development. v4 has new engine but v3.4 is also fine |
| shadcn/ui | latest | Pre-built dashboard components | Not a package -- copies components into your project. Tables, forms, dialogs for the review queue dashboard |
| React Hook Form | ^7.54 | Form handling in dashboard | Profile setup forms, filter configuration, manual job entry |
| TanStack Table | ^8.20 | Data tables for batch review queue | Sorting, filtering, pagination for application review. Headless -- works with any UI |
| pdf-parse | ^1.1 | Resume PDF parsing | Extract text from uploaded PDF resumes for profile setup |
| docx | ^9 | Resume DOCX generation | Generate tailored resume documents for download/submission |
| 2captcha-ts | ^1 | CAPTCHA solving service client | Integrates with 2Captcha API for reCAPTCHA, hCaptcha solving during form submission |
| p-queue | ^8 | Concurrency control | Rate-limit browser automation tasks to avoid detection. Controls parallel scraping |
| dayjs | ^1.11 | Date handling | Job posting dates, application timestamps, deadline tracking |
| Winston | ^3.14 | Structured logging | Application logs, scrape results, submission outcomes. JSON format for searchability |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Docker Compose | Local dev environment | PostgreSQL + Redis containers. Single `docker compose up` for dependencies |
| Vitest | ^2 | Unit and integration testing | Faster than Jest, native ESM support, compatible with Next.js |
| Playwright Test | ^1.49 | E2E testing of dashboard | Uses same Playwright already in the stack -- no additional dependency |
| ESLint | ^9 | Linting | Flat config format. Use `@next/eslint-plugin-next` for Next.js rules |
| Prettier | ^3.4 | Code formatting | Consistent formatting across team/AI-generated code |

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest typescript@latest

# Database
npm install prisma@latest @prisma/client@latest

# AI integration
npm install ai@latest openai@latest @anthropic-ai/sdk@latest

# Browser automation
npm install playwright@latest playwright-extra puppeteer-extra-plugin-stealth

# Queue
npm install bullmq@latest

# Supporting
npm install zod react-hook-form @tanstack/react-table
npm install cheerio pdf-parse docx 2captcha-ts p-queue dayjs winston
npm install next-auth@beta

# UI
npm install tailwindcss@latest
npx shadcn@latest init

# Dev dependencies
npm install -D vitest @playwright/test eslint prettier
npm install -D @types/node @types/react
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js | Remix | If you want more explicit data loading patterns and less magic. Remix has better progressive enhancement but worse ecosystem for dashboards |
| Next.js | Separate Express backend + React SPA | If browser automation workers need to be fully decoupled from the web server from day one. Adds deployment complexity that isn't needed initially |
| Playwright | Puppeteer | If you only need Chrome and want slightly smaller install size. Playwright's multi-browser and auto-wait make it strictly better for form automation across diverse sites |
| Prisma | Drizzle ORM | If you want SQL-closer syntax and slightly better raw query performance. Drizzle is lighter but Prisma's migration tooling and type generation are more mature |
| BullMQ | Agenda (MongoDB-backed) | Only if you're already committed to MongoDB. BullMQ + Redis is faster and more reliable for job queues |
| Vercel AI SDK | LangChain.js | If you need complex agent chains or RAG. For this project (prompt-in, text-out), LangChain adds unnecessary abstraction. Vercel AI SDK is simpler and more maintainable |
| PostgreSQL | SQLite (via Turso/libSQL) | For truly single-user self-hosted with minimal ops. PostgreSQL is better once you have concurrent queue workers |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Selenium | Slow, heavy, outdated API, poor async support, weak stealth capabilities | Playwright |
| Puppeteer alone (without playwright-extra) | No built-in stealth, Chrome-only, Google deprioritizing maintenance | Playwright + playwright-extra + stealth plugin |
| LangChain.js for simple generation | Massive abstraction overhead for prompt-in/text-out tasks. Chain/agent patterns are overkill for resume tailoring | Vercel AI SDK -- direct provider calls with unified interface |
| Mongoose / MongoDB | Job and application data is highly relational (jobs have many applications, applications belong to profiles). Document store creates painful joins | PostgreSQL + Prisma |
| Cron jobs for queue management | No retry logic, no dead letter queues, no concurrency control, no rate limiting | BullMQ |
| Axios | fetch() is built into Node.js 18+. Axios adds bundle size for no benefit | Native fetch or undici |
| Cheerio alone for JS-heavy sites | LinkedIn, Workday, and Greenhouse are SPAs -- Cheerio can't execute JavaScript | Playwright for SPAs, Cheerio only for static pages |
| pdf-lib for resume parsing | pdf-lib is for creating/modifying PDFs, not extracting text | pdf-parse for text extraction, docx for DOCX generation |

## Stack Patterns by Variant

**If deploying to Vercel:**
- Move browser automation workers to a separate service (Railway, Fly.io, or VPS) -- Vercel serverless functions have 10s/60s timeouts and no persistent browser processes
- Keep Next.js dashboard on Vercel, connect to workers via Redis queue
- Use Vercel Postgres (Neon) for database

**If fully self-hosted (VPS/Docker):**
- Run everything in one Docker Compose: Next.js + workers + PostgreSQL + Redis
- This is the recommended approach for this project -- simpler architecture, lower cost
- Use Caddy or nginx as reverse proxy with auto-HTTPS

**If scaling to high volume (1000+ applications/day):**
- Separate worker processes from web server
- Multiple worker replicas consuming from BullMQ
- Consider proxy rotation service (Bright Data, Oxylabs) for IP diversity
- Add browser pool management with persistent contexts

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15 | React 18/19 | Next.js 15 supports React 19 but React 18 still works. Use React 19 for server components |
| Prisma 6 | PostgreSQL 14-17 | Prisma 6 dropped support for older Node.js versions -- requires Node 18.18+ |
| playwright-extra | Playwright 1.40+ | Ensure playwright-extra version matches your Playwright major version |
| BullMQ 5 | Redis 6.2+ | BullMQ 5 requires Redis 6.2+ for LMPOP command support |
| Auth.js v5 | Next.js 14/15 | Auth.js v5 (next-auth@beta) is designed for App Router |
| Tailwind CSS v4 | PostCSS 8 | v4 has new Oxide engine; if issues arise, v3.4 is battle-tested |

## Architecture Note for Stack

The stack naturally separates into three runtime concerns:

1. **Web layer** (Next.js): Dashboard UI, API routes, auth -- request/response lifecycle
2. **Worker layer** (BullMQ consumers): Scraping, AI generation, form filling -- long-running background tasks
3. **Data layer** (PostgreSQL + Redis): Persistent storage + queue state

All three can run in one process during development but should be separable for production. This is why Next.js + BullMQ is the right split -- Next.js handles web, BullMQ workers handle automation, Redis connects them.

## Sources

- Training data (May 2025) -- MEDIUM confidence on versions. Verify latest versions via npm before installing.
- Playwright documentation (playwright.dev) -- HIGH confidence on capabilities and API design
- Next.js documentation (nextjs.org) -- HIGH confidence on App Router patterns
- BullMQ documentation (docs.bullmq.io) -- HIGH confidence on queue patterns
- Vercel AI SDK documentation (sdk.vercel.ai) -- MEDIUM confidence on latest API surface
- puppeteer-extra/playwright-extra GitHub -- MEDIUM confidence on stealth plugin compatibility

**Version verification needed:** All version numbers are based on training data through May 2025. Run `npm info <package> version` to get current latest before installing.

---
*Stack research for: Automated job application platform*
*Researched: 2026-03-06*
