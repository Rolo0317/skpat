# Bitácora

## 2026-11-04 21:15 · suria-devops · T-02 y T-03 Workspaces y landing vieja
- Hecho: rama `refactor/workspaces` desde `main`. Commit `768328a` (paso 1): `npm install` en la raíz (los junctions de node_modules/@skpat ya apuntan a la carpeta actual), `@skpat/backend` declarado en el frontend, `backend/src/contrato/index.ts` expuesto en `exports` (`./contrato` y `./app`), 5 imports del frontend y 2 de la web repuntados. Commit `4a2d312` (paso 8, aprobado por William): `SkpatEvent` a `features/events/types.ts`, borrada `features/landing/*` con sus 6 pruebas, `main.tsx` standalone redirige `/` a `/login`.
- Archivos: backend/package.json, backend/src/contrato/index.ts, frontend/package.json, package-lock.json, frontend/src/panels/**, frontend/src/features/{events,tickets,landing}, frontend/src/main.tsx, frontend/tests/fixtures/operacion.ts, web/src/lib/backend.ts, web/src/components/landing/utilidades/whatsapp.ts
- Verificación: antes: backend 197/197; frontend 5 de 23 archivos sin cargar, 62 pruebas; build del frontend y de la web fallaban por el mismo import. Después del paso 1: backend 197/197, frontend 23/23 archivos y 78 pruebas, los 3 builds OK. Después del paso 8: frontend 17/17 archivos y 59 pruebas, builds de frontend y web OK.
- Pendiente: merge a `main` y deploy (no se hicieron, a propósito). Pasos 2 a 7 del plan. `npm install` reporta 31 vulnerabilidades (1 crítica) sin revisar.
- Para: suria-revisor — revisar la rama `refactor/workspaces` antes del merge; después suria-junior con el paso 2 y suria-seguridad con N-4 (HTML del correo) y `npm audit`.

## 2026-11-03 20:30 · suria-arquitecto · T-01 Auditoría de deuda técnica
- Hecho: auditoría de solo lectura de backend/ y frontend/ (más los acoples con web/). Hallazgos con archivo:línea y un plan de 8 refactorizaciones seguras. Se creó `.suria/` porque no existía.
- Archivos: DEUDA-TECNICA.md, .suria/{proyecto,plan,decisiones,bitacora}.md
- Verificación: backend `npx vitest run` → 23 archivos, 197 pruebas en verde. Frontend `npx vitest run` → 5 de 23 archivos no cargan (`@skpat/backend/src/lib/ticketPrices` no resuelve: los enlaces de node_modules/@skpat apuntan a C:\skpat_vip). Las 62 pruebas que cargan pasan.
- Pendiente: ejecutar el plan (pasos 1 a 8). Falta que William apruebe borrar la landing de React (paso 8) y un ADR para el contrato compartido (D-10).
- Para: suria-devops — paso 1 (npm install + declarar @skpat/backend en el frontend + `exports` del contrato) antes de que alguien toque el frontend. Después suria-junior y suria-backend con los pasos 2 a 6. suria-seguridad: el HTML del correo no escapa nombre ni título (backend/src/lib/email.ts:51-52).
