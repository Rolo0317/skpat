# Auditoría de dependencias (npm audit) · 2026-11-08 · suria-seguridad

Base: `main` en `81844f3`, lockfile de la raíz (workspaces `frontend`, `backend`, `web`).
`npm audit`: **31** (1 crítica, 20 altas, 8 moderadas, 2 bajas). `npm audit --omit=dev`: **24** (1 crítica, 18 altas, 4 moderadas, 1 baja).

## Qué corre de verdad en producción

- Vercel, proyecto `skpat-vip`, Root Directory `web`, Astro `output: 'server'`.
- **El backend Fastify sí corre en producción**: `web/src/pages/api/[...path].ts` monta `buildServer()` de `@skpat/backend/app` y le pasa cada pedido con `app.inject()`. Todas las dependencias de runtime del backend (fastify, multipart, blob, nodemailer, anthropic, zod) están en la función serverless.
- Los paneles del `frontend` (React Router) se sirven como isla `client:only` en `web/src/pages/[...app].astro`: React Router corre en el navegador, no en SSR.
- No se usan en Vercel: `@fastify/static` (solo si `!process.env.VERCEL`, ver `backend/src/lib/uploads.ts:9`), `nodemailer` en la práctica (no hay variables `SMTP_*` en Vercel, así que `getTransporter()` devuelve null), `@fastify/jwt` (está en `backend/package.json` pero **ningún archivo lo importa**; los JWT se firman y verifican con `jose` en `backend/src/lib/jwt.ts` con `algorithms: ['HS256']`).
- Solo de compilación (corren en el build de Vercel o en local, no reciben tráfico): `@vercel/nft`, `@vercel/routing-utils` y `path-to-regexp`, `glob`, `minimatch`, `brace-expansion`, `esbuild`, `browserslist`, `@babel/core`, `baseline-browser-mapping`.
- Solo de desarrollo y pruebas: `vitest`, `@vitest/mocker`, `jsdom` (trae `ws`), `supertest` (trae `qs`), `form-data`.

## Hallazgos por gravedad real

