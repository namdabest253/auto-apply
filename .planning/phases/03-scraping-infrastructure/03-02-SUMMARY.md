---
phase: 03-scraping-infrastructure
plan: 02
subsystem: scraping
tags: [bullmq, ioredis, redis, worker, queue, api-routes]

# Dependency graph
requires:
  - phase: 03-scraping-infrastructure
    provides: ScraperAdapter interface, IndeedScraper, GreenhouseScraper, filterNewJobs dedup helper
provides:
  - BullMQ scrape queue with Redis connection factory
  - Worker process orchestrating both scrapers with partial-safe error handling
  - Custom backoff strategy (30s, 60s, 5min)
  - Docker Compose worker service
  - POST /api/scrape/trigger endpoint for enqueuing scrape jobs
  - GET /api/scrape/status endpoint for polling run status
affects: [03-03-ui, 04-pipeline]

# Tech tracking
tech-stack:
  added: [bullmq, ioredis]
  patterns: [BullMQ worker as separate process, custom backoff strategy, ConnectionOptions pattern]

key-files:
  created:
    - src/workers/queue.ts
    - src/workers/scrape.worker.ts
    - src/workers/scrape.worker.test.ts
    - src/app/api/scrape/trigger/route.ts
    - src/app/api/scrape/status/route.ts
  modified:
    - docker-compose.yml
    - package.json

key-decisions:
  - "Use ConnectionOptions object instead of IORedis instance to avoid version mismatch between top-level ioredis and BullMQ bundled ioredis"
  - "JSON.parse(JSON.stringify()) for Prisma JSON field compatibility with Record<string, unknown>"
  - "completed_with_errors status when some scrapers fail but processor succeeds"

patterns-established:
  - "Queue setup: getRedisConnectionOptions() returns ConnectionOptions with maxRetriesPerRequest: null"
  - "Worker: separate process via tsx, concurrency 1, custom backoff for exponential delays"
  - "API routes: auth check via session, user ownership verification on scrape runs"

requirements-completed: [DISC-01, DISC-02, PLAT-01]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 3 Plan 2: Worker Queue and API Routes Summary

**BullMQ scrape worker with partial-safe orchestration, custom exponential backoff, and trigger/status API endpoints**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T02:03:45Z
- **Completed:** 2026-03-09T02:06:41Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- BullMQ queue and worker process with concurrency 1 and custom backoff (30s, 60s, 5min)
- Worker orchestrates both scrapers sequentially with partial-safe error handling (one failure does not block the other)
- POST /api/scrape/trigger creates ScrapeRun, validates job preferences, enqueues BullMQ job
- GET /api/scrape/status returns run status for frontend polling (by runId or latest)
- Docker Compose worker service for production deployment
- 5 integration tests covering processor lifecycle, partial-safe saving, and error scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: BullMQ queue + worker process + Docker service + worker tests** - `a74d448` (feat)
2. **Task 2: API routes for scrape trigger and status polling** - `fe5bc2d` (feat)

## Files Created/Modified
- `src/workers/queue.ts` - BullMQ queue and Redis connection options factory
- `src/workers/scrape.worker.ts` - Worker process: runs scrapers, dedup, saves to DB, updates ScrapeRun
- `src/workers/scrape.worker.test.ts` - 5 integration tests for worker processor
- `src/app/api/scrape/trigger/route.ts` - POST endpoint to enqueue scrape job
- `src/app/api/scrape/status/route.ts` - GET endpoint for scrape run status polling
- `docker-compose.yml` - Added worker service
- `package.json` - Added BullMQ, ioredis deps and worker scripts

## Decisions Made
- Used ConnectionOptions object (host/port) instead of IORedis instance to avoid type mismatch between top-level ioredis and BullMQ's bundled version
- Used JSON.parse(JSON.stringify()) to convert Record<string, unknown> to Prisma-compatible JSON type
- Worker uses "completed_with_errors" status when some scrapers fail but the overall processor succeeds (partial results saved)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] IORedis version mismatch with BullMQ**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Top-level ioredis types incompatible with BullMQ's bundled ioredis types (different versions)
- **Fix:** Used ConnectionOptions object (host/port/maxRetriesPerRequest) instead of IORedis instance
- **Files modified:** src/workers/queue.ts, src/workers/scrape.worker.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** a74d448

**2. [Rule 1 - Bug] Prisma JSON field type incompatibility**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Record<string, unknown> not assignable to Prisma's InputJsonValue type
- **Fix:** Used JSON.parse(JSON.stringify()) to produce a Prisma-compatible JSON value
- **Files modified:** src/workers/scrape.worker.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** a74d448

**3. [Rule 1 - Bug] Vitest mock constructors for BullMQ and scrapers**
- **Found during:** Task 1 (test execution)
- **Issue:** vi.fn().mockImplementation() arrow functions are not valid constructors; test threw "is not a constructor"
- **Fix:** Used class-based mocks instead of vi.fn().mockImplementation() for Queue, Worker, IndeedScraper, GreenhouseScraper
- **Files modified:** src/workers/scrape.worker.test.ts
- **Verification:** All 5 tests pass
- **Committed in:** a74d448

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correct compilation and test execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - Redis connection uses REDIS_URL env var already configured in docker-compose.yml.

## Next Phase Readiness
- Queue and worker ready for Plan 03 (UI) to trigger via POST /api/scrape/trigger
- Status polling endpoint ready for frontend scrape status bar
- Worker scripts available for local development (npm run worker:scrape:watch)

---
*Phase: 03-scraping-infrastructure*
*Completed: 2026-03-09*
