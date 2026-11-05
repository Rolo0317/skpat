# Decisiones técnicas

## 2026-11-04 · Contrato del backend por `exports`
- Contexto: el frontend y la web importaban rutas internas (`@skpat/backend/src/...`) y el frontend ni siquiera declaraba la dependencia (A-1).
- Decisión: `backend/package.json` expone `./contrato` (`src/contrato/index.ts`, solo módulos puros: `ticketLabel`, `TICKET_LABELS`, `TICKET_TYPES`, `TicketType`, `buildWhatsappUrl`) y `./app` (`src/app.ts`, solo para el SSR de la web). Nadie importa `src/...` sueltas.
- Consecuencias: con `exports`, cualquier otra ruta del backend deja de resolverse desde fuera. Si el frontend o la web necesitan algo nuevo, se agrega al contrato. Los tipos del contrato (D-10) siguen pendientes de ADR.
