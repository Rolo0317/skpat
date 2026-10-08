import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { optionalTextSchema, parseOrThrow, publicUrlSchema } from '../../lib/schemas.js'
import { adminOnly } from '../../plugins/auth.js'
import { listPromoters } from '../promoters/index.js'

const DEFAULT_REFERENCIA = 'Discoteca sin limite de horario'
const MAX_DIRECCION_LENGTH = 200
const MAX_REFERENCIA_LENGTH = 300

interface VenueSettingsRow {
  direccion: string | null
  referencia: string | null
  mapa_url: string | null
}

const venueSettingsSchema = z.object({
  direccion: optionalTextSchema(MAX_DIRECCION_LENGTH).optional(),
  referencia: optionalTextSchema(MAX_REFERENCIA_LENGTH).optional(),
  mapa_url: publicUrlSchema.nullable().optional(),
})

/** Respuesta pública de GET /settings: datos del lugar y gestores activos. */
async function publicSettings() {
  const settings = await db.one<VenueSettingsRow>('select direccion, referencia, mapa_url from venue_settings where id = true')
  return {
    direccion: settings?.direccion ?? null,
    referencia: settings?.referencia ?? DEFAULT_REFERENCIA,
    mapa_url: settings?.mapa_url ?? null,
    gestores: await listPromoters(true),
  }
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/', publicSettings)
}

/** PUT /admin/settings: los campos omitidos se conservan; null los borra. */
export async function settingsAdminRoutes(app: FastifyInstance) {
  app.put('/', adminOnly, async (req) => {
    const input = parseOrThrow(venueSettingsSchema, req.body)
    await db.run(
      `insert into venue_settings (id, direccion, referencia, mapa_url, updated_at)
       values (true, $1, $2, $3, now())
       on conflict (id) do update set
         direccion  = case when $4 then excluded.direccion  else venue_settings.direccion  end,
         referencia = case when $5 then excluded.referencia else venue_settings.referencia end,
         mapa_url   = case when $6 then excluded.mapa_url   else venue_settings.mapa_url   end,
         updated_at = now()`,
      [
        input.direccion ?? null, input.referencia ?? null, input.mapa_url ?? null,
        input.direccion !== undefined, input.referencia !== undefined, input.mapa_url !== undefined,
      ],
    )
    return publicSettings()
  })
}
