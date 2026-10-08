import nodemailer from 'nodemailer'
import { env } from './env.js'
import { ticketLabel } from './ticketPrices.js'

export interface TicketEmailData {
  to: string
  nombre: string
  eventTitle: string
  eventDate: string
  ticketType: string
  qrDataUrl: string
  qrToken: string
}

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

export async function sendTicketEmail(data: TicketEmailData): Promise<void> {
  const transporter = getTransporter()

  const label = ticketLabel(data.ticketType)

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Tu tiquete Skpat VIP</title>
    </head>
    <body style="background:#0a0806;color:#ece6da;font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;">
      <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:36px;font-weight:900;background:linear-gradient(135deg,#fff,#d4a63a,#f2d38a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">SKPAT VIP</h1>
          <p style="color:#d4a63a;letter-spacing:8px;text-transform:uppercase;font-size:12px;margin-top:4px;">Tu tiquete de entrada</p>
        </div>

        <div style="background:#221c14;border:1px solid #3a3022;border-radius:16px;padding:24px;margin-bottom:24px;">
          <p style="margin:0 0 8px 0;color:#a89f8f;font-size:13px;">Hola, <strong style="color:#faf7f0;">${data.nombre}</strong></p>
          <h2 style="margin:0 0 4px 0;color:#faf7f0;font-size:20px;">${data.eventTitle}</h2>
          <p style="margin:0 0 16px 0;color:#2f80ff;font-size:14px;">📅 ${data.eventDate}</p>
          <span style="background:#d4a63a;color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${label}</span>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <p style="color:#a89f8f;font-size:13px;margin-bottom:12px;">Presenta este QR en la entrada:</p>
          <img src="${data.qrDataUrl}" alt="QR Tiquete" style="width:220px;height:220px;border:4px solid #3a3022;border-radius:12px;background:white;" />
          <p style="color:#6b7280;font-size:11px;margin-top:8px;font-family:monospace;word-break:break-all;">${data.qrToken}</p>
        </div>

        <div style="background:#1b1711;border:1px solid #3a3022;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#a89f8f;font-size:12px;line-height:1.6;">
            ⚠️ <strong style="color:#f0c75e;">Este tiquete es intransferible.</strong> Solo puede ser usado una vez en la entrada.
            El portero verificara tu QR al ingresar. No compartas este codigo con nadie.
          </p>
        </div>

        <p style="text-align:center;color:#4b5563;font-size:11px;">Skpat VIP — skpatvip.com</p>
      </div>
    </body>
    </html>
  `

  if (!transporter) {
    // No SMTP configured — log to console for dev/test environments
    console.info('[EMAIL LOG] Ticket email (no SMTP configured):')
    console.info(`  To:      ${data.to}`)
    console.info(`  Subject: Tu tiquete para ${data.eventTitle} — Skpat VIP`)
    console.info(`  Nombre:  ${data.nombre}`)
    console.info(`  Tipo:    ${label}`)
    console.info(`  Token:   ${data.qrToken}`)
    return
  }

  await transporter.sendMail({
    from: `"Skpat VIP" <${env.FROM_EMAIL}>`,
    to: data.to,
    subject: `Tu tiquete para ${data.eventTitle} — Skpat VIP`,
    html,
  })
}
