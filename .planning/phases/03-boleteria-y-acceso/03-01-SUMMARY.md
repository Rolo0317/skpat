---
phase: 03-boleteria-y-acceso
plan: "01"
subsystem: backend-tickets
tags: [tickets, concurrency, sqlite-transaction, qr, email, testing]
dependency_graph:
  requires: []
  provides: [atomic-ticket-purchase, sold-out-422, spot-decrement, qr-unit-tests, email-unit-tests, smtp-env-docs]
  affects: [03-02-frontend-purchase]
tech_stack:
  added: []
  patterns: [db.transaction-synchronous-exclusive-lock, throw-inside-transaction-for-rollback, async-io-after-commit]
key_files:
  created:
    - backend/tests/lib/qr.test.ts
    - backend/tests/lib/email.test.ts
  modified:
    - backend/src/routes/tickets/purchase.ts
    - backend/tests/routes/tickets.test.ts
    - backend/.env.example
decisions:
  - "db.transaction() wraps check+decrement+insert atomically; async QR/email run after commit"
  - "Errors thrown inside transaction bubble up as tagged Error objects (statusCode field)"
  - "available_spots check uses <= 0 guard (not === 0) for safety against negative values"
metrics:
  duration: 5min
  completed_date: "2026-05-15"
  tasks_completed: 3
  files_changed: 5
---

# Phase 03 Plan 01: Atomic Ticket Purchase + Spot Decrement Summary

**One-liner:** Closed concurrency gap in POST /tickets/purchase using db.transaction() wrapping spot-check, available_spots decrement, and ticket insert atomically, with 422 SoldOut guard preventing oversell.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 RED — sold-out + decrement + qr/email tests | bddedef | tickets.test.ts, qr.test.ts, email.test.ts |
| 2 | Wave 1 GREEN — atomic db.transaction purchase fix | a338d84 | purchase.ts |
| 3 | Document SMTP env vars in .env.example | 10f51d3 | .env.example |

## What Was Built

### Concurrency Fix (purchase.ts)

The original route had a critical TOCTOU bug: it read `events.is_active` outside any transaction, then inserted the ticket without ever decrementing `available_spots`. Two concurrent requests could both pass the spot check and both insert tickets, causing overselling.

The fix wraps the entire check sequence inside `db.transaction()`:

1. SELECT event with `available_spots` column included
2. Guard: if `available_spots <= 0` throw SoldOut error (rolled back automatically)
3. `UPDATE events SET available_spots = available_spots - 1`
4. INSERT into tickets

Because `db.transaction()` in better-sqlite3 uses an EXCLUSIVE write lock, concurrent SQLite connections cannot interleave inside this block. After the transaction commits synchronously, the async operations (QR PNG generation, email send) run outside — they cannot be inside a synchronous transaction callback.

### Tests Added

**tickets.test.ts** — 3 new assertions in `POST /tickets/purchase — concurrency and spot decrement`:
- `decrements available_spots by 1 on successful purchase` — verifies atomic decrement
- `returns 422 SoldOut when available_spots is 0` — verifies no oversell, no ticket row created
- `exhausts available_spots sequentially without going negative` — verifies final spots = 0 after two sequential attempts on a 1-spot event

**qr.test.ts** (new) — 4 tests:
- generateQrToken returns 64-char lowercase hex
- 100 calls produce 100 unique values
- generateQrDataUrl returns PNG base64 data URL

**email.test.ts** (new) — 1 test:
- sendTicketEmail logs to console.info when SMTP env is not configured (no exception thrown)

### .env.example

Added SMTP block (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, FRONTEND_URL) with inline comments explaining Gmail App Password setup and the console-fallback behavior when SMTP vars are absent.

## Decisions Made

1. **Throw-inside-transaction pattern** — errors thrown from within `db.transaction()` callback cause automatic rollback. Tagged with `statusCode` field so the catch block outside can map to HTTP responses cleanly.

2. **`available_spots <= 0` guard** — using `<= 0` rather than `=== 0` provides defense against any future negative values from data corruption or manual edits.

3. **Async I/O after commit** — `generateQrDataUrl` and `sendTicketEmail` run after `purchaseTx()` returns. They cannot run inside the synchronous transaction callback because they involve async PNG generation and network I/O.

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| tickets.test.ts | 17 | All green (3 new + 14 pre-existing) |
| qr.test.ts | 4 | All green |
| email.test.ts | 1 | All green |
| Full backend suite | 84 | All green |

## Self-Check: PASSED

All files exist and all commits verified:
- backend/tests/lib/qr.test.ts — FOUND
- backend/tests/lib/email.test.ts — FOUND
- backend/tests/routes/tickets.test.ts — FOUND (modified)
- backend/src/routes/tickets/purchase.ts — FOUND (modified)
- backend/.env.example — FOUND (modified)
- .planning/phases/03-boleteria-y-acceso/03-01-SUMMARY.md — FOUND
- bddedef (test RED) — FOUND
- a338d84 (feat GREEN) — FOUND
- 10f51d3 (docs .env) — FOUND
