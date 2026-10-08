import { Field } from './Field'
import { inputClass } from './styles'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  /** Texto de la opción vacía; si se omite, la selección es obligatoria. */
  emptyLabel?: string
  required?: boolean
}

export function SelectField({ label, value, options, onChange, emptyLabel, required = false }: SelectFieldProps) {
  return (
    <Field label={label}>
      <select className={inputClass} value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  )
}
