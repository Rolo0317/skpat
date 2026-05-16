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
