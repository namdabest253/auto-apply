---
phase: 4
slug: extended-platform-scrapers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | vitest.config.mts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/scrapers/{scraper}.test.ts -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DISC-03 | unit | `npx vitest run src/lib/scrapers/workday.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | DISC-04 | unit | `npx vitest run src/lib/scrapers/linkedin.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | DISC-05 | unit | `npx vitest run src/lib/scrapers/handshake.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | DISC-10 | unit | `npx vitest run src/lib/scrapers/career-page.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/scrapers/workday.test.ts` — stubs for DISC-03
- [ ] `src/lib/scrapers/linkedin.test.ts` — stubs for DISC-04
- [ ] `src/lib/scrapers/handshake.test.ts` — stubs for DISC-05
- [ ] `src/lib/scrapers/career-page.test.ts` — stubs for DISC-10

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Handshake SSO login flow | DISC-05 | Requires university SSO credentials | 1. Configure Handshake credentials 2. Trigger scrape 3. Verify jobs returned |
| LinkedIn rate limiting behavior | DISC-04 | Cannot reliably trigger rate limits in tests | 1. Run scraper against live LinkedIn 2. Verify backoff on 429 responses |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
