# Plan

| ID | Tarea | Dueño | Estado | Depende de | Listo cuando |
|---|---|---|---|---|---|
| T-01 | Auditoría de deuda técnica (Clean Code, DRY, SOLID) | suria-arquitecto | hecha | — | `DEUDA-TECNICA.md` en la raíz con hallazgos y plan de 8 refactorizaciones |
| T-02 | Paso 1: enlaces de workspaces, `@skpat/backend` en el frontend y `backend/src/contrato` | suria-devops | hecha | T-01 | Frontend 23/23 archivos en verde, backend 197, builds OK (rama `refactor/workspaces`, sin merge) |
| T-03 | Paso 8: mover `SkpatEvent` y borrar la landing vieja de React | suria-devops | hecha | T-02 | Sin `features/landing`, pruebas y builds de frontend y web en verde (rama `refactor/workspaces`, sin merge) |
| T-04 | Web 2027: escenario 3D (R3F) en la portada, versión 2.5D para celular y movimiento reducido, y dirección de arte de fiesta | suria-3d | hecha | T-02 | Rama `web-2027` con pruebas y build en verde, capturas en 1440 y 390 (Firefox/WebKit) y vista previa en Vercel sin --prod |
| T-05 | Revisión de código de `web-2027` (3D, directiva, shaders, 2.5D) | suria-revisor | hecha | T-04 | Hallazgos con archivo:línea en la bitácora; sin cambios de código |
| T-06 | Botón "¿Dudas?" no tapa la tarjeta del evento a 390 px | suria-junior | hecha | T-04 | Botón compacto en celular con aria-label, padding inferior con safe-area, WebKit 390 sin superposición, pruebas, build y `astro check` 0 |
