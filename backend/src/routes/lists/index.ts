import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, HttpError } from '../../lib/db.js'
import { registerAdminCrud } from '../../lib/crudRoutes.js'
import { requireUuid } from '../../lib/ids.js'
import { buyerSchema, isoDateSchema, parseOrThrow, type BuyerInput } from '../../lib/schemas.js'
import { ticketPriceCents } from '../../lib/ticketPrices.js'
import { adminOnly } from '../../plugins/auth.js'
import { listRegistrationRateLimitConfig } from '../../plugins/rateLimiter.js'
import { deliverTicketQr } from '../../services/ticketDelivery.js'
import { insertTicket, isUniqueViolation, reserveEventCapacity } from '../../services/tickets.js'
import { resolvePromoter } from '../../services/whatsapp.js'
import { listAvailability } from './listAvailability.js'
import {
  findGuestList, findListBySlug, LIST_PROJECTION, listGuestLists, listInscritos, type PublicListRow,
} from './listRepository.js'
import { SLUG_PATTERN, uniqueSlug } from './slug.js'

const LIST_TICKET_TYPE = 'lista'
const MAX_NOMBRE_LENGTH = 80

const listFields = {
  event_id: z.string().uuid(),
  nombre: z.string().trim().min(1).max(MAX_NOMBRE_LENGTH),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, 'Slug must be 3-60 chars: a-z, 0-9 and -'),
  promoter_id: z.string().uuid().nullable(),
  cupo: z.number().int().positive().nullable(),
  cierra_at: isoDateSchema.nullable(),
  activa: z.boolean(),
}

const createListSchema = z.object(listFields).partial().required({ event_id: true, nombre: true })
const eventFilterSchema = z.object({ event_id: z.string().uuid().optional() })

async function findListOr404(slug: string): Promise<PublicListRow> {
  const list = await findListBySlug(db, slug)
  if (!list) throw new HttpError(404, 'ListNotFound')
  return list
}

/** Vista pública: el gestor sigue la regla 5 (el de la lista → el del evento → el primero activo). */
async function publicListView(list: PublicListRow) {
  return {
    nombre: list.nombre,
    evento: { id: list.event_id, title: list.event_title, date: list.event_date },
    cupo: list.cupo,
    inscritos: list.inscritos,
    cierra_at: list.cierra_at,
    abierta: listAvailability(list) === 'open',
    gestor: await resolvePromoter({ guestListId: list.id, eventId: list.event_id }),
  }
}

/** Registro gratuito: respeta el cupo de la lista y del evento; el tiquete nace confirmado con QR propio. */
function registerOnList(slug: string, input: BuyerInput) {
  return db.transaction(async (tx) => {
    const list = await findListBySlug(tx, slug, true)
    if (!list) throw new HttpError(404, 'ListNotFound')
    const availability = listAvailability(list)
    if (availability !== 'open') throw new HttpError(422, availability)

    const event = await reserveEventCapacity(tx, list.event_id)
    const ticket = await insertTicket(tx, {
      eventId: event.id, nombre: input.nombre, email: input.email, cedula: input.cedula, telefono: input.telefono,
      ticketType: LIST_TICKET_TYPE, priceCents: ticketPriceCents(LIST_TICKET_TYPE, event.price),
      status: 'confirmed', guestListId: list.id, promoterId: list.promoter_id,
    })
    return { event, ticket }
  }).catch((err: unknown) => {
    if (isUniqueViolation(err)) throw new HttpError(409, 'AlreadyOnList')
    throw err
  })
}

/** /lists/:slug (público): ver la lista y registrarse. */
export async function listsRoutes(app: FastifyInstance) {
  app.get<{ Params: { slug: string } }>('/:slug', async (req) => publicListView(await findListOr404(req.params.slug)))

  app.post<{ Params: { slug: string } }>(
    '/:slug/registro',
    { config: { rateLimit: listRegistrationRateLimitConfig } },
    async (req, reply) => {
      const input = parseOrThrow(buyerSchema, req.body)
      const { event, ticket } = await registerOnList(req.params.slug, input)
      const qrDataUrl = await deliverTicketQr(
        {
          email: input.email, nombre: input.nombre, eventTitle: event.title, eventDate: event.date,
          ticketType: LIST_TICKET_TYPE, qrToken: ticket.qrToken,
        },
        (err) => req.log.error({ err }, 'List ticket email failed'),
      )
      return reply.code(201).send({
        ticket_id: ticket.id, qr_token: ticket.qrToken, qr_data_url: qrDataUrl, event_title: event.title,
      })
    },
  )
}

/** CRUD /admin/lists e inscritos de cada lista. */
export async function listsAdminRoutes(app: FastifyInstance) {
  registerAdminCrud(app, {
    table: 'guest_lists',
    projection: LIST_PROJECTION,
    notFoundCode: 'ListNotFound',
    conflictCode: 'SlugTaken',
    createSchema: createListSchema,
    updateSchema: z.object(listFields).partial(),
    list: (req) => listGuestLists(parseOrThrow(eventFilterSchema, req.query).event_id),
    toCreateColumns: async (input) => ({ ...input, slug: input.slug ?? (await uniqueSlug(db, input.nombre)) }),
  })

  app.get<{ Params: { id: string } }>('/:id/inscritos', adminOnly, async (req) => {
    const id = requireUuid(req.params.id, 'ListNotFound')
    const lista = await findGuestList(id)
    if (!lista) throw new HttpError(404, 'ListNotFound')
    return { lista, inscritos: await listInscritos(id) }
  })
}
