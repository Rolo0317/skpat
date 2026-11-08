import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendTicketEmail } from '../../src/lib/email.js'

describe('sendTicketEmail console fallback', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    spy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    spy.mockRestore()
  })

  it('logs to console.info when SMTP env is not configured', async () => {
    // Test setup ensures SMTP_HOST/SMTP_USER/SMTP_PASS are undefined unless explicitly set.
    await expect(sendTicketEmail({
      to: 'test@example.co',
      nombre: 'Test User',
      eventTitle: 'Console Fallback Night',
      eventDate: 'sabado, 1 de diciembre',
      ticketType: 'general',
      qrDataUrl: 'data:image/png;base64,abc',
      qrToken: 'a'.repeat(64),
    })).resolves.toBeUndefined()

    const calls = spy.mock.calls.flat().map(String).join(' ')
    expect(calls).toContain('test@example.co')
  })
})

describe('renderTicketEmailHtml', () => {
  const base = {
    to: 'test@example.co',
    nombre: 'Ana',
    eventTitle: 'Noche VIP',
    eventDate: 'sábado, 1 de diciembre',
    ticketType: 'general',
    qrDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    qrToken: 'a'.repeat(64),
  }

  it('escapa el nombre que escribe el usuario', async () => {
    const { renderTicketEmailHtml } = await import('../../src/lib/email.js')
    const html = renderTicketEmailHtml({ ...base, nombre: '<script>alert(1)</script>"><img src=x onerror=alert(2)>' })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;&lt;img src=x onerror=alert(2)&gt;')
  })

  it('escapa título, fecha y token del evento', async () => {
    const { renderTicketEmailHtml } = await import('../../src/lib/email.js')
    const html = renderTicketEmailHtml({ ...base, eventTitle: '<b>Fiesta</b> & más', eventDate: '<i>hoy</i>', qrToken: '<u>t</u>' })
    expect(html).toContain('&lt;b&gt;Fiesta&lt;/b&gt; &amp; más')
    expect(html).toContain('&lt;i&gt;hoy&lt;/i&gt;')
    expect(html).toContain('&lt;u&gt;t&lt;/u&gt;')
  })

  it('conserva el QR PNG en base64 y descarta cualquier otro src', async () => {
    const { renderTicketEmailHtml } = await import('../../src/lib/email.js')
    expect(renderTicketEmailHtml(base)).toContain(`src="${base.qrDataUrl}"`)
    const malo = renderTicketEmailHtml({ ...base, qrDataUrl: 'javascript:alert(1)" onerror="x' })
    expect(malo).toContain('src=""')
    expect(malo).not.toContain('javascript:')
  })

  it('acepta el QR real que genera lib/qr', async () => {
    const { renderTicketEmailHtml } = await import('../../src/lib/email.js')
    const { generateQrDataUrl } = await import('../../src/lib/qr.js')
    const qrDataUrl = await generateQrDataUrl('b'.repeat(64))
    expect(renderTicketEmailHtml({ ...base, qrDataUrl })).toContain(`src="${qrDataUrl}"`)
  })
})
