# Bitácora

## 2026-11-07 20:40 · suria-devops · T-07 Publicar web-2027 en producción
- Hecho: merge  de  en  (commit , aprobado por William) y push por SSH (f05fdb1..3616b69). Incluye  (768328a y 4a2d312), porque  sale de esa rama y la web usa . El árbol fusionado es idéntico al de . Vercel (, Root Directory , conectado a Rolo0317/skpat, rama de producción ) desplegó solo:  READY, alias https://skpat-vip.vercel.app. No se corrió  para no duplicar.
- Archivos: .suria/plan.md, .suria/bitacora.md (el código llegó con el merge).
- Verificación: antes del push, Unknown command: "test"


Did you mean this?
  npm test # Test a package
To see a list of supported npm commands, run:
  npm help en la raíz: frontend 59/59, backend 197/197, web 15/15;  0/0/0;  OK. Diff revisado: sin .env, credenciales ni variables nuevas (las 7 de producción ya existían). Humo en producción: / y /login responden 200; Playwright Firefox 1440: escenario 3D con 1 canvas, marquesina, 7 enlaces de WhatsApp, sin desborde y 0 errores de consola, de página o HTTP; WebKit 390: 2.5D sin canvas, sin desborde y 0 errores.
- Pendiente: 1) los commits de  no tuvieron revisión propia (T-05 revisó contra esa rama); pasaron las pruebas y ya están en producción. 2) En 390 px, al cargar, el botón "¿Dudas?" queda sobre el borde derecho del título de la tarjeta (pendiente conocido de T-06). 3) La tarjeta dice "Maratoneados en Springfield · Sábado" con fecha martes 10 de noviembre: es dato del evento, revisarlo con el cliente. 4) fps reales con GPU y en celular de gama media. 5) Unknown command: "audit"


Did you mean this?
  npm audit # Run a security audit
To see a list of supported npm commands, run:
  npm help: 31 vulnerabilidades sin revisar. Para volver atrás:  (producción anterior, f05fdb1).
- Para: suria-revisor — revisión a posteriori de 768328a y 4a2d312; suria-qa — fps reales en producción; suria-documentador — nota de la publicación.

## 2026-11-07 13:25 · suria-junior · T-06 Botón "¿Dudas?" sobre la tarjeta del evento
- Hecho: commit `10eaae3` en `web-2027` (push por SSH, sin merge). En menos de 48rem el lanzador queda solo con el ícono (52 px) y `aria-label="¿Dudas?"`; el asistente publica `--reserva-asistente` (safe-area + botón + aire) y la portada la usa como padding inferior en celular.
- Archivos: web/src/components/asistente/Asistente.astro, web/src/components/landing/secciones/Portada.astro.
- Verificación: Playwright WebKit 390x844 y 390x667 con el final de la portada en el borde inferior: antes botón y tarjeta superpuestos (botón 132 px de ancho, tarjeta terminaba bajo el botón), después sin superposición (tarjeta termina 12 px encima). `npm test` web 15/15, `npx astro check` 0/0/0, `npm run build` OK.
- Pendiente: al cargar, la tarjeta sigue por debajo del pliegue, así que mientras se baja el ícono pasa por su borde derecho (es un botón flotante); en escritorio no se tocó.
- Para: suria-revisor — revisar 10eaae3.

## 2026-11-07 13:30 · suria-3d · T-04 Correcciones de la revisión de web-2027
- Hecho: los 10 puntos del revisor. Tipos (AstroIntegration, `as 0|1|2`, `typeof requestIdleCallback`); `will-change` solo con movimiento permitido y sin 3D; paralaje 2.5D que se detiene al llegar y despierta con pointermove/deviceorientation; animaciones 2.5D pausadas fuera de pantalla (`escenario--fuera`) y `visibility: hidden` bajo el 3D; el lienzo se rinde (vuelve a 2.5D y se desmonta) tras 2 muestras lentas a DPR 1 o con `webglcontextlost`, `powerPreference: 'default'`; `tonemapping_fragment` y `colorspace_fragment` en los 3 shaders; `pointer-events: none` en el Canvas; contexto WebGL de prueba liberado con WEBGL_lose_context; marquesina pausada con `:focus-within` y quieta en pantallas táctiles; slerp de los cabezales independiente de los fps; sin el parámetro `marca` muerto.
- Archivos: web/astro.config.mjs, web/src/directivas/escenario.ts, web/src/components/escenario/{Escenario.astro,capacidad.ts}, web/src/components/escenario/isla/{EscenarioIsla.tsx,Lienzo.tsx,materiales/shaders.ts,objetos/PantallaLed.tsx,objetos/Publico.tsx,objetos/Rig.tsx}, web/src/components/landing/ui/Marquesina.astro.
- Verificación: `astro check` 0 errores, 0 avisos, 0 sugerencias; web 15/15; `npm run build` OK. Playwright Firefox 1440: 3D cargado, 2.5D en `hidden`, canvas `pointer-events: none`, `escenario--fuera` al bajar, sin errores ni desborde. WebKit 390: sin canvas, marquesina sin animación, sin errores ni desborde.
- Pendiente: fps reales en equipo con GPU y en celular de gama media; merge a `main` cuando William apruebe.
- Para: suria-qa — medir fps reales en la vista previa de `web-2027`.

