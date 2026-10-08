import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const settings = await db.one<{ direccion: string | null; referencia: string | null; mapa_url: string | null }>(
      'select direccion, referencia, mapa_url from venue_settings where id = true',
    )
    const gestores = await db.many<{ id: string; nombre: string; whatsapp: string; activo: boolean }>(
      'select id, nombre, whatsapp, activo from promoters where activo order by created_at asc',
    )
    return {
      direccion: settings?.direccion ?? null,
      referencia: settings?.referencia ?? 'Discoteca sin limite de horario',
      mapa_url: settings?.mapa_url ?? null,
      gestores,
    }
  })
}
