import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Con SMTP configurado el correo sale por nodemailer. Se simula el transporte para
// comprobar que la llamada a la API de nodemailer 10 (createTransport + sendMail) es la esperada.
const sendMail = vi.fn(async () => ({ messageId: 'prueba' }))
const createTransport = vi.fn(() => ({ sendMail }))
vi.mock('nodemailer', () => ({ createTransport, default: { createTransport } }))

const SMTP_VARS = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PORT'] as const

beforeAll(() => {
  vi.resetModules()
  process.env.SMTP_HOST = 'smtp.prueba.local'
  process.env.SMTP_USER = 'usuario'
  process.env.SMTP_PASS = 'clave-de-prueba'
  process.env.SMTP_PORT = '465'
})

afterAll(() => {
  for (const name of SMTP_VARS) delete process.env[name]
  vi.resetModules()
})

describe('sendTicketEmail con SMTP', () => {
  it('crea el transporte SMTP y envía el HTML escapado', async () => {
    const { sendTicketEmail } = await import('../../src/lib/email.js')
    await sendTicketEmail({
      to: 'ana@example.co',
      nombre: '<b>Ana</b>',
      eventTitle: 'Noche VIP',
      eventDate: 'sábado',
      ticketType: 'general',
      qrDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      qrToken: 'c'.repeat(64),
    })

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.prueba.local',
      port: 465,
      secure: true,
      auth: { user: 'usuario', pass: 'clave-de-prueba' },
    })
    expect(sendMail).toHaveBeenCalledTimes(1)
    const [mail] = sendMail.mock.calls[0] as unknown as [{ to: string; subject: string; html: string; from: string }]
    expect(mail.to).toBe('ana@example.co')
    expect(mail.subject).toContain('Noche VIP')
    expect(mail.html).toContain('&lt;b&gt;Ana&lt;/b&gt;')
    expect(mail.html).not.toContain('<b>Ana</b>')
  })
})
