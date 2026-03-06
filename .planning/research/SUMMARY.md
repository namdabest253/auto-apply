# Project Research Summary

**Project:** AutoApply -- Automated Internship Application Engine
**Domain:** Browser automation + AI content generation + web dashboard
**Researched:** 2026-03-06
**Confidence:** MEDIUM

## Executive Summary

AutoApply is a self-hosted job application automation platform that combines browser automation (Playwright), AI-powered resume/cover letter generation (OpenAI/Claude), and a web dashboard (Next.js) for managing the entire apply-to-track workflow. The expert approach to building this type of system is a queue-driven pipeline architecture: scrape jobs, generate tailored materials via AI, queue them for human review, then submit via browser automation. Every major operation must be asynchronous because browser automation and AI generation are inherently slow (seconds to minutes per task). The recommended stack is Next.js for the web layer, BullMQ on Redis for job orchestration, Playwright with stealth plugins for browser automation, and PostgreSQL for persistent storage.

The single most important architectural decision is the platform adapter pattern. Job platforms (Workday, Greenhouse, Lever, LinkedIn, Indeed) have radically different form structures, authentication flows, and anti-bot measures. A generic "universal form filler" will fail on the majority of real-world applications. Each platform needs its own adapter implementing a shared interface, for both scraping and submission. This pattern should be established in the foundation phase, not retrofitted.

The primary risks are threefold: (1) anti-bot detection leading to account bans -- mitigated by stealth browser setup, conservative rate limits, and circuit breakers; (2) AI hallucination fabricating qualifications on resumes -- mitigated by constrained editing prompts and a diff-based review queue; and (3) brittle selectors breaking silently when platforms update their UIs -- mitigated by semantic selectors, config-driven selector files, and health checks before form filling. The self-hosted, open-source positioning is a genuine differentiator since every competitor charges $25-100/month, making this especially appealing to students and interns.

## Key Findings

### Recommended Stack

The stack splits cleanly into three runtime concerns: a web layer (Next.js with App Router), a worker layer (BullMQ consumers running Playwright and AI calls), and a data layer (PostgreSQL + Redis). All three can run in a single Docker Compose for self-hosted deployment. TypeScript is non-negotiable given the number of integration surfaces (scraper configs, form schemas, AI prompts, queue payloads).

**Core technologies:**
- **Next.js 15:** Full-stack framework for dashboard UI + API routes -- eliminates need for a separate backend server
- **Playwright + playwright-extra + stealth plugin:** Browser automation with anti-detection -- superior to Puppeteer for multi-browser support and auto-wait
- **BullMQ 5 on Redis 7:** Job queue with retries, priority, rate limiting -- the standard for Node.js background processing
- **PostgreSQL 16 + Prisma 6:** Relational storage with type-safe ORM -- JSONB columns handle semi-structured scrape data
- **Vercel AI SDK 4:** Unified AI provider interface abstracting OpenAI and Anthropic -- built for Next.js
- **Zod:** Runtime validation for scraped data, API inputs, and form field mappings

**Key version constraints:** Node 18.18+, Redis 6.2+ (for BullMQ), React 19 (for server components).

### Expected Features

**Must have (table stakes):**
- Resume upload and parsing (foundation for all downstream)
- Profile/preferences setup (drives filtering and AI personalization)
- Multi-platform job discovery (start with Indeed + Greenhouse)
- AI resume tailoring per job description
- AI cover letter generation per job description
- Batch review queue with approve/reject/edit (explicit project requirement)
- Browser automation form filling (start with Greenhouse + Lever)
- Application tracking log
- Web dashboard for the entire workflow

**Should have (differentiators):**
- Self-hosted / open-source (core differentiator -- no competitor offers this)
- Profile-match scoring (helps users prioritize high-fit jobs)
- ATS-specific form adapters (reliability advantage over generic automation)
- Stealth browser hardening (anti-detection is continuous but essential)
- Scheduled/recurring job discovery ("applies while you sleep")
- Smart deduplication across platforms

**Defer (v2+):**
- Application analytics/insights (needs data volume to be meaningful)
- Additional AI providers beyond OpenAI and Claude
- Career site auto-detection
- Email notifications for new matching jobs

**Anti-features to avoid:** Full autopilot with zero review, LinkedIn Easy Apply automation (high ban risk), automated recruiter outreach, unlimited concurrent applications, mobile app.

### Architecture Approach

The system follows a queue-driven pipeline: Profile Setup -> Job Scraping -> Match Scoring -> AI Material Generation -> Review Queue -> Browser Automation Submission -> Application Log. Each step is a BullMQ job, independently retryable, with the dashboard providing visibility via polling (TanStack Query). The project should use a monorepo (pnpm workspaces) with apps/web (Next.js dashboard) and apps/server (API + workers) plus a packages/shared for types.

