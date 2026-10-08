import type { ReactNode } from 'react'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  rows: readonly T[]
  columns: readonly Column<T>[]
  rowKey: (row: T) => string
  caption: string
  emptyMessage?: string
}

/** Tabla con scroll horizontal propio en móvil para no desbordar la página. */
export function DataTable<T>({ rows, columns, rowKey, caption, emptyMessage = 'Sin registros.' }: DataTableProps<T>) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-skpat-muted">{emptyMessage}</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-skpat-border">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-skpat-bg3 text-[11px] uppercase tracking-wider text-skpat-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col" className={`px-3 py-2.5 font-semibold ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-skpat-border">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="bg-skpat-card/60">
              {columns.map((column) => (
                <td key={column.header} className={`px-3 py-2.5 align-top ${column.className ?? ''}`}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
