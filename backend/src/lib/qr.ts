import { randomBytes } from 'node:crypto'
import QRCode from 'qrcode'

/**
 * Generate a cryptographically random 64-char hex QR token.
 * Stored in tickets.qr_token — used as the QR code content.
 */
export function generateQrToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Generate a QR code data URL (base64 PNG) for a given token.
 * The QR encodes the raw token string only.
 */
export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}