**Major components:**
1. **Web Dashboard** -- profile management, job browsing, review queue, application tracking
2. **API Server** -- business logic, auth, CRUD operations, worker dispatch via BullMQ
3. **Scraping Workers** -- platform-specific adapters discovering jobs on Indeed, Greenhouse, etc.
4. **AI Generation Service** -- provider-agnostic resume tailoring and cover letter generation
5. **Review Queue** -- aggregates generated materials with job listings for user approval
6. **Browser Automation Engine** -- platform-specific form filling with stealth, CAPTCHA handling, screenshot capture
7. **Data Layer** -- PostgreSQL for persistent storage, Redis for queue state, filesystem for documents/screenshots

### Critical Pitfalls

1. **Treating all ATS platforms as similar** -- Build the platform adapter pattern from day one. Each platform (Workday, Greenhouse, Lever) gets its own adapter. Start with the hardest platform, not the easiest. Budget 60-70% of automation time on adapters.

2. **Underestimating anti-bot detection** -- Use stealth Playwright from the start, not as an add-on. Implement human-like behavioral patterns (gaussian delays, bezier mouse curves), residential proxies, and headed mode with Xvfb. Detection is invisible -- applications may "submit" but be silently discarded.

3. **AI hallucination in resume tailoring** -- Constrain the AI to rephrasing and reordering existing content only. Build a hallucination detection layer that compares output against the source profile. The review queue must show diffs highlighting every change.

4. **Account bans from automation** -- Implement conservative rate limits (5-10 applications/day per platform), circuit breakers that halt on CAPTCHA escalation, and prominent risk disclaimers. Store all data locally so a ban does not lose application history.

5. **Brittle selectors breaking silently** -- Use semantic selectors (aria-label, name, label text) over CSS classes. Store selectors in config files, not code. Run health checks before filling. Capture screenshots for verification.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Data Model
**Rationale:** Everything depends on the database schema, profile service, and project scaffolding. The adapter pattern interface must be defined here even though adapters are implemented later.
**Delivers:** Next.js app shell, PostgreSQL schema (profiles, jobs, applications, generated materials), Prisma setup, Docker Compose for local dev, authentication, legal disclaimer in onboarding.
**Addresses:** Profile/preferences setup, resume upload/parsing, application log data model.
**Avoids:** Pitfall 10 (legal exposure -- disclaimer from day one), storing credentials in plaintext.

### Phase 2: Job Discovery Pipeline
**Rationale:** Cannot generate materials or submit applications without job listings. Scraping validates the adapter pattern and stealth browser setup.
**Delivers:** Scraping worker infrastructure, BullMQ queue setup, 2 platform scraper adapters (Indeed + Greenhouse), job listing storage with deduplication, basic search/filter UI in dashboard.
**Uses:** Playwright + stealth plugin, BullMQ, Cheerio (for Greenhouse JSON API).
**Avoids:** Pitfall 2 (anti-bot detection -- stealth setup is foundational here), Pitfall 5 (brittle selectors -- semantic selector strategy established).

### Phase 3: AI Material Generation
**Rationale:** Depends on having job listings and profiles from Phases 1-2. This phase produces the artifacts that flow into the review queue.
**Delivers:** AI provider abstraction (OpenAI + Claude via Vercel AI SDK), resume tailoring with constrained editing, cover letter generation, hallucination detection layer, generated materials storage.
**Addresses:** AI resume tailoring, AI cover letter generation, flexible AI provider support.
**Avoids:** Pitfall 3 (AI hallucination -- constrained prompts and validation from the start).

### Phase 4: Review Queue and Dashboard
**Rationale:** The review queue is the user's primary interaction point and the last line of defense against bad applications. It depends on generated materials from Phase 3.
**Delivers:** Batch review queue with full application preview, diff highlighting (original vs. tailored), automated quality checks (company name mismatch, fabricated skills), per-application approve/reject/edit, job match scoring display.
**Addresses:** Batch review before submission, dashboard/UI, profile-match scoring.
**Avoids:** Pitfall 9 (insufficient review -- full previews and diffs, not just checkboxes).

### Phase 5: Browser Automation Submission
**Rationale:** The hardest and most fragile component. Build last because it depends on everything else being stable. Start with platforms that have the most predictable forms.
**Delivers:** Submission worker with browser pool, 2 ATS submission adapters (Greenhouse + Lever), document generation pipeline (PDF + DOCX), file upload handling, screenshot capture on every submission, submission delay with cancel capability.
**Addresses:** Browser automation form filling, application tracking with evidence.
**Avoids:** Pitfall 1 (ATS diversity -- adapter pattern), Pitfall 6 (Easy Apply vs. full application), Pitfall 7 (document upload failures).

