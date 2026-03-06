# AutoApply — Automated Internship Application Engine

## What This Is

A web-based tool that automatically discovers internship listings across multiple job platforms, tailors resumes and generates custom cover letters for each role using AI, fills out application forms via browser automation, and queues everything for batch review before submission. Think aiapply.co but self-hosted and fully under your control.

## Core Value

Applications go out consistently and at volume — every relevant internship gets a tailored, high-quality application without manual effort per listing.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-platform job scraping (LinkedIn, Indeed, company career sites, Handshake)
- [ ] Smart filters + keyword search with profile-match scoring
- [ ] Resume parsing and profile setup (import resume + manual edits)
- [ ] AI-powered resume keyword tailoring per job description
- [ ] AI-generated custom cover letters per role
- [ ] Browser automation for form filling and submission (Puppeteer/Playwright)
- [ ] CAPTCHA solving via third-party service (2Captcha, CapSolver, etc.)
- [ ] Batch review queue — review prepared applications, approve/reject, then auto-submit
- [ ] Basic application log (what, when, where)
- [ ] Flexible AI provider support (OpenAI, Claude, swappable)
- [ ] Web dashboard for managing the entire workflow

### Out of Scope

- Full autopilot (no human review) — user wants batch approval before submission
- Full application status tracking with interviews/analytics — basic log is sufficient
- Mobile app — web-first
- Native desktop app — web app chosen

## Context

- Target user: student/grad looking for internships at volume
- Key platforms: LinkedIn, Indeed, Handshake, direct company career pages (Workday, Greenhouse, Lever, etc.)
- Resume optimization approach: keyword tailoring of bullet points to match JD, not full restructure
- Profile data comes from both parsed resume and manual input
- Job discovery should be as broad and up-to-date as possible
- CAPTCHAs handled via solving service API, no manual fallback
- Similar product reference: https://aiapply.co/

## Constraints

- **Browser automation**: Must handle diverse form layouts across Workday, Greenhouse, Lever, LinkedIn, Indeed, Handshake
- **Anti-bot detection**: Job platforms actively detect automation — need stealth browser techniques
- **CAPTCHA costs**: Solving services charge per solve (~$1-3/1000) — factor into usage
- **AI API costs**: Each resume tailoring + cover letter generation consumes API tokens
- **Rate limiting**: Platforms rate-limit scraping and submissions — need throttling and rotation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Batch review over full autopilot | User wants quality control before submission | — Pending |
| Browser automation over API-based | Most job platforms don't offer public APIs; browser automation is universal | — Pending |
| CAPTCHA solving service | Removes manual friction; cost is low at expected volume | — Pending |
| Flexible AI providers | Avoid vendor lock-in; let user choose based on cost/quality | — Pending |
| Web app interface | Dashboard for managing applications, reviewing queue, tracking submissions | — Pending |
| Keyword tailoring over full rewrite | Preserves resume voice while optimizing for ATS keyword matching | — Pending |

---
*Last updated: 2026-03-06 after initialization*
