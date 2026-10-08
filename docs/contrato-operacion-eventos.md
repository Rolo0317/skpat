# Contrato: operación real de eventos

Fuente de verdad compartida entre backend, panel admin (React) y web pública (Astro).
Esquema: `supabase/migrations/0005_skpat_operacion_eventos.sql`. Montos en **centavos COP**. Fechas ISO 8601.
Todas las rutas van bajo `/api` en producción (Fastify las ve sin el prefijo).

## Datos del negocio (confirmados por el dueño)

- Abre **de viernes a lunes, sin límite de horario**.
- Ubicación: **sector Plaza de las Américas, Bogotá** (dirección exacta pendiente: editable en `venue_settings`).
- Además de discoteca, Skpat es **agencia de DJs**: representación de DJs, **cursos y clases de DJ**.
- La web pública muestra **solo el evento activo actual** (hoy: "Maratoneados en Springfield", sábado 10 y domingo 11 de octubre).

## Estado de implementación

- HECHO (backend): `services/{tickets,pricing,whatsapp,payments,ticketDelivery,qrValidity}.ts`; `GET /settings`;
  `GET /events/:id/oferta`; `PUT /events/:id/etapas` y `PUT /events/:id/ofertas` (admin; **estas son las rutas reales**,
  no `/admin/events/...`); ubicaciones y reserva (**la reserva exige `cedula`**); `/admin/pagos/*`; compra pendiente;
  `/tickets/mine` con estado; escaneo con `PendingPayment`/`NotYetValid`/`Expired`.
- PENDIENTE: CRUD `/admin/promoters`, `PUT /admin/settings`, listas, galería, anuncios, `/admin/uploads`.

## Reglas de negocio

1. **Sin pasarela de pago por ahora.** Toda compra paga (entrada general por etapa, palco, mesa) nace en
   `status = 'pending_payment'` y devuelve un `whatsapp_url` para cerrar el pago con un gestor.
   El staff (rol `admin`) confirma o cancela en el panel. Solo al confirmar el QR sirve en la puerta
   y se envía el correo con el QR.
2. **Listas** (gratis): registro inmediato `status = 'confirmed'` con QR propio. Un registro por correo y evento.
   Una lista puede tener cupo, fecha de cierre y un gestor (promotor) dueño.
3. **QR por persona y por fecha.** Un palco/mesa confirmado genera `capacidad` tiquetes (uno por persona) a nombre
   del titular. El QR solo vale desde `events.date - 3 h` hasta `coalesce(events.ends_at, events.date + 12 h)`.
4. **Precio vigente** de la entrada general: la primera etapa (`sort_order`) con `ends_at` nulo o futuro;
   si no hay ninguna vigente, `events.price` (taquilla).
5. **Gestor para WhatsApp**: el de la lista → el del evento → el primer gestor activo. El mensaje lleva contexto
   (evento, tipo, nombre, id de la reserva). Constructor único: `backend/src/services/whatsapp.ts`.
6. Cupo del evento: toda entrada (general, lista, palco/mesa al confirmar) descuenta `available_spots`
   con `reserveEventCapacity` de `backend/src/services/tickets.ts`. Insertar tiquetes SIEMPRE con `insertTicket`.

## Tipos compartidos

```ts
type Gestor = { id: string; nombre: string; whatsapp: string; activo: boolean }
type Etapa = { id: string; nombre: string; price_cents: number; ends_at: string | null; sort_order: number }
type PrecioVigente = { nombre: string; price_cents: number; ends_at: string | null; es_taquilla: boolean }
type OfertaUbicacion = { tipo: 'palco' | 'mesa'; price_cents: number; incluye: string[] }
type Ubicacion = { id: string; tipo: 'palco' | 'mesa'; numero: number; capacidad: number;
                   posicion_x: number; posicion_y: number; estado: 'disponible' | 'reservado' | 'vendido' }
type EstadoPago = 'pending_payment' | 'confirmed' | 'cancelled'
```

