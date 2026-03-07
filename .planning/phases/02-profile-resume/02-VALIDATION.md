---
phase: 2
slug: profile-resume
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-02 | unit | `npx vitest run src/lib/resume-parser.test.ts -t "pdf"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-02 | unit | `npx vitest run src/lib/resume-parser.test.ts -t "docx"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-02 | unit | `npx vitest run src/lib/resume-parser.test.ts -t "parse"` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | AUTH-02 | unit | `npx vitest run src/__tests__/api/resume-upload.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | AUTH-03 | unit | `npx vitest run src/__tests__/profile/actions.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | AUTH-04 | unit | `npx vitest run src/__tests__/profile/preferences.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/resume-parser.test.ts` — stubs for AUTH-02 (parser logic)
- [ ] `src/__tests__/api/resume-upload.test.ts` — stubs for AUTH-02 (upload validation)
- [ ] `src/__tests__/profile/actions.test.ts` — stubs for AUTH-03 (profile CRUD)
- [ ] `src/__tests__/profile/preferences.test.ts` — stubs for AUTH-04 (preferences)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop upload UX | AUTH-02 | Browser drag events not testable in unit tests | Drop a PDF onto the upload zone, verify it uploads and parses |
| Profile editing form layout | AUTH-03 | Visual layout verification | Navigate to /profile, verify all sections are visible and editable |
| Tag input UX (add/remove) | AUTH-04 | Keyboard interaction | Type a keyword, press Enter, verify badge appears; click X to remove |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
