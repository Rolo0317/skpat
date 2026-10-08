/**
 * Enlace wa.me con mensaje prellenado. Módulo puro (sin dependencias) para compartirlo
 * entre el backend y el navegador (la web Astro lo importa directamente).
 */
export function buildWhatsappUrl(whatsapp: string, message: string): string {
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