## Público

| Método y ruta | Respuesta |
|---|---|
| `GET /settings` | `{ direccion, referencia, mapa_url, gestores: Gestor[] }` (solo activos) |
| `GET /events` | (ya existe) cada evento agrega `precio_vigente: PrecioVigente`, `ends_at`, `promoter_id` |
| `GET /events/:id/oferta` | `{ etapas: Etapa[], precio_vigente: PrecioVigente, ubicaciones: OfertaUbicacion[] }` |
| `GET /events/:id/ubicaciones` | `Ubicacion[]` (`reservado` = pendiente de pago, `vendido` = confirmado) |
| `POST /events/:id/ubicaciones/:spotId/reservar` `{nombre,email,cedula,telefono?}` | 201 `{ reservation_id, status:'pending_payment', price_cents, whatsapp_url }`; 409 `SpotTaken`; 404 |
| `POST /tickets/purchase` `{event_id,nombre,email,cedula,telefono?}` | 201 `{ ticket_id, status:'pending_payment', price_cents, price_stage, event_title, whatsapp_url }` (sin QR). Solo entrada general. |
| `GET /tickets/mine` | (ya existe) agrega `status`; `qr_data_url` solo si `confirmed`, si no `whatsapp_url` |
| `GET /lists/:slug` | `{ nombre, evento:{id,title,date}, cupo, inscritos, cierra_at, abierta: boolean, gestor: Gestor \| null }` |
| `POST /lists/:slug/registro` `{nombre,email,cedula,telefono?}` | 201 `{ ticket_id, qr_token, qr_data_url, event_title }`; 409 `AlreadyOnList`; 422 `ListClosed` \| `ListFull` |
| `GET /announcements` | Anuncios activos ahora (`starts_at <= now < ends_at\|∞`), fijados primero |
| `GET /gallery?event_id=` | `{ id, url, caption, event_id, event_title, created_at }[]` (más recientes primero) |
| `POST /tickets/scan` | (ya existe) nuevas razones `PendingPayment`, `NotYetValid`, `Expired` |

## Admin (rol `admin`)

| Método y ruta | Uso |
|---|---|
| `GET/POST /admin/promoters`, `PATCH/DELETE /admin/promoters/:id` | Directorio de gestores (WhatsApp) |
| `PUT /admin/settings` `{direccion,referencia,mapa_url}` | Datos del lugar |
| `PUT /events/:id/etapas` `{nombre,price_cents,ends_at?,sort_order}[]` | Reemplaza las etapas del evento |
| `PUT /events/:id/ofertas` `OfertaUbicacion[]` | Precio e incluye de palco y mesa |
| eventos create/update | aceptan además `ends_at`, `promoter_id` |
| `GET/POST /admin/lists`, `PATCH/DELETE /admin/lists/:id` | Listas (`slug` se genera del nombre si no llega) |
| `GET /admin/lists/:id/inscritos` | `{ lista, inscritos: {nombre,email,cedula,qr_used,created_at}[] }` |
| `GET /admin/pagos/pendientes` | `{ tiquetes: [...], reservas: [...] }` con datos del evento y gestor |
| `POST /admin/pagos/tiquetes/:id/confirmar` \| `/cancelar` | Confirma: QR válido + correo. Cancela: libera cupo |
| `POST /admin/pagos/reservas/:id/confirmar` \| `/cancelar` | Confirma: genera `capacidad` tiquetes y correo |
| `POST /admin/uploads` (multipart `file`) | `{ url, pathname }` — almacenamiento único (Vercel Blob en prod, disco en local) |
| `GET/POST /admin/gallery`, `DELETE /admin/gallery/:id` | Fotos (`POST` multipart `file` + `event_id?` + `caption?`, varios archivos) |
| `GET/POST /admin/announcements`, `PATCH/DELETE /admin/announcements/:id` | Anuncios |

Errores: siempre `{ error: CodigoPascalCase, ...detalles }` vía `HttpError`.
