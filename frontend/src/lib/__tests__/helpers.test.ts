import { describe, expect, it } from 'vitest'
import { toCsv } from '@/lib/csv'
import { whatsappChatUrl, whatsappShareUrl } from '@/lib/whatsapp'
import { fromDatetimeLocal, pesosToCents, toDatetimeLocal } from '@/lib/format'

describe('toCsv', () => {
  it('escapa comas, comillas y saltos de línea', () => {
    const csv = toCsv([{ nombre: 'Peña, José', nota: 'dijo "hola"' }], [
      { header: 'Nombre', value: (row) => row.nombre },
      { header: 'Nota', value: (row) => row.nota },
    ])
    expect(csv).toBe('Nombre,Nota\r\n"Peña, José","dijo ""hola"""')
  })
})

describe('whatsapp', () => {
  it('agrega el indicativo de Colombia a celulares locales y codifica el mensaje', () => {
    expect(whatsappChatUrl('300 123 4567', 'Hola Skpat')).toBe('https://wa.me/573001234567?text=Hola%20Skpat')
    expect(whatsappChatUrl('+573001234567')).toBe('https://wa.me/573001234567')
  })

  it('arma un enlace para compartir sin destinatario', () => {
    expect(whatsappShareUrl('Lista VIP')).toBe('https://wa.me/?text=Lista%20VIP')
  })
})

describe('format', () => {
  it('convierte pesos a centavos y fechas entre ISO y datetime-local', () => {
    expect(pesosToCents(1_200_000)).toBe(120_000_000)
    const iso = fromDatetimeLocal('2026-10-10T22:00')!
    expect(toDatetimeLocal(iso)).toBe('2026-10-10T22:00')
    expect(fromDatetimeLocal('')).toBeNull()
  })
})
