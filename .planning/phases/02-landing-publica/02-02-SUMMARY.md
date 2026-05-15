---
phase: 02-landing-publica
plan: 02
subsystem: ui
tags: [react, anthropic, sse, streaming, fastify, vip, ai-chat, tailwind]

# Dependency graph
requires:
  - phase: 02-landing-publica/02-01
    provides: Landing Hero + Events + Map + Navbar + CSS tokens (ai-pulse keyframe) + @anthropic-ai/sdk pre-installed

provides:
  - VipSection.tsx with 3 tier cards (Silver/Gold/Platinum), MÁS POPULAR badge on Gold
  - AiChatWidget.tsx with floating bubble, expandable chat panel, SSE token-by-token streaming
  - POST /ai/chat endpoint with Anthropic SSE proxy, system prompt with Skpat business info
  - ANTHROPIC_API_KEY + AI_MODEL validated in backend env.ts (Zod), documented in .env.example
  - Full LandingPage composition: Hero → Events → VIP → Map + AiChatWidget fixed

affects: [03-boleteria, any phase using /ai/chat, any phase modifying LandingPage]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk streaming messages.stream()", "Fastify SSE via reply.raw.writeHead + reply.raw.write", "ReadableStream getReader() for SSE in frontend"]
  patterns:
    - "SSE proxy pattern: Fastify writes directly to reply.raw (never reply.send) for streaming responses"
    - "Frontend SSE consumption: fetch + res.body.getReader() + TextDecoder with line-by-line parsing"
    - "AI SDK mock pattern: vi.mock('@anthropic-ai/sdk') with async generator for testing"
    - "ANTHROPIC_API_KEY is optional in Zod schema — route returns 503 when missing, allowing tests to run without key"
    - "Rate limit per-route config: { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }"

key-files:
  created:
    - frontend/src/features/landing/VipSection.tsx
    - frontend/src/features/landing/AiChatWidget.tsx
    - frontend/src/features/landing/__tests__/VipSection.test.tsx
    - frontend/src/features/landing/__tests__/AiChatWidget.test.tsx
    - backend/src/routes/ai/chat.ts
    - backend/src/routes/ai/index.ts
    - backend/tests/routes/ai-chat.test.ts
  modified:
    - frontend/src/features/landing/LandingPage.tsx
    - backend/src/server.ts
    - backend/src/lib/env.ts
    - backend/.env.example

key-decisions:
  - "claude-haiku-4-5-20251001 as default AI_MODEL — fast, cost-effective for chat widget use case"
  - "max_tokens: 512 for Claude responses — keeps responses concise per system prompt rules (max 3 sentences)"
  - "Rate limit 20 req/min per IP on /ai/chat — prevents abuse without blocking genuine users"
  - "ANTHROPIC_API_KEY is optional() in Zod — route returns 503 when missing, tests run without real key"
  - "System prompt in Spanish Colombian, restricts to Skpat-only topics, redirects off-topic to @skpat.vip"
  - "AiChatWidget placed as sibling of <main> (not inside it) — fixed positioning works correctly regardless of scroll containers"

patterns-established:
  - "SSE Route Pattern: reply.raw.writeHead(200, headers) then reply.raw.write(data) then reply.raw.end()"
  - "SSE Frontend Pattern: fetch + ReadableStream getReader + TextDecoder + line buffer split on newlines"
  - "Mock SDK Pattern: vi.mock with async generator yielding content_block_delta chunks"
  - "VIP Card Pattern: absolute positioned badge at top -12px with translateX(-50%) for centered overlay"

requirements-completed: [LAND-04, LAND-05]

# Metrics
duration: 15min
completed: 2026-05-15
---

# Phase 02 Plan 02: VIP Section + AI Chat Agent Summary

**VipSection (3 tiers Silver/Gold/Platinum with MÁS POPULAR badge) + AiChatWidget (floating bubble with SSE streaming from Claude haiku-4-5) completing Phase 2 landing publica**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-15T00:37:00Z
- **Completed:** 2026-05-15T00:44:30Z
- **Tasks:** 3 auto (Task 4 checkpoint auto-approved)
- **Files modified:** 11

## Accomplishments

