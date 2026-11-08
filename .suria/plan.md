# Plan

| ID | Tarea | Dueño | Estado | Depende de | Listo cuando |
|---|---|---|---|---|---|
| T-01 | Auditoría de deuda técnica (Clean Code, DRY, SOLID) | suria-arquitecto | hecha | — | `DEUDA-TECNICA.md` en la raíz con hallazgos y plan de 8 refactorizaciones |
| T-02 | Paso 1: enlaces de workspaces, `@skpat/backend` en el frontend y `backend/src/contrato` | suria-devops | hecha | T-01 | Frontend 23/23 archivos en verde, backend 197, builds OK (rama `refactor/workspaces`, sin merge) |
| T-03 | Paso 8: mover `SkpatEvent` y borrar la landing vieja de React | suria-devops | hecha | T-02 | Sin `features/landing`, pruebas y builds de frontend y web en verde (rama `refactor/workspaces`, sin merge) |
| T-04 | Web 2027: escenario 3D (R3F) en la portada, versión 2.5D para celular y movimiento reducido, y dirección de arte de fiesta | suria-3d | hecha | T-02 | Rama `web-2027` con pruebas y build en verde, capturas en 1440 y 390 (Firefox/WebKit) y vista previa en Vercel sin --prod |
| T-05 | Revisión de código de `web-2027` (3D, directiva, shaders, 2.5D) | suria-revisor | hecha | T-04 | Hallazgos con archivo:línea en la bitácora; sin cambios de código |
| T-06 | Botón "¿Dudas?" no tapa la tarjeta del evento a 390 px | suria-junior | hecha | T-04 | Botón compacto en celular con aria-label, padding inferior con safe-area, WebKit 390 sin superposición, pruebas, build y `astro check` 0 |
| T-07 | Publicar web-2027 en producción (merge a main, deploy por integración Git de Vercel y prueba de humo) | suria-devops | hecha | T-05, T-06 | main con el merge, despliegue de producción READY y prueba de humo en Firefox 1440 y WebKit 390 sin errores |
| T-08 | Revisión a posteriori de `768328a` y `4a2d312` (contrato y landing vieja) | suria-revisor | hecha | T-07 | Hallazgos con archivo:línea en la bitácora; sin cambios de código |
| T-09 | Arreglo de npm audit: quitar `@fastify/jwt`, retirar `/ai/chat`, `npm audit fix` sin --force, pisos de versión y nodemailer 10 con escape del HTML del correo | suria-backend | hecha | T-08 | Rama `chore/deps-audit` con pruebas, `astro check` y build en verde; sin crítica en `npm audit --omit=dev`; sin merge |
| T-10 | Borrar `ANTHROPIC_API_KEY` y `AI_MODEL` de Production y Preview en Vercel y publicar `chore/deps-audit` | suria-devops | pendiente | T-09 | Visto bueno de William, revisión de suria-revisor, merge a main y despliegue READY con humo |
