---
phase: 01-foundation-auth
plan: 01
subsystem: infra
tags: [nextjs, prisma, bcryptjs, vitest, docker, postgresql, redis, zod, shadcn-ui]

# Dependency graph
requires: []
provides:
  - Next.js 15 project scaffold with App Router and Tailwind v4
  - Prisma schema with User, Account, VerificationToken models
  - Password hash/verify utilities (bcryptjs)
  - Zod sign-in validator
  - Prisma client singleton with PrismaPg adapter
  - Docker Compose with PostgreSQL 16 and Redis 7
  - Vitest test infrastructure with 4 passing password tests
affects: [01-02, 02-dashboard-ui]

# Tech tracking
tech-stack:
  added: [next@15, react@19, next-auth@beta, prisma@7, bcryptjs, zod, vitest, shadcn-ui, next-themes, @prisma/adapter-pg, pg]
  patterns: [prisma-singleton-with-adapter, bcrypt-hash-verify, zod-validation-schemas]

key-files:
  created:
    - prisma/schema.prisma
    - prisma.config.ts
    - src/lib/prisma.ts
    - src/lib/password.ts
    - src/lib/validators.ts
    - src/__tests__/lib/password.test.ts
    - docker-compose.yml
    - Dockerfile
    - .env.example
    - vitest.config.mts
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "Prisma 7 requires driver adapter (PrismaPg) -- no more direct URL in PrismaClient constructor"
  - "Generated Prisma client output to src/generated/prisma (Prisma 7 default), gitignored"
  - "Import PrismaClient from @/generated/prisma/client (Prisma 7 has no index barrel file)"

patterns-established:
  - "Prisma singleton: globalThis pattern with PrismaPg adapter factory"
  - "Password utilities: async hashPassword/verifyPassword with 12 bcrypt rounds"
  - "Validation: Zod schemas exported from src/lib/validators.ts"

requirements-completed: [AUTH-01]

# Metrics
duration: 21min
completed: 2026-03-06
---

# Phase 1 Plan 01: Project Scaffold Summary

**Next.js 15 scaffold with Prisma 7 schema (User/Account/VerificationToken), bcryptjs password utilities, Zod validators, and Vitest test suite**

## Performance

- **Duration:** 21 min
- **Started:** 2026-03-06T22:45:04Z
- **Completed:** 2026-03-06T23:06:10Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments
- Next.js 15 project fully scaffolded with all dependencies, Docker Compose, and build passing
- Prisma 7 schema with Auth.js-compatible User, Account, and VerificationToken models
- Password hash/verify utilities with 4 passing Vitest tests
- Zod sign-in validation schema ready for auth forms

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project, install dependencies, configure tooling** - `b99a45b` (feat)
2. **Task 2: Create Prisma schema, core libraries, and Wave 0 test scaffolds** - `d8676e6` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Auth.js-compatible database schema with User, Account, VerificationToken
- `prisma.config.ts` - Prisma 7 configuration with datasource URL from env
- `src/lib/prisma.ts` - PrismaClient singleton with PrismaPg driver adapter
- `src/lib/password.ts` - bcryptjs hash and verify helpers (12 salt rounds)
- `src/lib/validators.ts` - Zod signInSchema for email/password validation
- `src/__tests__/lib/password.test.ts` - 4 unit tests for password utilities
- `docker-compose.yml` - PostgreSQL 16, Redis 7, and app services with healthchecks
- `Dockerfile` - Multi-stage build (Bun install, Node runtime)
- `.env.example` - All required environment variables documented
- `vitest.config.mts` - Vitest with jsdom, tsconfigPaths, React plugin
- `package.json` - All core and dev dependencies

## Decisions Made
- Prisma 7 requires a driver adapter (`@prisma/adapter-pg`) -- the old pattern of passing a connection URL directly to PrismaClient no longer works. Added `@prisma/adapter-pg` and `pg` as dependencies.
- Generated Prisma client lives at `src/generated/prisma/` (Prisma 7 default output path) and is gitignored. Must import from `@/generated/prisma/client` (no barrel index file).
- Used `bcryptjs` (pure JS) instead of `bcrypt` (native) for Docker/Bun compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing jsdom dependency**
- **Found during:** Task 2 (running Vitest)
- **Issue:** vitest.config.mts specifies jsdom environment but jsdom was not in dependencies
- **Fix:** Ran `bun add -d jsdom`
- **Files modified:** package.json, bun.lock
- **Verification:** Vitest runs successfully with all 4 tests passing
- **Committed in:** d8676e6 (Task 2 commit)

**2. [Rule 3 - Blocking] Adapted Prisma client for Prisma 7 driver adapter requirement**
- **Found during:** Task 2 (build verification)
- **Issue:** Prisma 7 PrismaClient constructor requires an `adapter` or `accelerateUrl` parameter -- the research patterns were for Prisma 5/6
- **Fix:** Installed `@prisma/adapter-pg` and `pg`, updated prisma.ts to use PrismaPg adapter factory
- **Files modified:** src/lib/prisma.ts, package.json, bun.lock
- **Verification:** `bun run build` succeeds, all tests pass
- **Committed in:** d8676e6 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed PrismaClient import path for Prisma 7**
- **Found during:** Task 2 (build verification)
- **Issue:** Prisma 7 generates client.ts without a barrel index -- import from `@/generated/prisma` fails
- **Fix:** Changed import to `@/generated/prisma/client`
- **Files modified:** src/lib/prisma.ts
- **Verification:** `bun run build` succeeds
- **Committed in:** d8676e6 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 missing dependency, 2 Prisma 7 compatibility)
**Impact on plan:** All auto-fixes necessary for Prisma 7 compatibility. Research was based on Prisma 5/6 patterns. No scope creep.

## Issues Encountered
- Prisma 7 has breaking changes from Prisma 5/6: requires driver adapters, different client generation output structure, no barrel exports. All resolved by adapting the singleton pattern.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth.js configuration can proceed (Plan 02) with Prisma schema and password utilities ready
- Docker Compose can be started for local development with `docker compose up`
- All core libraries (prisma.ts, password.ts, validators.ts) are importable and tested

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-06*
