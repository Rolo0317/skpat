import { SelectField } from '@/components/ui/SelectField'
import { useEvents } from '@/features/events/queries'
import { usePromoters } from '../hooks/usePromoters'

interface EntitySelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
  emptyLabel?: string
  required?: boolean
}

export function EventSelect({ label = 'Evento', ...props }: EntitySelectProps) {
  const { events } = useEvents()
  return <SelectField label={label} options={events.map((event) => ({ value: event.id, label: event.title }))} {...props} />
}

/** Solo gestores activos: son los únicos que reciben clientes por WhatsApp. */
export function PromoterSelect({ label = 'Gestor', emptyLabel = 'Automático (primer gestor activo)', ...props }: EntitySelectProps) {
  const { items } = usePromoters()
  const options = items.filter((gestor) => gestor.activo).map((gestor) => ({ value: gestor.id, label: gestor.nombre }))
  return <SelectField label={label} emptyLabel={emptyLabel} options={options} {...props} />
}