| Gravedad real | Paquete (npm audit) | ¿Toca producción? | Por qué | Arreglo |
|---|---|---|---|---|
| **Alta** | `fastify` 5.8.5 (alta) y `find-my-way` 9.6.0 (alta) | Sí, es el servidor de la API | Hay fallos de bypass de autenticación con URLs mal formadas que llegan a manejadores not-found encapsulados, salto de validación de headers y de esquemas, y cuerpo reemplazado por colisión en validación asíncrona. Las rutas validan sobre todo con zod (`parseOrThrow`), y eso baja el riesgo, pero Fastify es la puerta de entrada. No aplica: HTTP/2 (se usa `inject`) ni el de `trustProxy` por número de saltos (aquí es booleano). | `npm audit fix` lo sube a `fastify` 5.12.8 y `find-my-way` 9.10.0 (rango semver actual). Mejor aún: subir el piso en `backend/package.json` a `"fastify": "^5.12.8"`. |
| **Alta** | `fast-uri` 3.1.2 (alta, vía ajv y fast-json-stringify de fastify) | Sí, pero poco | Confusión de host y SSRF en el parseo de URIs. Solo pega si algún esquema usa `format: uri` para validar URLs que el servidor luego visita. No vi ese caso. | `npm audit fix` lo deja en 3.1.9. |
| **Alta** | `@fastify/busboy` 3.2.0 (alta, vía `@fastify/multipart`) | Sí: `/admin/uploads`, `/admin/gallery` y eventos aceptan multipart | DoS por boundary enorme o por header con nombre de prototipo, e inyección CRLF en filename. Mitigan: las rutas son de admin y Vercel corta el cuerpo en 4.5 MB. | `npm audit fix` lo deja en 3.2.5. Opcional: `"@fastify/multipart": "^10.1.8"`. |
| **Alta** | `undici` 6.29.0 (vía `@vercel/blob`) y 8.11.2 (vía `astro` y unifont) | Sí, `@vercel/blob` sube las imágenes | Falla la validación TLS cuando las opciones tls se pierden en `Agent`, más varios DoS. El cliente de Blob habla con un host fijo de Vercel, así que el riesgo práctico es bajo. | `npm audit fix` lo deja en 6.29.1 y 8.12.4. |
| **Alta** | `zod` 4.6.5 (alta) | Sí, valida todas las entradas | Agotamiento de memoria al validar colecciones grandes con restricciones. Los esquemas tienen `.max()` (por ejemplo historial ≤ 10), y eso limita el daño. | `npm audit fix` lo deja en 4.6.7. Subir el piso a `"zod": "^4.6.7"` en backend y frontend. |
| **Alta** | `@vercel/oidc` 3.8.10 y 4.0.0, y `@vercel/cli-config` 0.3.1 (zod viejo 4.1.11), vía `@vercel/blob` y `@astrojs/vercel` → `@vercel/functions` | En teoría | El problema es el zod viejo que lee la configuración local del CLI. En la función serverless el token OIDC sale de una variable de entorno; no hay entrada de un atacante. | `npm audit fix` sube `@vercel/functions` a 3.11.0 (trae oidc 4.0.7, que está bien). La copia anidada de `@vercel/blob` (pide `@vercel/oidc ^3.6.1`) **queda vulnerable** hasta que Vercel publique un blob con oidc 4. Hay que esperar upstream. No usar la "solución" de bajar a `@vercel/blob@2.4.0`: es un retroceso. |
| **Alta (por costo, no por npm audit)** | `POST /api/ai/chat` con `ANTHROPIC_API_KEY` en Production y Preview | **Sí, confirmado** | Ruta pública sin autenticación y sin consumidor desde que se borró `AiChatWidget`. Un POST vacío en producción responde 400 (validación), no 503: el proveedor está cargado. El límite de 20/min por IP vive en memoria de cada instancia. Cualquiera puede gastar tokens de la cuenta de Anthropic. | Retirar la ruta `/ai`, `anthropicProvider`, `@anthropic-ai/sdk` y su prueba (suria-backend), y borrar `ANTHROPIC_API_KEY` y `AI_MODEL` de Vercel (suria-devops, con visto bueno de William). Si se va a usar, exigir sesión y poner un tope de gasto en la consola de Anthropic. |
| **Media (crítica en npm audit)** | `fast-jwt` 6.2.4, vía `@fastify/jwt` 10.0.0 | **No** | `@fastify/jwt` está declarado y **no se registra en ningún lado** (`git grep` sin usos). La autenticación usa `jose` con HS256 fijo. El código vulnerable viaja en `node_modules` pero nunca se ejecuta. | **Quitar `@fastify/jwt` de `backend/package.json`** (`npm uninstall @fastify/jwt -w backend`). Así sale el único hallazgo crítico. Si se queda, `npm audit fix` lo deja en `fast-jwt` 6.3.6. |
| Media | `react-router` / `react-router-dom` 7.15.1 (alta / moderada) | En el navegador | Open redirect con barra invertida en `<Link>`/`useNavigate`: no vi destinos controlados por el usuario (`RoleGuard` usa rutas fijas). Los fallos de RSC, SSR, CSRF e hidratación no aplican porque es `client:only`. | `npm audit fix` lo deja en 7.18.5. Subir el piso a `"react-router-dom": "^7.18.5"`. |
| Media | `nodemailer` 6.10.1 (alta) | Hoy no (no hay `SMTP_*` en Vercel) | Muchos fallos en `addressparser` (entrega a otro dominio, DoS) e inyección CRLF. El `to` viene del correo del usuario. Pega si se activa el SMTP. | Cambio mayor: `"nodemailer": "^10.4.0"`. Revisar la API de `createTransport` (compatible en lo básico) y correr las pruebas. Hacerlo antes de configurar SMTP. |
| Baja | `@astrojs/vercel` 11.0.12, `@vercel/nft`, `@vercel/routing-utils` y `path-to-regexp` 6.1.0 (altas) | No, solo build | El regex con backtracking de `path-to-regexp` se usa al generar la configuración de rutas en el build, no con tráfico. La "solución" de npm (`@astrojs/vercel@8.1.0`) es un retroceso de versión mayor: **no aplicarla**. | `npm audit fix` sube `@astrojs/vercel` a 11.0.20 y `routing-utils` a 6.6.1, pero `routing-utils` sigue pidiendo `path-to-regexp 6.1.0`: el aviso queda hasta que Vercel lo actualice. Aceptar el riesgo. |
| Baja | `@fastify/static` 9.1.3, `glob`, `minimatch`, `brace-expansion` | No (apagado en Vercel) | `@fastify/static` solo se registra fuera de Vercel. Los demás son de build. | `npm audit fix` (static 9.3.0, glob 13.0.7, minimatch 10.2.6, brace-expansion 5.0.12). Si el aviso de static sigue, `^10.1.10` (mayor) cuando haya tiempo. |
| Baja | `esbuild` 0.27.x | No | Lectura de archivos desde el servidor de desarrollo en Windows (local de William). | `npm audit fix` lo deja en 0.28.2. |
| Baja | `vitest`, `@vitest/mocker`, `ws` (jsdom), `qs` (supertest), `form-data`, `@babel/core`, `browserslist`, `baseline-browser-mapping` | No, solo desarrollo y build | Ninguno llega al bundle ni a la función. | `npm audit fix` (vitest 4.1.12, ws 8.22.2, qs 6.17.1, form-data 4.0.6, babel 7.29.13, browserslist 4.29.5). |

