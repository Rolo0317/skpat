# Plan

| ID | Tarea | Dueño | Estado | Depende de | Listo cuando |
|---|---|---|---|---|---|
| T-01 | Auditoría de deuda técnica (Clean Code, DRY, SOLID) | suria-arquitecto | hecha | — | `DEUDA-TECNICA.md` en la raíz con hallazgos y plan de 8 refactorizaciones |
| T-02 | Paso 1: enlaces de workspaces, `@skpat/backend` en el frontend y `backend/src/contrato` | suria-devops | hecha | T-01 | Frontend 23/23 archivos en verde, backend 197, builds OK (rama `refactor/workspaces`, sin merge) |
| T-03 | Paso 8: mover `SkpatEvent` y borrar la landing vieja de React | suria-devops | hecha | T-02 | Sin `features/landing`, pruebas y builds de frontend y web en verde (rama `refactor/workspaces`, sin merge) |
