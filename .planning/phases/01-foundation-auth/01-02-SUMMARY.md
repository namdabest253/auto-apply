---
phase: 01-foundation-auth
plan: 02
subsystem: auth
tags: [next-auth, auth.js, jwt, credentials, oauth, middleware, shadcn-ui, next-themes, dark-mode]

# Dependency graph
requires:
  - phase: 01-foundation-auth/01
    provides: Prisma schema, password utilities, validators, prisma singleton
provides:
  - Auth.js v5 configuration with Credentials + Google + GitHub providers
  - JWT session strategy with route protection middleware
  - Login and register pages with server actions
  - Dashboard shell with dark-themed horizontal top navigation
  - Single-user registration enforcement
  - SessionProvider and ThemeProvider wrapper
affects: [02-profile-resume, 03-scraping-infrastructure]

# Tech tracking
tech-stack:
  added: [next-auth@beta, next-themes, shadcn-ui components (button, input, label, card)]
  patterns: [auth-server-actions, jwt-session-callbacks, middleware-route-protection, single-user-registration]

key-files:
  created:
    - src/auth.ts
    - src/auth.config.ts
    - src/middleware.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - src/app/(auth)/register/actions.ts
    - src/app/(auth)/login/actions.ts
    - src/components/providers.tsx
    - src/components/nav/top-nav.tsx
    - src/components/auth/login-form.tsx
    - src/components/auth/register-form.tsx
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/register/page.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/page.tsx
    - src/app/page.tsx
  modified:
    - src/app/layout.tsx
    - src/app/globals.css
    - package.json
    - bun.lock

key-decisions:
  - "JWT session strategy required for Credentials provider (database sessions incompatible)"
  - "Single-user enforcement via user count check in registration action"
  - "Auth.config.ts split pattern for Edge-compatible middleware"
  - "Dark mode as default theme using next-themes with zinc color palette"
  - "Top horizontal navigation bar (not sidebar) per locked design decision"

patterns-established:
  - "Server actions for auth: login/register actions with 'use server' directive"
  - "JWT callbacks: copy user.id to token.id in jwt callback, token.id to session.user.id in session callback"
  - "Middleware route protection: redirect unauthenticated to /login, redirect authenticated away from auth pages"
  - "Providers wrapper: SessionProvider + ThemeProvider composing at app root"

requirements-completed: [AUTH-01]

# Metrics
duration: 90min
completed: 2026-03-06
---

# Phase 1 Plan 02: Auth.js Authentication Summary

**Auth.js v5 with Credentials + OAuth providers, JWT sessions, route-protecting middleware, login/register server actions, and dark-themed dashboard shell with top navigation**

## Performance

- **Duration:** ~90 min (including checkpoint verification)
- **Started:** 2026-03-06T23:54:06Z
- **Completed:** 2026-03-07T01:23:58Z
- **Tasks:** 3 (2 implementation + 1 verification checkpoint)
- **Files modified:** 24

## Accomplishments
- Auth.js v5 fully configured with Credentials, Google, and GitHub providers using JWT session strategy
- Route protection middleware redirects unauthenticated users to /login and authenticated users away from auth pages
- Server actions for login and registration with Zod validation, password hashing, and single-user enforcement
- Dark-themed dashboard shell with horizontal top navigation bar showing user email and logout
- Complete auth flow verified end-to-end: register, auto-login, session persistence, logout, re-login, single-user block

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth.js config, API route, middleware, and server actions** - `5333ec1` (feat)
2. **Task 2: Auth pages, dashboard shell, providers, and top navigation** - `748e1e8` (feat)
3. **Task 3: Verify complete auth flow end-to-end** - checkpoint approved (no commit, verification only)

## Files Created/Modified
- `src/auth.ts` - Auth.js v5 config with Credentials + OAuth providers, JWT callbacks
- `src/auth.config.ts` - Edge-compatible auth config split for middleware
- `src/middleware.ts` - Route protection with auth page redirect logic
- `src/app/api/auth/[...nextauth]/route.ts` - Auth API route re-exporting handlers
- `src/app/(auth)/register/actions.ts` - Registration server action with single-user enforcement
- `src/app/(auth)/login/actions.ts` - Login server action wrapping signIn
- `src/components/providers.tsx` - SessionProvider + ThemeProvider wrapper
- `src/components/nav/top-nav.tsx` - Horizontal top nav with brand, email, and logout
- `src/components/auth/login-form.tsx` - Email/password login form with error display
- `src/components/auth/register-form.tsx` - Registration form with password confirmation
- `src/app/(auth)/layout.tsx` - Centered auth page layout
- `src/app/(auth)/login/page.tsx` - Login page rendering LoginForm
- `src/app/(auth)/register/page.tsx` - Register page rendering RegisterForm
- `src/app/(dashboard)/layout.tsx` - Dashboard layout with TopNav
- `src/app/(dashboard)/page.tsx` - Placeholder dashboard landing page
- `src/app/page.tsx` - Root redirect based on auth state
- `src/app/layout.tsx` - Updated with Providers wrapper and suppressHydrationWarning
- `src/app/globals.css` - Updated styles

## Decisions Made
- JWT session strategy is required when using the Credentials provider (Auth.js/NextAuth limitation)
- Split auth config into `auth.config.ts` for Edge-compatible middleware usage
- Single-user enforcement implemented as a user count check in the registration action rather than a feature flag
- Dark mode set as default theme (not system-following) per locked project decision
- Horizontal top navigation bar chosen over sidebar per locked project decision

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require optional configuration.** OAuth providers (Google, GitHub) work only when env vars are configured:
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth (optional)
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` - GitHub OAuth (optional)

The app works fully with email/password authentication without these configured.

## Issues Encountered
None

## Next Phase Readiness
- Auth system complete: login, register, sessions, logout, route protection all working
- Dashboard shell ready for Phase 2 (Profile & Resume) to add content within the authenticated layout
- Provider pattern established for future client-side context needs
- Single-user mode active; registration closes after first account creation

## Self-Check: PASSED

All key files verified present. Both task commits (5333ec1, 748e1e8) confirmed in git history.

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-06*
