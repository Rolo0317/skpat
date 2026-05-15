import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SkpatEvent } from '@/features/landing/types'

const API_URL = (import.meta.env.VITE_API_URL ?? '') as string

function getAccessToken(): string | null {
  return localStorage.getItem('skpat_access')
}

export default function AdminEventsPage() {
  const qc = useQueryClient()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<SkpatEvent[]> => {
      const res = await fetch(`${API_URL}/events`)
      if (!res.ok) throw new Error('fetch fail')
      return res.json()
    },
  })

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('3000000')
  const [availableSpots, setAvailableSpots] = useState('100')
  const [isVip, setIsVip] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('date', date)
      fd.append('description', description)
      fd.append('price', price)
      fd.append('available_spots', availableSpots)
      fd.append('is_vip', isVip ? '1' : '0')
      if (image) fd.append('image', image)
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: fd,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'create failed')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      setTitle(''); setDate(''); setDescription(''); setPrice('3000000'); setAvailableSpots('100'); setIsVip(false); setImage(null); setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      if (!res.ok) throw new Error('delete failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })

  return (
    <section className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Eventos</h1>

      <form
        className="grid gap-3 mb-8 bg-neutral-900 border border-neutral-800 p-4 rounded"
        onSubmit={(e) => { e.preventDefault(); createMut.mutate() }}
      >
        <input className="bg-neutral-800 p-2 rounded" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="bg-neutral-800 p-2 rounded" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value ? new Date(e.target.value).toISOString() : '')} required />
        <textarea className="bg-neutral-800 p-2 rounded" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="bg-neutral-800 p-2 rounded" type="number" min="0" placeholder="Precio en centavos COP (ej. 3000000 = $30.000)" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input className="bg-neutral-800 p-2 rounded" type="number" min="0" placeholder="Cupos" value={availableSpots} onChange={(e) => setAvailableSpots(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} />
          Evento VIP
        </label>
        <input className="text-sm" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded" disabled={createMut.isPending}>
          {createMut.isPending ? 'Creando…' : 'Crear evento'}
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-2">Eventos activos</h2>
      {isLoading && <p>Cargando…</p>}
      <ul className="grid gap-2">
        {events.map((ev) => (
          <li key={ev.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded">
            <div>
              <div className="font-semibold">{ev.title}</div>
              <div className="text-sm text-neutral-400">{new Date(ev.date).toLocaleString('es-CO')} · ${(ev.price / 100).toLocaleString('es-CO')} COP · cupos {ev.available_spots}</div>
            </div>
            <button onClick={() => deleteMut.mutate(ev.id)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
