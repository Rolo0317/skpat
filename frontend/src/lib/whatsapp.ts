const WHATSAPP_BASE_URL = 'https://wa.me/'
const COLOMBIA_COUNTRY_CODE = '57'
/** Celulares colombianos sin indicativo: 10 dígitos que empiezan por 3. */
const LOCAL_COLOMBIAN_MOBILE = /^3\d{9}$/

function withCountryCode(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return LOCAL_COLOMBIAN_MOBILE.test(digits) ? `${COLOMBIA_COUNTRY_CODE}${digits}` : digits
}

function withMessage(url: string, message?: string): string {
  return message ? `${url}?text=${encodeURIComponent(message)}` : url
}

/** Chat de WhatsApp con un número (acepta celulares colombianos sin +57). */
export function whatsappChatUrl(phone: string, message?: string): string {
  return withMessage(`${WHATSAPP_BASE_URL}${withCountryCode(phone)}`, message)
}

/** Compartir un texto por WhatsApp eligiendo el contacto. */
export function whatsappShareUrl(message: string): string {
  return withMessage(WHATSAPP_BASE_URL, message)
}
