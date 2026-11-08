/**
 * Contrato público del backend para el frontend (React) y la web (Astro).
 *
 * Es lo único del backend que los otros workspaces deben importar, por medio de
 * `@skpat/backend/contrato` (ver `exports` en backend/package.json). Nada de rutas `src/...` sueltas.
 *
 * Regla: aquí solo entran módulos puros (sin base de datos, Fastify ni variables de entorno),
 * porque esto termina empaquetado en el navegador.
 */
export { ticketLabel, TICKET_LABELS, TICKET_TYPES } from '../lib/ticketPrices.js'
export type { TicketType } from '../lib/ticketPrices.js'
export { buildWhatsappUrl } from '../lib/whatsappLink.js'
