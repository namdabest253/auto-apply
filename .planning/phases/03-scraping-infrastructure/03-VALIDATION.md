---
phase: 3
slug: scraping-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.mts` (exists) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DISC-01 | unit | `npx vitest run src/lib/scrapers/stealth.test.ts --reporter=verbose` | W0 | pending |
| 03-01-02 | 01 | 1 | DISC-01/02 | unit | `npx vitest run src/lib/scrapers/indeed.test.ts src/lib/scrapers/greenhouse.test.ts src/lib/scrapers/dedup.test.ts --reporter=verbose` | W0 | pending |
| 03-02-01 | 02 | 2 | DISC-01/02 | integration | `npx vitest run src/workers/scrape.worker.test.ts --reporter=verbose` | W0 | pending |
| 03-02-02 | 02 | 2 | PLAT-01 | smoke | `npx tsc --noEmit --pretty 2>&1 \| head -20` | n/a | pending |

*Status: pending -- green -- red -- flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/scrapers/stealth.test.ts` — unit tests for stealth browser config (mock playwright launch)
- [ ] `src/lib/scrapers/indeed.test.ts` — unit tests for Indeed JSON extraction (mock HTML with embedded JSON)
- [ ] `src/lib/scrapers/greenhouse.test.ts` — unit tests for Greenhouse API response transformation (mock fetch)
- [ ] `src/lib/scrapers/dedup.test.ts` — unit tests for dedup logic (mock prisma.jobListing.findMany)
- [ ] `src/workers/scrape.worker.test.ts` — integration test for worker queue processing (mock scrapers + prisma)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Indeed stealth passes anti-bot | PLAT-01 | Requires live network request to Indeed | Run scraper against Indeed, verify no CAPTCHA/block in response |
| Jobs visible in dashboard | DISC-01/02 | Requires browser rendering + seeded data | Navigate to /dashboard/jobs, verify scraped jobs appear in table |
| Greenhouse config UI works | DISC-02 | UI interaction | Add/remove custom Greenhouse company in settings section |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
