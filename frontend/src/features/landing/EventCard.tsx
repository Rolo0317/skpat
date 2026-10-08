import { Link } from 'react-router-dom'
import type { SkpatEvent } from './types'

export function EventCard({ event }: { event: SkpatEvent }) {
  const isSoldOut = event.available_spots === 0
  const isVip = event.is_vip === 1
  const tagText = isSoldOut ? 'Sold out 🔥' : isVip ? 'Palcos VIP' : 'Disponible'
  const tagBg = isSoldOut ? '#ef4444' : isVip ? '#f0c75e' : '#d4a63a'
  const dateLabel = new Date(event.date).toLocaleString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const priceCop = (event.price / 100).toLocaleString('es-CO')
  const imageBaseUrl = (import.meta.env.VITE_API_URL ?? '') as string

  return (
    <article className="bg-skpat-card border border-skpat-border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-skpat-oro hover:shadow-[0_8px_40px_#d4a63a30]">
      <div className="h-40 relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2a1f0e, #3d2c0c)' }}>
        {event.image_url ? (
          <img src={`${imageBaseUrl}${event.image_url}`} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl opacity-40">🎵</span>
        )}
        <span
          className="absolute top-3 right-3 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase"
          style={{ background: tagBg, letterSpacing: '1px' }}
        >
          {tagText}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-[#faf7f0] font-bold text-lg">{event.title}</h3>
        <p className="text-skpat-azul text-xs mt-1">📅 {dateLabel}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-skpat-green font-black text-xl">
            ${priceCop} <small className="text-skpat-muted font-normal text-xs">COP</small>
          </span>
          {isSoldOut ? (
            <span
              className="px-4 py-2 rounded-full border border-skpat-oro text-skpat-oro text-xs font-semibold opacity-50 cursor-not-allowed"
              style={{ background: '#d4a63a10' }}
            >
              Agotado
            </span>
          ) : (
            <Link
              to={`/comprar/${event.id}`}
              className="px-4 py-2 rounded-full border border-skpat-oro text-skpat-oro text-xs font-semibold transition-all hover:bg-skpat-oro hover:text-skpat-bg"
              style={{ background: '#d4a63a10' }}
            >
              Comprar
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
