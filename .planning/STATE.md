---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: "Completed 05-01-PLAN.md — inventory tracking: stock_qty/min_stock + atomic decrement + alerts endpoint"
last_updated: "2026-05-16T14:17:37.065Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 12
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-14)

**Core value:** Cliente compra tiquete con QR desde la web; dueño ve ventas en tiempo real — sin manillas físicas ni procesos manuales.
**Current focus:** Phase 5 — Inventario y Dashboard

## Current Position

Phase: 5 (Inventario y Dashboard) — EXECUTING
Plan: 1 of 2

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-fundacion-y-seguridad P01 | 9 | 2 tasks | 26 files |
| Phase 01-fundacion-y-seguridad P02 | 8min | 2 tasks | 24 files |
| Phase 01-fundacion-y-seguridad P03 | 10 | 2 tasks | 29 files |
| Phase 02-landing-publica P01 | 90min | 4 tasks | 26 files |
| Phase 02-landing-publica P02 | 15min | 3 tasks | 11 files |
| Phase 03-boleteria-y-acceso P01 | 5min | 3 tasks | 5 files |
| Phase 03-boleteria-y-acceso P02 | 10min | 3 tasks | 9 files |
| Phase 03-boleteria-y-acceso P03-03 | 12min | 3 tasks | 6 files |
| Phase 04-mesas-y-meseros P01 | 25min | 3 tasks | 17 files |
| Phase 04-mesas-y-meseros P04-02 | 4min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Setup]: Vite + React (no Next.js) — requerimiento explícito del desarrollador
- [Stack Change]: Supabase replaced by SQLite (better-sqlite3) + custom JWT — fully local dev, no cloud BaaS dependency
- [Setup]: SQLite with better-sqlite3 (WAL mode, foreign_keys ON) — production can swap to PostgreSQL via Drizzle later
- [Setup]: PWA para meseros — sin instalación, funciona en cualquier teléfono del personal
- [Phase 01-fundacion-y-seguridad]: Used @node-rs/argon2 (not argon2/node-argon2) — prebuilt Rust binaries, no node-gyp required on Railway/Render
- [Phase 01-fundacion-y-seguridad]: VITE_ prefix boundary enforced: service role key strictly backend-only, never in frontend env
- [Phase 01-fundacion-y-seguridad]: Wave 0 stubs use it.todo at individual test level — vitest exits 0 before implementation
- [Phase 01-fundacion-y-seguridad]: Custom JWT (HS256 with jose) replaces Supabase Auth JWKS — JWT_SECRET/JWT_REFRESH_SECRET from env
- [Phase 01-fundacion-y-seguridad]: Refresh token rotation — each use revokes old token and issues new (prevents replay attacks)
- [Phase 01-fundacion-y-seguridad]: argon2id for user passwords — @node-rs/argon2 numeric Algorithm value 2 (isolatedModules compat)
- [Phase 01-fundacion-y-seguridad]: localStorage JWT tokens (skpat_access/skpat_refresh) replace Supabase session — no BaaS client in frontend
- [Phase 01-fundacion-y-seguridad]: Backend SkpatRole uses admin (not administrador) — aligns with jwt.ts SkpatRole type
- [Phase 02-landing-publica]: CSS keyframes (bounce-scroll, pulse-glow) in index.css — zero bundle overhead, Tailwind v4 compatible
- [Phase 02-landing-publica]: Image path /uploads/{uuid}{ext} — UUID prevents collisions; extension preserved for browser MIME inference
- [Phase 02-landing-publica]: Soft-delete events (is_active=0) — preserves FK integrity for Phase 3 ticket references
- [Phase 02-landing-publica]: VITE_API_URL env var instead of Vite proxy — explicit, works for mobile testing on local network
- [Phase 02-landing-publica]: claude-haiku-4-5-20251001 as default AI_MODEL for AiChatWidget — fast and cost-effective for real-time chat
- [Phase 02-landing-publica]: SSE via reply.raw pattern (not reply.send) — required for Fastify streaming responses
- [Phase 02-landing-publica]: ANTHROPIC_API_KEY optional in Zod — route returns 503 when missing, tests pass without real key
- [Phase 03-boleteria-y-acceso]: db.transaction() wraps check+decrement+insert atomically; async QR/email run after commit
- [Phase 03-boleteria-y-acceso]: Throw-inside-transaction pattern — errors tagged with statusCode field trigger automatic rollback and clean HTTP mapping
- [Phase 03-boleteria-y-acceso]: available_spots <= 0 guard (not === 0) for safety against negative values from data corruption
- [Phase 03-boleteria-y-acceso]: qr-scanner mock uses ES class syntax not vi.fn().mockImplementation — required for new QrScanner() constructor calls in jsdom
- [Phase 03-boleteria-y-acceso]: PorteroHome default mode is 'manual' not 'camera' — avoids camera permission errors in dev/local
- [Phase 03-boleteria-y-acceso]: Vite ?url worker import pattern: import workerUrl from 'qr-scanner/qr-scanner-worker.min.js?url' + QrScanner.WORKER_PATH = workerUrl — required for Web Worker resolution
- [Phase 03-boleteria-y-acceso]: setInterval with refetchInterval variable for AttendeeListPage polling — TanStack Query not installed
- [Phase 03-boleteria-y-acceso]: VipSection Reservar CTAs changed from /login links to buttons opening inline palco reservation form
- [Phase 04-mesas-y-meseros]: signAccessToken (async, jose-based) used in tests — plan referenced non-existent signJwt sync helper
- [Phase 04-mesas-y-meseros]: tablesRoutes registered without prefix so GET /tables resolves at root level
- [Phase 04-mesas-y-meseros]: requireRole('mesero', 'admin') multi-role guard pattern established for mesero endpoints
- [Phase 04-mesas-y-meseros]: Inline styles (React.CSSProperties) for mesero/admin panels — avoids Tailwind class conflicts, consistent with PorteroHome
- [Phase 04-mesas-y-meseros]: AdminHome polls /sales/tonight every 10s via setInterval — TanStack Query not installed, mirrors AttendeeListPage pattern
- [Phase 05-inventario-y-dashboard]: stock_qty = -1 sentinel for untracked items — items with stock_qty >= 0 are the only ones decremented on sale
- [Phase 05-inventario-y-dashboard]: MAX(0, stock_qty - quantity) prevents negative stock values on atomic decrement
- [Phase 05-inventario-y-dashboard]: Try/catch per ALTER TABLE ADD COLUMN makes each migration idempotent across server restarts

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-05-16T14:17:11.043Z
Stopped at: Completed 05-01-PLAN.md — inventory tracking: stock_qty/min_stock + atomic decrement + alerts endpoint
Resume file: None
