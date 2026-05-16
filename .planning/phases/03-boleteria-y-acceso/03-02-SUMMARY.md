---
phase: 03-boleteria-y-acceso
plan: 02
subsystem: ui
tags: [react, react-router, qr-scanner, vite, vitest, tickets, portero]

# Dependency graph
requires:
  - phase: 03-boleteria-y-acceso/03-01
    provides: POST /tickets/purchase and POST /tickets/scan endpoints
  - phase: 02-landing-publica
    provides: EventCard component and landing page route structure
provides:
  - Public route /comprar/:event_id mapped to TicketPurchasePage (no auth wall)
  - EventCard Comprar button navigates to /comprar/${event.id} via react-router Link
  - QrScannerWidget reusable camera scanner component using qr-scanner npm
  - PorteroHome full implementation with camera/manual tabs, scan result, session stats
affects: [03-boleteria-y-acceso/03-03, future-portero-features]

# Tech tracking
tech-stack:
  added: [qr-scanner@^1.4.2]
  patterns:
    - Vite ?url worker import for qr-scanner Web Worker resolution
    - Class-based vi.mock for testing ES class libraries in jsdom
    - In-memory session counters via useState (no backend stats endpoint needed)
    - Auto-reset result display with setTimeout + useRef cleanup on unmount

key-files:
  created:
    - frontend/src/panels/portero/QrScannerWidget.tsx
    - frontend/src/panels/portero/__tests__/QrScannerWidget.test.tsx
    - frontend/src/panels/portero/__tests__/PorteroHome.test.tsx
    - frontend/src/features/tickets/__tests__/TicketPurchasePage.test.tsx
  modified:
    - frontend/package.json (added qr-scanner dependency)
    - frontend/src/routes/index.tsx (added public /comprar/:event_id route)
    - frontend/src/features/landing/EventCard.tsx (Comprar -> Link to /comprar/)
    - frontend/src/panels/portero/PorteroHome.tsx (full replacement)
    - frontend/src/index.css (added @keyframes scan animation)

key-decisions:
  - "qr-scanner mock uses ES class syntax (class MockQrScanner) not vi.fn().mockImplementation — required for new QrScanner() constructor calls in jsdom"
  - "Default mode in PorteroHome is 'manual' not 'camera' — avoids camera permission errors in dev/local environments"
  - "Vite ?url worker import pattern: import workerUrl from 'qr-scanner/qr-scanner-worker.min.js?url' — required for Web Worker file resolution in Vite builds"

patterns-established:
  - "Vite ?url import: use import workerUrl from 'pkg/worker.js?url' + assign to Lib.WORKER_PATH for any worker-based library"
  - "Class-based mock for ES class libraries: vi.mock('pkg', () => ({ default: class MockLib { ... } })) avoids 'not a constructor' errors"
  - "Auto-reset UI pattern: setTimeout + useRef to clear timer on unmount, re-enable scanner after result display"

requirements-completed: [TICK-01, TICK-04]

# Metrics
duration: 10min
completed: 2026-05-15
---

# Phase 3 Plan 02: Boleteria Frontend Wiring Summary

**Public /comprar/:event_id route wired to TicketPurchasePage, EventCard CTA updated to react-router Link, qr-scanner@1.4.2 installed with Vite ?url worker, and PorteroHome replaced with camera/manual scanner UI + session stats**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-15T19:49:00Z
- **Completed:** 2026-05-16T00:55:01Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Registered public SPA route `/comprar/:event_id` outside any RoleGuard — guests can purchase tickets without auth
- Wired EventCard "Comprar" button from `<a href="/login">` to `<Link to="/comprar/${event.id}">` via react-router-dom
- Built QrScannerWidget with qr-scanner npm library and Vite `?url` worker import pattern, camera preference 'environment'
- Replaced 9-line PorteroHome stub with 170+ line implementation: Camera tab, Manual tab (default), VALIDO/YA USADO/INVALIDO display with 5s auto-reset, ingresados/rechazados/total counters
- Added 8 new tests across 3 test files — all passing, full suite 34/34 green
- Frontend build passes TypeScript compilation and Vite bundling with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install qr-scanner + /comprar route + EventCard CTA + TicketPurchasePage test** - `d3410b1` (feat)
2. **Task 2: QrScannerWidget with qr-scanner + Vite ?url worker** - `d77b71a` (feat)
3. **Task 3: PorteroHome scanner + manual input + result display + session stats** - `dfefab8` (feat)

## Files Created/Modified
- `frontend/package.json` - Added qr-scanner@^1.4.2 dependency
- `frontend/src/routes/index.tsx` - Added public route { path: '/comprar/:event_id', element: <TicketPurchasePage /> }
- `frontend/src/features/landing/EventCard.tsx` - Replaced <a href="/login"> with <Link to="/comprar/${event.id}"> + sold-out span
- `frontend/src/panels/portero/QrScannerWidget.tsx` - New: camera scanner using qr-scanner + Vite ?url worker import
- `frontend/src/panels/portero/PorteroHome.tsx` - Full replacement: camera/manual tabs, /tickets/scan POST, result display, session counters
- `frontend/src/panels/portero/__tests__/QrScannerWidget.test.tsx` - New: 2 tests with class-based mock
- `frontend/src/panels/portero/__tests__/PorteroHome.test.tsx` - New: 4 tests (header/stats, valid, AlreadyUsed, short token)
- `frontend/src/features/tickets/__tests__/TicketPurchasePage.test.tsx` - New: 2 tests (form renders, event not found)
- `frontend/src/index.css` - Added @keyframes scan animation for QR scan line effect

## Decisions Made
- Used ES class syntax for qr-scanner mock (`class MockQrScanner`) instead of `vi.fn().mockImplementation()` — the latter fails with "not a constructor" because vi.fn() arrow functions cannot be used with `new`
- Set default mode to `'manual'` in PorteroHome to avoid camera permission errors during local development; camera mode still available via tab toggle
- Vite `?url` worker import pattern is mandatory for qr-scanner — without it, the QR decode Web Worker cannot be resolved at build time

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed qr-scanner mock using ES class syntax**
- **Found during:** Task 2 (QrScannerWidget test execution)
- **Issue:** Plan specified `vi.fn().mockImplementation(() => ({...}))` for the QrScanner constructor mock, but this produces an arrow function that cannot be called with `new`, causing TypeError: "not a constructor"
- **Fix:** Replaced with `class MockQrScanner { start = vi.fn()... }` — proper ES class that Vitest accepts as a constructable mock
- **Files modified:** `frontend/src/panels/portero/__tests__/QrScannerWidget.test.tsx`
- **Verification:** Both QrScannerWidget tests pass after fix
- **Committed in:** d77b71a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in plan-provided test code)
**Impact on plan:** Fix required for test correctness. No scope changes, no extra functionality added.

## Issues Encountered
- qr-scanner mock constructor pattern — plan's `vi.fn().mockImplementation` doesn't create constructable functions in Vitest. Replaced with class-based mock. (Auto-fixed per Rule 1.)

## User Setup Required
None - no external service configuration required. qr-scanner is a pure npm package requiring no API keys.

## Next Phase Readiness
- TICK-01 (purchase flow) and TICK-04 (scan/validation flow) are fully wired in the frontend
- Plan 03-03 can now use `/tickets/scan` and `/tickets/mine` patterns already established
- QrScannerWidget is reusable for any future scan needs
- PorteroHome session counters are in-memory only — a future plan could persist them to backend if needed

---
*Phase: 03-boleteria-y-acceso*
*Completed: 2026-05-15*
