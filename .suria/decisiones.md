# Decisiones técnicas

## 2026-11-04 · Contrato del backend por `exports`
- Contexto: el frontend y la web importaban rutas internas (`@skpat/backend/src/...`) y el frontend ni siquiera declaraba la dependencia (A-1).
- Decisión: `backend/package.json` expone `./contrato` (`src/contrato/index.ts`, solo módulos puros: `ticketLabel`, `TICKET_LABELS`, `TICKET_TYPES`, `TicketType`, `buildWhatsappUrl`) y `./app` (`src/app.ts`, solo para el SSR de la web). Nadie importa `src/...` sueltas.
- Consecuencias: con `exports`, cualquier otra ruta del backend deja de resolverse desde fuera. Si el frontend o la web necesitan algo nuevo, se agrega al contrato. Los tipos del contrato (D-10) siguen pendientes de ADR.

## 2026-11-06 · Escenario 3D como isla diferida
- Contexto: William pidió una portada "fiesta 2027" con escenario 3D sin bloquear el LCP ni pasar de ~300 KB de JS inicial.
- Decisión: la portada pinta siempre una versión 2.5D en HTML/CSS/SVG (celular, `prefers-reduced-motion` y póster). El 3D es una isla React Three Fiber con la directiva propia `client:escenario` (`web/src/directivas/escenario.ts`): solo hidrata en escritorio (≥64rem, puntero fino, sin movimiento reducido, sin ahorro de datos, ≥4 núcleos) y después de `load` + `requestIdleCallback`. three.js va en un chunk aparte (`Lienzo`) que se pide solo si hay WebGL2. El ritmo es un reloj simulado de 140 BPM (`pulso.ts`), sin micrófono.
- Consecuencias: el JS inicial extra es ~1 KB gz; en escritorio se descargan después ~317 KB gz (React + three/R3F). Las fuentes pasan a autoalojadas con fontsource (Unbounded, Figtree, Big Shoulders estática); se quitó Google Fonts. Se borró el canvas 2D viejo de láseres.

