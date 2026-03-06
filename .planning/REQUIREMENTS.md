# Requirements: AutoApply

**Defined:** 2026-03-06
**Core Value:** Applications go out consistently and at volume — every relevant internship gets a tailored, high-quality application without manual effort per listing.

## v1 Requirements

### Authentication & Profile

- [x] **AUTH-01**: User can create account and log in to the web dashboard
- [ ] **AUTH-02**: User can upload resume (PDF/DOCX) and have it parsed into structured data
- [ ] **AUTH-03**: User can manually edit parsed profile (education, work history, skills)
- [ ] **AUTH-04**: User can set job preferences (location, role type, industries, keywords)

### Job Discovery

- [ ] **DISC-01**: System scrapes job listings from Indeed
- [ ] **DISC-02**: System scrapes job listings from Greenhouse job boards
- [ ] **DISC-03**: System scrapes job listings from company career pages (Lever, Workday)
- [ ] **DISC-04**: System scrapes job listings from LinkedIn (read-only discovery)
- [ ] **DISC-05**: System scrapes job listings from Handshake
- [ ] **DISC-06**: User can filter jobs by location, role type, company, and keywords
- [ ] **DISC-07**: System scores each listing against user profile for match quality
- [ ] **DISC-08**: System runs scheduled/recurring job discovery automatically
- [ ] **DISC-09**: System deduplicates jobs found across multiple platforms

### AI Generation

- [ ] **AIGEN-01**: System tailors resume bullet points to match job description keywords
- [ ] **AIGEN-02**: System generates custom cover letter for each role
- [ ] **AIGEN-03**: System supports multiple AI providers (OpenAI + Claude), swappable
- [ ] **AIGEN-04**: System detects and flags fabricated qualifications in tailored resumes

### Review & Submission

- [ ] **REVW-01**: User can view batch of prepared applications in a review queue
- [ ] **REVW-02**: User can approve, reject, or edit each application before submission
- [ ] **REVW-03**: User can see diff view of original vs tailored resume
- [ ] **REVW-04**: System fills out application forms via browser automation (Playwright)
- [ ] **REVW-05**: System captures screenshot of each submitted application
- [ ] **REVW-06**: User can view application log (what, when, where, status)

### Platform & Stealth

- [ ] **PLAT-01**: System uses stealth browser configuration (anti-fingerprinting, behavioral patterns)
- [ ] **PLAT-02**: System integrates CAPTCHA solving service (2Captcha/CapSolver)
- [ ] **PLAT-03**: System uses platform-specific ATS adapters for form filling (Greenhouse, Lever, Workday)
- [ ] **PLAT-04**: System enforces rate limits and circuit breakers per platform

## v2 Requirements

### Notifications & Analytics

- **NOTF-01**: User receives email notifications for new matching jobs
- **NOTF-02**: User can view application analytics and insights (response rates, success rates)
- **NOTF-03**: System provides career site auto-detection from company URLs

### Extended Platforms

- **EXTPLAT-01**: System supports additional AI providers beyond OpenAI and Claude
- **EXTPLAT-02**: System supports proxy/IP rotation for enhanced stealth
- **EXTPLAT-03**: System supports Taleo and other legacy ATS platforms

### Enhanced Review

- **ENHREV-01**: System runs automated quality checks (company name mismatch, fabricated skills)
- **ENHREV-02**: System maintains screening question knowledge base for common questions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full autopilot (zero human review) | User requires batch review before submission; quality control is essential |
| LinkedIn Easy Apply automation | High account ban risk; LinkedIn is read-only for discovery |
| Automated recruiter outreach | Outside core value; risks spam perception |
| Mobile app | Web-first approach; mobile deferred indefinitely |
| Unlimited concurrent applications | Rate limiting required to prevent account bans |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 4 | Pending |
| DISC-04 | Phase 4 | Pending |
| DISC-05 | Phase 4 | Pending |
| DISC-06 | Phase 5 | Pending |
| DISC-07 | Phase 5 | Pending |
| DISC-08 | Phase 5 | Pending |
| DISC-09 | Phase 5 | Pending |
| AIGEN-01 | Phase 6 | Pending |
| AIGEN-02 | Phase 6 | Pending |
| AIGEN-03 | Phase 6 | Pending |
| AIGEN-04 | Phase 6 | Pending |
| REVW-01 | Phase 7 | Pending |
| REVW-02 | Phase 7 | Pending |
| REVW-03 | Phase 7 | Pending |
| REVW-04 | Phase 8 | Pending |
| REVW-05 | Phase 9 | Pending |
| REVW-06 | Phase 9 | Pending |
| PLAT-01 | Phase 3 | Pending |
| PLAT-02 | Phase 8 | Pending |
| PLAT-03 | Phase 8 | Pending |
| PLAT-04 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
