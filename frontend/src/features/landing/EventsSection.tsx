import { useQuery } from '@tanstack/react-query'
import { EventCard } from './EventCard'
import type { SkpatEvent } from './types'

const API_URL = (import.meta.env.VITE_API_URL ?? '') as string

async function fetchEvents(): Promise<SkpatEvent[]> {
  const res = await fetch(`${API_URL}/events`)
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

export function EventsSection() {
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <section id="eventos" className="py-20 px-6 max-w-[1100px] mx-auto">
      <h2 className="gradient-section-title text-[32px] font-extrabold mb-2">Próximos eventos</h2>
      <p className="text-skpat-muted mb-10">Reserva tu lugar antes de que se agote</p>
      {isLoading && <p className="text-skpat-muted">Cargando eventos…</p>}
      {isError && <p className="text-skpat-red">No se pudieron cargar los eventos.</p>}
      {!isLoading && !isError && events.length === 0 && (
        <p className="text-skpat-muted">Pronto anunciaremos nuevos eventos 🎵</p>
      )}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  )
}