## 2026-11-06 05:30 · suria-revisor · T-05 Revisión de web-2027
- Hecho: revisión de 87a181e y 8cdbbe8 contra `refactor/workspaces`. Sin errores bloqueantes. Comprobado: R3F libera geometrías, materiales y renderer al desmontar (y la isla no se desmonta: no hay ClientRouter); con la pestaña oculta o fuera de pantalla `frameloop="never"`; en celular, sin ahorro de datos o con movimiento reducido la directiva nunca llama a `cargar()` (Lienzo va en chunk aparte); eventos, etapas, palcos, mesas y WhatsApp sin cambios de lógica.
- Hallazgos (mayor a menor): 1) `astro check` pasa de 0 a 3 errores (astro.config.mjs:14, isla/objetos/Publico.tsx:33, directivas/escenario.ts:31). 2) Escenario.astro:158 `will-change` en 8 capas de pantalla completa siempre (también celular, movimiento reducido y con el 3D encima). 3) Escenario.astro:129 el rAF del paralaje 2.5D nunca descansa. 4) Escenario.astro:292-298 las animaciones CSS del 2.5D no se pausan fuera de pantalla y la capa oculta sigue en GPU. 5) Lienzo.tsx:32/69 sin salida si a DPR 1 sigue lento y `powerPreference: high-performance`. 6) shaders.ts:73/107/126 sin `colorspace_fragment`: colores lineales. 7) Lienzo.tsx:65 el Canvas recupera `pointer-events: auto`. 8) capacidad.ts:25 contexto WebGL2 de prueba sin liberar. 9) Marquesina.astro:75 solo se pausa con hover (WCAG 2.2.2). 10) Rig.tsx:80 slerp por cuadro y PantallaLed.tsx:49 parámetro `marca` muerto.
- Archivos: ninguno de código; .suria/plan.md y .suria/bitacora.md.
- Verificación: `npx vitest run` en web 15/15; `npm test` raíz: frontend 59/59, backend 197/197, web 15/15; `npm run build` OK (Lienzo 938 KB sin comprimir, chunk aparte); `npx astro check` 3 errores (en la base 0).
- Pendiente: corregir 1 antes del merge; 2 a 5 antes de medir fps reales.
- Para: suria-3d (o suria-frontend) — arreglar los errores de tipos y los puntos 2 a 6; luego suria-qa con fps reales en equipo con GPU y en un celular de gama media.

## 2026-11-06 05:10 · suria-3d · T-04 Web 2027: escenario 3D y fiesta
- Hecho: rama `web-2027` desde `refactor/workspaces`, commit `87a181e`. Escenario 3D en R3F como isla `client:escenario` (cabina con DJ, pantalla LED con la marca, 6 cabezales con haces volumétricos, 3 abanicos de láser, niebla y humo con fbm, 150 siluetas instanciadas) al ritmo de un pulso simulado de 140 BPM (frase de 16 compases: drop, valle y subida). Paralaje por mouse e inclinación. Versión 2.5D en HTML/CSS/SVG para celular y movimiento reducido. Dirección de arte: Unbounded + Big Shoulders + Figtree autoalojadas, sala negra fría, riel LED por sección, marquesina, botones con barrido de luz, cabecera que se solidifica al bajar. Contenido real intacto.
- Archivos: web/src/components/escenario/**, web/src/directivas/escenario.ts, web/src/env.d.ts, web/astro.config.mjs, web/package.json, package-lock.json, web/src/components/landing/{landing.css,secciones/Portada.astro,secciones/Cabecera.astro,ui/BotonNeon.astro,ui/Seccion.astro,ui/CuentaRegresiva.astro,ui/Marquesina.astro}, web/src/layouts/BaseLayout.astro, web/src/pages/index.astro; borrados ui/LaseresCanvas.astro y ui/laseres.ts.
- Verificación: web 15/15 pruebas, frontend 59/59, backend 197/197, `npm run build` OK. Playwright Firefox 1440 (3D cargado, 0 errores, sin desborde), Firefox 1440 con movimiento reducido (0 canvas) y WebKit 390 (0 canvas, sin desborde), dos rondas. FPS medido solo en Firefox headless sin GPU (27-38): no sirve para validar los 60 fps reales. JS inicial extra ~1 KB gz; el 3D descarga ~317 KB gz después de `load` y solo en escritorio. Detector de impeccable: 0 hallazgos. Vista previa de Vercel por integración de Git: https://skpat-8vzm4qtq7-william-danilo-solano-alvarez-s-projects.vercel.app (protegida con login de Vercel).
- Pendiente: medir fps en un equipo real con GPU; el botón flotante "¿Dudas?" tapa parte del pase en 390 px (venía de antes); no hay PRODUCT.md ni DESIGN.md (impeccable los pide); merge a `main` solo cuando William apruebe.
- Para: suria-revisor — revisar `web-2027` (sobre todo `directivas/escenario.ts` y el costo de los shaders); después suria-qa con fps reales y suria-ux para el botón "¿Dudas?" en celular.

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
