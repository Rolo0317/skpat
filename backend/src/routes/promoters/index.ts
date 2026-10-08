import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { registerAdminCrud } from '../../lib/crudRoutes.js'
import type { PromoterRow } from '../../services/whatsapp.js'

export const PROMOTER_PROJECTION = 'id, nombre, whatsapp, activo'
const MAX_NOMBRE_LENGTH = 80
/** Mismo formato que exige la tabla: + opcional y 10 a 15 dígitos (con indicativo de país). */
const WHATSAPP_PATTERN = /^\+?[0-9]{10,15}$/
const VISUAL_SEPARATORS = /[\s().-]/g

/** Acepta el número como lo escribe la gente ("+57 319 543 5288") y lo guarda sin separadores. */
const whatsappSchema = z
  .string()
  .transform((value) => value.replace(VISUAL_SEPARATORS, ''))
  .pipe(z.string().regex(WHATSAPP_PATTERN, 'WhatsApp must be 10-15 digits, optionally starting with +'))

const promoterFields = {
  nombre: z.string().trim().min(1).max(MAX_NOMBRE_LENGTH),
  whatsapp: whatsappSchema,
  activo: z.boolean(),
}

export function listPromoters(onlyActive: boolean): Promise<PromoterRow[]> {
  return db.many<PromoterRow>(
    `select ${PROMOTER_PROJECTION} from promoters ${onlyActive ? 'where activo' : ''} order by created_at asc`,
  )
}

/** Directorio de gestores que venden y atienden por WhatsApp (bajo /admin/promoters). */
export async function promotersAdminRoutes(app: FastifyInstance) {
  registerAdminCrud(app, {
    table: 'promoters',
    projection: PROMOTER_PROJECTION,
    notFoundCode: 'PromoterNotFound',
    createSchema: z.object({ ...promoterFields, activo: promoterFields.activo.default(true) }),
    updateSchema: z.object(promoterFields).partial(),
    list: () => listPromoters(false),
  })
}
