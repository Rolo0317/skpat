import { z } from 'zod'
import { isoDateSchema, publicUrlSchema } from '../../lib/schemas.js'

const DEFAULT_AVAILABLE_SPOTS = 100
const MAX_TITLE_LENGTH = 200
const MIN_TITLE_LENGTH = 3
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_ARTIST_NAME_LENGTH = 80
const MAX_LINEUP_SIZE = 20
const MAX_GENRE_LENGTH = 60
const LINEUP_SEPARATOR = ','
const TRUTHY_VALUES = new Set<unknown>([true, 1, '1', 'true'])

/** Multipart solo envía texto y el panel usa 0/1: se aceptan booleanos, 0/1 y sus versiones en texto. */
const flagSchema = z
  .union([z.boolean(), z.literal(0), z.literal(1), z.enum(['0', '1', 'true', 'false'])])
  .transform((value) => TRUTHY_VALUES.has(value))

const splitLineup = (value: unknown) =>
  typeof value === 'string' ? value.split(LINEUP_SEPARATOR).map((artist) => artist.trim()).filter(Boolean) : value

/** En JSON llega como arreglo; en multipart como texto separado por comas o campos repetidos. */
const lineupSchema = z.preprocess(
  splitLineup,
  z.array(z.string().trim().min(1).max(MAX_ARTIST_NAME_LENGTH)).max(MAX_LINEUP_SIZE),
)

const eventFields = {
  title: z.string().trim().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH),
  date: isoDateSchema,
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  price: z.coerce.number().int().nonnegative(),
  available_spots: z.coerce.number().int().nonnegative(),
  is_vip: flagSchema,
  image_url: publicUrlSchema.nullable(),
  lineup: lineupSchema,
  genre: z.string().trim().max(MAX_GENRE_LENGTH).nullable(),
  ends_at: isoDateSchema.nullable(),
  promoter_id: z.string().uuid().nullable(),
}

export const createEventSchema = z.object({
  ...eventFields,
  description: eventFields.description.optional(),
  image_url: eventFields.image_url.optional(),
  genre: eventFields.genre.optional(),
  ends_at: eventFields.ends_at.optional(),
  promoter_id: eventFields.promoter_id.optional(),
  available_spots: eventFields.available_spots.default(DEFAULT_AVAILABLE_SPOTS),
  is_vip: eventFields.is_vip.default(false),
  lineup: eventFields.lineup.default([]),
})

export const updateEventSchema = z.object({ ...eventFields, is_active: flagSchema }).partial()

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventColumns = Partial<CreateEventInput & UpdateEventInput>
