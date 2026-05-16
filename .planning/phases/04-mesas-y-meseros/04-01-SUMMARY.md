---
phase: 04-mesas-y-meseros
plan: 01
subsystem: api, database
tags: [sqlite, fastify, react, zod, vitest]

# Dependency graph
requires:
  - phase: 03-boleteria-y-acceso
    provides: users table, JWT auth (verifyAuth, requireRole), db instance
provides:
  - tables table with qr_token and 10 seeded default tables
  - menu_items table with category/price_cents
  - sales table with mesero_id FK, transaction-safe inserts
  - sale_items table with ON DELETE CASCADE
  - GET /tables — public list of active tables
  - GET /menu — public digital menu by category
  - POST /menu — admin creates menu item
  - PUT /menu/:id — admin updates/disables menu item
  - POST /sales — mesero registers sale (atomic transaction)
  - GET /sales/mine — mesero own sales tonight
  - GET /sales/tonight — admin view grouped by mesero
  - CartaPage.tsx — public /mesa/:table_number React page
affects: [04-02-panel-mesero, any phase consuming sales data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - db.transaction() for atomic sale + sale_items insert
    - RETURNING id pattern for INSERT in SQLite
    - requireRole('mesero', 'admin') multi-role guard
    - Public route outside auth guard in createBrowserRouter

key-files:
  created:
    - backend/src/lib/migrations.ts (extended)
    - backend/src/routes/tables/list.ts
    - backend/src/routes/tables/index.ts
    - backend/src/routes/menu/list.ts
    - backend/src/routes/menu/create.ts
    - backend/src/routes/menu/update.ts
    - backend/src/routes/menu/index.ts
    - backend/src/routes/sales/create.ts
    - backend/src/routes/sales/mine.ts
    - backend/src/routes/sales/tonight.ts
    - backend/src/routes/sales/index.ts
    - backend/tests/routes/menu.test.ts
    - backend/tests/routes/sales.test.ts
    - frontend/src/features/carta/CartaPage.tsx
  modified:
    - backend/src/server.ts
    - frontend/src/routes/index.tsx

key-decisions:
  - "signAccessToken (async, jose-based) used in tests — plan referenced non-existent signJwt sync helper"
  - "tablesRoutes registered without prefix so GET /tables resolves at root level"
  - "sales.nombre field required in users INSERT for test compatibility with NOT NULL constraint"

patterns-established:
  - "Multi-role guard: requireRole('mesero', 'admin') — any of the listed roles passes"
  - "Throw-inside-transaction with statusCode field for clean HTTP error mapping (same as Phase 03)"
  - "Public CartaPage uses VITE_API_URL env var for /menu fetch, no auth header"

requirements-completed: [MESA-01, MESA-02, MESA-03, MESA-04]

# Metrics
duration: 25min
completed: 2026-05-15
---

# Phase 04 Plan 01: Mesas y Meseros — Backend + CartaPage Summary

**Four SQLite tables (tables, menu_items, sales, sale_items), seven REST endpoints for tables/menu/sales, and a public CartaPage React component that renders the digital menu at /mesa/:table_number without authentication**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-15T20:20:00Z
- **Completed:** 2026-05-15T20:45:00Z
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments
- Added 4 new SQLite tables with FK constraints, indexes, and seed of 10 default tables at startup
- Implemented 7 backend endpoints across 3 route groups (tables, menu, sales) with proper role guards
- POST /sales uses db.transaction() atomically inserting sales + sale_items with computed total_cents
- CartaPage.tsx fetches /menu publicly and groups items by category with COP price formatting
- /mesa/:table_number registered as a public route in frontend router (no RoleGuard)
- 93 backend tests pass (7 new: 3 menu + 4 sales)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tables, menu_items, sales, sale_items to migrations.ts** - `c7a78de` (feat)
2. **Task 2: Backend routes — tables, menu, sales** - `362cefe` (feat)
3. **Task 3: Backend tests + CartaPage public frontend** - `4f0f8f6` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `backend/src/lib/migrations.ts` - Extended with 4 new tables + seed 10 tables
- `backend/src/routes/tables/list.ts` - GET /tables public endpoint
- `backend/src/routes/tables/index.ts` - Tables route group
- `backend/src/routes/menu/list.ts` - GET / public menu list
- `backend/src/routes/menu/create.ts` - POST / admin creates menu item (Zod validation)
- `backend/src/routes/menu/update.ts` - PUT /:id admin updates/disables menu item
- `backend/src/routes/menu/index.ts` - Menu route group
- `backend/src/routes/sales/create.ts` - POST / mesero|admin creates sale (atomic transaction)
- `backend/src/routes/sales/mine.ts` - GET /mine mesero own sales tonight
- `backend/src/routes/sales/tonight.ts` - GET /tonight admin grouped by mesero
- `backend/src/routes/sales/index.ts` - Sales route group
- `backend/src/server.ts` - Registered tablesRoutes, menuRoutes (/menu), salesRoutes (/sales)
- `backend/tests/routes/menu.test.ts` - 3 tests covering GET/POST/PUT menu
- `backend/tests/routes/sales.test.ts` - 4 tests covering POST/GET sales endpoints
- `frontend/src/features/carta/CartaPage.tsx` - Public digital menu page
- `frontend/src/routes/index.tsx` - Added /mesa/:table_number public route

## Decisions Made

- **signAccessToken (async) instead of signJwt**: The plan's test code referenced `signJwt` (a sync helper that doesn't exist in the codebase). Used the actual `signAccessToken` async function from jwt.ts — functionally identical, correct for this project.
- **tablesRoutes without prefix**: Registered as `app.register(tablesRoutes)` (no prefix) so the GET handler at `/tables` resolves correctly at root level.
- **nombre field in test user INSERTs**: The users table has `nombre TEXT NOT NULL` — test INSERTs must include it to avoid SQLite constraint errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test files used non-existent signJwt helper**
- **Found during:** Task 3 (backend tests)
- **Issue:** Plan's test code called `signJwt` (sync) and imported from jwt.js — that function does not exist; the actual export is `signAccessToken` (async)
- **Fix:** Replaced `signJwt` with `signAccessToken` and made beforeAll `async` with `await` on each token generation; also added `nombre` field to user INSERTs (NOT NULL constraint)
- **Files modified:** backend/tests/routes/menu.test.ts, backend/tests/routes/sales.test.ts
- **Verification:** 93 tests pass including all new ones
- **Committed in:** 4f0f8f6 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in plan's test code)
**Impact on plan:** Minor correction to use existing jwt.ts API. No scope creep, all plan requirements satisfied.

## Issues Encountered
None beyond the jwt helper name mismatch documented above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All API endpoints ready for 04-02 (panel del mesero) to consume
- CartaPage at /mesa/:table_number works with or without items in menu_items table
- GET /tables returns qr_token which 04-02 can use for QR generation

---
*Phase: 04-mesas-y-meseros*
*Completed: 2026-05-15*
