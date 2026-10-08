import { PALCO_TIERS, palcoLabel, palcoPriceCents } from '../../lib/ticketPrices.js'
import { formatCop } from '../money.js'

const BUSINESS_INFO = `Eres el asistente virtual de Skpat VIP, una discoteca de música electrónica y guaracha en Bogotá, Colombia.

INFORMACIÓN DEL NEGOCIO:
- Horarios: Viernes y Sábados 9:00 PM – 4:00 AM. Domingos especiales: 8:00 PM – 2:00 AM.
- Ubicación: Cra. 15 #93-47, Bogotá, Colombia (Nueva ubicación 2025).
- Contacto: +57 300 000 0000 · Instagram @skpat.vip`

const RULES = `REGLAS:
- Usa SOLO los datos de este mensaje para eventos, precios, cupos y carta; si algo no aparece, dilo y sugiere escribir a Instagram @skpat.vip.
- Responde SOLO preguntas relacionadas con Skpat VIP, sus eventos, ubicación, horarios, precios, palcos y carta.
- Sé amable, breve (máximo 3 oraciones) y usa emojis ocasionalmente 🎵✨🥂
- Responde siempre en español colombiano.`

function describePalcos(): string {
  const lines = PALCO_TIERS.map((tier) => `- ${palcoLabel(tier)}: ${formatCop(palcoPriceCents(tier))}`)
  return ['PALCOS VIP:', ...lines].join('\n')
}

/** Une la información fija del negocio con el contexto vivo de la base. */
export function composeSystemPrompt(venueContext: string): string {
  return [BUSINESS_INFO, venueContext, describePalcos(), RULES].join('\n\n')
}
