# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding, database setup, authentication, and the web app shell. This phase delivers a running Next.js application with auth, a Docker Compose dev environment, and the visual foundation (nav, layout, theming) that all future phases build on.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Shell
- Top navigation bar (horizontal, not sidebar)
- Dark mode as default theme
- After login, jump straight to the primary action view (no overview/stats page)
- Use shadcn/ui component library (Radix UI + Tailwind CSS)

### Authentication
- Email/password + OAuth (Google and GitHub)
- Single-user application — no multi-user registration or user management
- Persistent sessions — stay logged in until manual logout
- Use NextAuth/Auth.js for auth implementation

### Deployment & Configuration
- Run locally via Docker Compose (not always-on server or cloud)
- Guided CLI setup wizard on first run (walks through API keys, preferences)
- API keys (OpenAI, CAPTCHA service, etc.) configured via .env file, not in-app settings

### Dev Experience
- Single Next.js app — no monorepo, API routes handle backend logic
- Use bun as package manager and runtime
- PostgreSQL via Docker Compose for database
- Prisma as ORM (from research recommendation)
- Redis via Docker Compose for BullMQ (needed in Phase 3, provision now)
- Vitest for testing — test auth flows and core business logic, skip UI tests
- ESLint + Prettier for linting/formatting

### Claude's Discretion
- Exact Tailwind color palette for dark theme
- shadcn/ui component variants and customization
- Docker Compose service naming and network config
- Prisma schema design for users/sessions
- Setup wizard implementation details (CLI vs first-run web page)

</decisions>

<specifics>
## Specific Ideas

- Single-user but still uses proper auth (not just "skip login") — supports OAuth which implies proper session management
- Docker Compose should provision PostgreSQL and Redis even though Redis isn't used until Phase 3 — avoids re-doing Docker setup later
- The "jump to action" landing means the default route after login goes to whatever the primary view is (job listings once Phase 3 lands, but for now a placeholder dashboard)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- This phase establishes the integration points for all future phases:
  - Next.js app router structure (pages, layouts, API routes)
  - Prisma client and database connection
  - Auth session provider wrapping the app
  - Docker Compose services (postgres, redis, app)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-03-06*