- VipSection renders Silver ($450.000), Gold ($850.000 with "MÁS POPULAR" badge), and Platinum ($1.500.000) tier cards matching the mockup design exactly — grid auto-fill minmax 250px, dark gradient bg, colored borders per tier
- AiChatWidget implements a 52px floating bubble with ai-pulse animation that expands to a 320px chat panel, and streams AI responses token-by-token via SSE fetch + ReadableStream
- POST /ai/chat backend route proxies to Anthropic SDK with system prompt containing Skpat business info (hours Fri/Sat 9pm–4am, location Cra. 15 #93-47, entry prices $20k–$40k, VIP palco prices), returns text/event-stream SSE with `data: {"text":"..."}` frames ending in `data: [DONE]`
- All 10 backend test files pass (56 tests); all 8 frontend test files pass (26 tests); both builds exit 0
- ANTHROPIC_API_KEY never appears in frontend — strictly backend, Zod-validated, documented in .env.example

## Task Commits

1. **Task 1: Wave 0 — env validation + test stubs** - `5b70ae8` (feat)
2. **Task 2: Backend AI Chat — POST /ai/chat with SSE streaming** - `f624c93` (feat)
3. **Task 3: Frontend VipSection + AiChatWidget + LandingPage integration** - `e7d016f` (feat)

## Files Created/Modified

- `backend/src/lib/env.ts` - Added ANTHROPIC_API_KEY (optional, min 10) and AI_MODEL (default claude-haiku-4-5-20251001) to Zod schema
- `backend/.env.example` - Documented AI env vars with Anthropic console link
- `backend/src/routes/ai/chat.ts` - POST /ai/chat with Anthropic streaming, Zod validation, rate limit 20/min, system prompt
- `backend/src/routes/ai/index.ts` - aiRoutes plugin wrapping chatRoute
- `backend/src/server.ts` - Registered aiRoutes with prefix /ai
- `backend/tests/routes/ai-chat.test.ts` - 3 real tests with vi.mock for Anthropic SDK
- `frontend/src/features/landing/VipSection.tsx` - 3 tier cards with mockup-exact design
- `frontend/src/features/landing/AiChatWidget.tsx` - Floating bubble + chat panel + SSE streaming
- `frontend/src/features/landing/LandingPage.tsx` - Updated composition: Hero → Events → VIP → Map + AiChatWidget
- `frontend/src/features/landing/__tests__/VipSection.test.tsx` - 5 tests covering tiers, prices, badge, CTAs
- `frontend/src/features/landing/__tests__/AiChatWidget.test.tsx` - 4 tests covering toggle, panel, streaming

## Decisions Made

- **claude-haiku-4-5-20251001 as default model:** Fast, cost-effective for real-time chat; model env var allows override without redeploy
- **max_tokens: 512:** Keeps responses concise matching system prompt rule (max 3 sentences); prevents runaway costs
- **Rate limit 20/min per IP:** Applied via `config.rateLimit` on the route — leverages already-registered @fastify/rate-limit plugin
- **ANTHROPIC_API_KEY optional in Zod:** Route returns 503 when key missing (production guard) but tests pass without a real key; placeholder in .env
- **reply.raw pattern (not reply.send):** SSE requires writing directly to the underlying Node.js response stream; using reply.send would break streaming
- **AiChatWidget as sibling of main:** Fixed position elements inside main can be affected by transforms/overflow; sibling placement is more robust

## Deviations from Plan

None - plan executed exactly as written. The @anthropic-ai/sdk package was already installed in 02-01 Task 1 as planned.

## Issues Encountered

None - all tasks executed cleanly. Backend TypeScript compiled on first attempt. All tests passed without debugging.

## User Setup Required

Before testing streaming end-to-end with real Claude responses:

1. Edit `backend/.env`
2. Replace `ANTHROPIC_API_KEY=sk-ant-placeholder` with a real key from https://console.anthropic.com/settings/keys
3. Start backend: `cd backend && npm run dev`
4. Start frontend: `cd frontend && npm run dev`
5. Visit http://localhost:5173/ and click the 💬 bubble in the bottom-right corner

Without a real key, the widget displays "Servicio IA no disponible. Intenta más tarde." (503 response) — correct behavior.

## Phase 2 Closure — LAND-01 through LAND-05 Traceability

| Requirement | Implemented in | Status |
|-------------|---------------|--------|
| LAND-01: Landing pública accesible en / sin login | 02-01 (route setup, public guard) | DONE |
| LAND-02: HeroSection con contador de eventos y CTA | 02-01 (HeroSection.tsx) | DONE |
| LAND-03: Sección de eventos con API GET /events | 02-01 (EventsSection.tsx + backend events routes) | DONE |
| LAND-04: Agente IA con streaming SSE + system prompt Skpat | 02-02 (AiChatWidget.tsx + POST /ai/chat) | DONE |
| LAND-05: Sección Palcos VIP con 3 tiers y precios | 02-02 (VipSection.tsx) | DONE |

## Anti-Patterns Avoided

- No `VITE_ANTHROPIC` prefix — API key stays strictly in backend
- No `reply.send()` for SSE — used `reply.raw.writeHead` + `reply.raw.write` + `reply.raw.end`
- No `sk-ant-*` key in frontend/ source tree

## Handoff to Phase 3 (Boletería)

The "Comprar tiquetes" CTA in Navbar and HeroSection, and the "Reservar" CTA in each VIP tier card, all link to `/login` as placeholders. Phase 3 builds:
- The actual ticket purchase flow (checkout, QR generation)
- The login/register pages
- The payment integration (PSE/card for Colombia)

The VipSection "Reservar" links can be updated to point to a VIP reservation flow (Phase 3+) once that route exists.

---
*Phase: 02-landing-publica*
*Completed: 2026-05-15*
