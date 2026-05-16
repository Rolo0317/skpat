---
phase: 05-inventario-y-dashboard
plan: 01
subsystem: database, api
tags: [sqlite, better-sqlite3, inventory, stock, fastify]

# Dependency graph
requires:
  - phase: 04-mesas-y-meseros
    provides: menu_items table, sales/create.ts transaction pattern, db.transaction() pattern
provides:
  - stock_qty and min_stock columns on menu_items (try/catch ALTER TABLE — idempotent)
  - Atomic stock decrement on POST /sales inside existing db.transaction()
  - GET /inventory — all products with stock fields and is_low_stock flag (admin)
  - GET /inventory/alerts — only low-stock active items ordered by deficit (admin)
  - PUT /inventory/:id/stock — set stock_qty and/or min_stock (admin)
affects:
  - 05-02-PLAN.md (dashboard uses /inventory endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Try/catch ALTER TABLE ADD COLUMN for idempotent SQLite schema evolution"
    - "stock_qty = -1 sentinel for untracked/unlimited items (skip decrement)"
    - "MAX(0, stock_qty - quantity) prevents negative stock values"

key-files:
  created:
    - backend/src/routes/inventory/index.ts
    - backend/tests/routes/inventory.test.ts
  modified:
    - backend/src/lib/migrations.ts
    - backend/src/routes/sales/create.ts
    - backend/src/routes/menu/update.ts
    - backend/src/server.ts

key-decisions:
  - "stock_qty = -1 means untracked/unlimited — items with stock_qty >= 0 are the only ones decremented on sale"
  - "MAX(0, stock_qty - quantity) prevents negative stock even under concurrent updates"
  - "Try/catch wrapper around each ALTER TABLE ADD COLUMN makes migration idempotent across restarts"

patterns-established:
  - "Inventory sentinel pattern: -1 = no tracking, 0+ = tracked with floor at 0"
  - "Stock decrement embedded inside existing db.transaction() — no extra transaction nesting"

requirements-completed: [INV-01, INV-02, INV-03]

# Metrics
duration: 15min
completed: 2026-05-15
---

# Phase 05-01: Inventory Tracking Summary

**SQLite stock_qty/min_stock columns on menu_items with atomic decrement on sale and admin GET /inventory + GET /inventory/alerts + PUT /inventory/:id/stock endpoints**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-15T20:40:00Z
- **Completed:** 2026-05-15T20:55:00Z
- **Tasks:** 1 (combined implementation + tests per plan)
- **Files modified:** 6

## Accomplishments
- Added stock_qty (default -1 = unlimited) and min_stock (default 0) to menu_items via idempotent try/catch ALTER TABLE
- Integrated stock decrement atomically inside existing db.transaction() in sales/create.ts — items with stock_qty >= 0 are decremented, others skipped
- Created three admin inventory endpoints: list all, list alerts, update stock levels
- All 99 backend tests pass (including 6 new inventory tests)

## Task Commits

1. **Task 1: Add stock_qty + min_stock + inventory routes + tests** - `9763a55` (feat)

## Files Created/Modified
- `backend/src/lib/migrations.ts` - Added try/catch ALTER TABLE for stock_qty and min_stock columns
- `backend/src/routes/sales/create.ts` - Added stock_qty to SELECT, atomic decrement inside transaction
- `backend/src/routes/menu/update.ts` - Added stock_qty/min_stock to schema and UPDATE query
- `backend/src/routes/inventory/index.ts` - New: GET /inventory, GET /inventory/alerts, PUT /:id/stock
- `backend/src/server.ts` - Registered inventoryRoutes at /inventory prefix
- `backend/tests/routes/inventory.test.ts` - New: 6 tests covering all inventory endpoints

## Decisions Made
- stock_qty = -1 sentinel for untracked items, consistent with "not tracked" semantics without a nullable column
- MAX(0, stock_qty - quantity) prevents negative stock even under concurrent access patterns
- Try/catch per ALTER TABLE rather than a single block — each column independently idempotent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed signAccessToken call signature in test file**
- **Found during:** Task 1 (inventory.test.ts creation)
- **Issue:** Plan's test used `{ id, email, role, nombre }` but actual jwt.ts signAccessToken uses `{ sub, email, role }`
- **Fix:** Adapted test to use correct `{ sub: user.id, email, role }` signature matching existing sales.test.ts pattern
- **Files modified:** backend/tests/routes/inventory.test.ts
- **Verification:** All 99 tests pass including 6 new inventory tests
- **Committed in:** 9763a55

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan's test code, corrected to match actual API)
**Impact on plan:** No scope change. Correctness fix to test code only.

## Issues Encountered
None beyond the signAccessToken signature mismatch (handled above).

## Next Phase Readiness
- Inventory backend fully operational — 05-02 can build dashboard routes that call GET /inventory
- PUT /inventory/:id/stock ready for AdminInventoryPage inline editing

---
*Phase: 05-inventario-y-dashboard*
*Completed: 2026-05-15*
