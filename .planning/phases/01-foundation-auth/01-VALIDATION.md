---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) |
| **Config file** | vitest.config.mts (Wave 0 — needs creation) |
| **Quick run command** | `bunx vitest run --reporter=verbose` |
| **Full suite command** | `bunx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bunx vitest run --reporter=verbose`
- **After every plan wave:** Run `bunx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | unit | `bunx vitest run src/__tests__/lib/password.test.ts -x` | No — W0 | pending |
| 01-01-02 | 01 | 1 | AUTH-01 | integration | `bunx vitest run src/__tests__/auth/register.test.ts -x` | No — W0 | pending |
| 01-01-03 | 01 | 1 | AUTH-01 | integration | `bunx vitest run src/__tests__/auth/login.test.ts -x` | No — W0 | pending |
| 01-01-04 | 01 | 1 | AUTH-01 | integration | `bunx vitest run src/__tests__/auth/session.test.ts -x` | No — W0 | pending |
| 01-01-05 | 01 | 1 | AUTH-01 | integration | `bunx vitest run src/__tests__/auth/logout.test.ts -x` | No — W0 | pending |
| 01-INFRA | 01 | 1 | AUTH-01 | manual-only | `docker compose up -d && docker compose ps` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.mts` — Vitest configuration file
- [ ] `src/__tests__/auth/register.test.ts` — covers AUTH-01 (registration)
- [ ] `src/__tests__/auth/login.test.ts` — covers AUTH-01 (login)
- [ ] `src/__tests__/auth/session.test.ts` — covers AUTH-01 (session persistence)
- [ ] `src/__tests__/auth/logout.test.ts` — covers AUTH-01 (logout)
- [ ] `src/__tests__/lib/password.test.ts` — covers AUTH-01 (password hashing)
- [ ] Framework install: `bun add -d vitest @vitejs/plugin-react vite-tsconfig-paths`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker Compose starts all services | AUTH-01 | Requires Docker runtime | Run `docker compose up -d && docker compose ps` — verify app, postgres, redis all healthy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