## Plan de arreglo propuesto (no aplicado)

1. **suria-backend**, rama aparte (por ejemplo `chore/deps-audit`):
   - `npm uninstall @fastify/jwt -w backend`. Quita la crítica.
   - Retirar `/ai/chat`: `routes/ai`, `services/ai`, el registro en `app.ts:77`, `@anthropic-ai/sdk`, `ANTHROPIC_API_KEY` y `AI_MODEL` de `lib/env.ts`, y `tests/routes/ai-chat.test.ts`.
   - `npm audit fix` **sin `--force`** en la raíz. El simulacro (`--dry-run`) cambia unas 60 versiones dentro del rango actual, entre ellas fastify 5.12.8, find-my-way 9.10.0, fast-uri 3.1.9, busboy 3.2.5, zod 4.6.7, undici 6.29.1/8.12.4, react-router 7.18.5, @astrojs/vercel 11.0.20, @vercel/functions 3.11.0, @vercel/blob 2.8.2 y vitest 4.1.12.
   - Subir pisos en los `package.json`, para que un lockfile nuevo no vuelva atrás: `fastify ^5.12.8`, `zod ^4.6.7`, `react-router-dom ^7.18.5`, `@astrojs/vercel ^11.0.20`.
   - `nodemailer ^10.4.0` (mayor), en un commit aparte con sus pruebas.
2. `npm test` en la raíz (frontend, backend, web), `astro check` y `npm run build`; luego otra vez `npm audit --omit=dev`. Lo que debe quedar: `@vercel/oidc` anidado en `@vercel/blob` y `path-to-regexp` en `@vercel/routing-utils`. Los dos dependen de Vercel y se aceptan como riesgo.
3. **suria-devops**, con visto bueno de William: borrar `ANTHROPIC_API_KEY` y `AI_MODEL` de Production y Preview en Vercel cuando la ruta ya no exista, y desplegar por la integración de Git.
4. **No usar** `npm audit fix --force`: baja `@astrojs/vercel` a 8.1.0 y `@vercel/blob` a 2.4.0, y rompería el build.

## Variables del proyecto de Vercel `skpat-vip` (solo nombres)

`npx vercel env ls` (2026-11-08):
- Production y Preview: `CORS_ORIGINS`, `FRONTEND_URL`, `AI_MODEL`, **`ANTHROPIC_API_KEY`**, `NODE_ENV`, `ENCRYPTION_KEY`, `JWT_REFRESH_SECRET`, `JWT_SECRET`, `DATABASE_URL`.
- Production, Preview y Development: `BLOB_READ_WRITE_TOKEN`.
- No hay `SMTP_*`: el correo de tiquetes está apagado en producción.

**`ANTHROPIC_API_KEY` sí existe en Production y Preview**, y la ruta que la usa responde en producción. Esto cierra el hallazgo 1 de suria-revisor (T-08): hay que retirarla.

## Hallazgo extra (fuera de npm audit)

- Baja, hoy apagado: `backend/src/lib/email.ts` mete `data.nombre`, `data.eventTitle` y `data.qrToken` en el HTML del correo sin escaparlos. El nombre lo escribe el usuario, así que se puede inyectar HTML en el correo del tiquete. Escapar antes de activar SMTP.