### Phase 6: Hardening and Scale
**Rationale:** With the core pipeline working end-to-end, harden for real-world use. Add platforms, improve stealth, handle edge cases.
**Delivers:** Additional platform adapters (Workday, LinkedIn read-only scraping, Taleo), CAPTCHA solving integration with cost tracking, proxy rotation support, scheduled/recurring job discovery, circuit breakers and rate limiting, smart deduplication across platforms, screening question knowledge base.
**Addresses:** Stealth browser hardening, proxy/IP rotation, CAPTCHA solving, scheduled discovery, smart deduplication.
**Avoids:** Pitfall 4 (account bans -- circuit breakers), Pitfall 8 (CAPTCHA cost spiral -- monitoring and cost caps).

### Phase Ordering Rationale

- **Dependency chain drives order:** Profile -> Scraping -> AI Generation -> Review -> Submission. Each step produces data consumed by the next. Building out of order requires extensive mocking.
- **Stealth before any platform interaction:** Anti-detection setup in Phase 2 protects all subsequent phases that touch external platforms.
- **Review queue before submission:** Users must be able to inspect what will be sent before the tool sends anything. This is both a quality requirement and a legal safeguard.
- **Hardening last:** Additional platforms, CAPTCHA solving, and proxy rotation are enhancements to a working pipeline. They add value but do not change the architecture.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Job Discovery):** Platform-specific scraping patterns change frequently. Need live verification of Indeed's current anti-bot measures and Greenhouse's JSON API availability.
- **Phase 5 (Browser Automation):** Form structures for Greenhouse and Lever need live testing. Selector strategies must be validated against current platform UIs.
- **Phase 6 (Hardening):** Workday's tenant-specific variations require per-employer testing. LinkedIn's current detection methods need fresh research. CAPTCHA service pricing and capabilities may have changed.

Phases with standard patterns (skip deep research):
- **Phase 1 (Foundation):** Standard Next.js + Prisma + PostgreSQL setup. Well-documented patterns.
- **Phase 3 (AI Generation):** Vercel AI SDK and prompt engineering patterns are well-established. Hallucination mitigation techniques are well-documented.
- **Phase 4 (Review Queue):** Standard React dashboard with TanStack Table. No novel patterns needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Versions based on training data through May 2025. Verify all package versions before installing. Core technology choices (Next.js, Playwright, BullMQ, PostgreSQL) are high-confidence. |
| Features | MEDIUM | Competitor analysis based on early 2025 data. Feature landscape and user expectations are stable but specific competitor capabilities may have shifted. |
| Architecture | MEDIUM-HIGH | Queue-driven pipeline and adapter patterns are well-established in browser automation. The architecture is not novel -- it follows proven patterns from open-source auto-apply projects. |
| Pitfalls | MEDIUM | Anti-bot detection evolves rapidly. Platform-specific detection methods may be more sophisticated than described. LLM hallucination patterns are well-understood (HIGH confidence on that subset). |

**Overall confidence:** MEDIUM -- the architectural patterns and technology choices are sound, but platform-specific details (selectors, anti-bot measures, form structures) require live validation during implementation.

### Gaps to Address

- **Package versions:** All version numbers need verification against current npm registry before installation. Training data cuts off May 2025.
- **Platform anti-bot evolution:** LinkedIn, Indeed, and Workday detection methods may have changed significantly. Must test stealth setup against live platforms early in Phase 2.
- **Greenhouse JSON API availability:** Research indicates a public JSON API exists at `boards-api.greenhouse.io` but this needs live verification.
- **playwright-extra compatibility:** Stealth plugin compatibility with latest Playwright versions needs verification. The ecosystem moves fast.
- **Tailwind CSS v4 stability:** v4 has a new engine. If issues arise during Phase 1, fall back to v3.4.
- **Auth.js v5 maturity:** Still labeled as beta (next-auth@beta). Evaluate stability before committing; simple credential-based auth may suffice initially.
- **CAPTCHA service pricing:** 2Captcha and CapSolver pricing may have changed. Verify before implementing cost estimates in the dashboard.

## Sources

### Primary (HIGH confidence)
- Playwright documentation (playwright.dev) -- browser automation capabilities, API design, stealth limitations
- BullMQ documentation (docs.bullmq.io) -- queue patterns, job pipelines, retry strategies
- Next.js documentation (nextjs.org) -- App Router patterns, API routes, server components
- LLM hallucination research -- well-documented mitigation patterns for constrained generation

### Secondary (MEDIUM confidence)
- Training data knowledge of ATS platforms (Workday, Greenhouse, Lever) -- form structures and application flows
- Training data knowledge of competitor products (aiapply.co, LazyApply, Sonara, Simplify, JobHire.AI) -- feature sets and pricing
- puppeteer-extra/playwright-extra GitHub -- stealth plugin capabilities and compatibility
- Vercel AI SDK documentation (sdk.vercel.ai) -- provider abstraction API surface
- Community discussions (r/jobsearchhacks, r/cscareerquestions) -- user expectations and pain points

### Tertiary (LOW confidence)
- Anti-bot detection specifics for 2026 -- based on 2025 knowledge, likely evolved
- CAPTCHA service pricing and capabilities -- may have changed
- Specific package version numbers -- need npm verification

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
