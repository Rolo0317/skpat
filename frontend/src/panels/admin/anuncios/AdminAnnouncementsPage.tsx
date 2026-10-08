import { useState } from 'react'
import { Pin, Plus } from 'lucide-react'
import type { Anuncio } from '@/lib/operacion'
import { apiAssetUrl } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import { cardClass } from '@/components/ui/styles'
import { AnnouncementForm } from './AnnouncementForm'
import { announcementToForm, useAnnouncements, vigenciaOf, VIGENCIA_LABELS, type AnuncioInput } from './announcements'

type Editor = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; anuncio: Anuncio }

function vigenciaRange(anuncio: Anuncio): string {
  const desde = formatDateTime(anuncio.starts_at)
  return anuncio.ends_at ? `${desde} → ${formatDateTime(anuncio.ends_at)}` : `Desde ${desde}, sin vencimiento`
}

/** Fijados primero, como los ve el público. */
const byPinnedFirst = (a: Anuncio, b: Anuncio) => Number(b.fijado) - Number(a.fijado)

export default function AdminAnnouncementsPage() {
  const { items, isLoading, create, update, remove } = useAnnouncements()
  const [editor, setEditor] = useState<Editor>({ mode: 'closed' })
  const close = () => setEditor({ mode: 'closed' })

  const save = async (input: AnuncioInput) => {
    if (editor.mode === 'edit') await update.mutateAsync({ id: editor.anuncio.id, changes: input })
    else await create.mutateAsync(input)
    close()
  }

  return (
    <section className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Anuncios"
        description="Avisos de la web pública con vigencia, imagen y botón de acción."
        actions={editor.mode === 'closed' && <Button onClick={() => setEditor({ mode: 'create' })}><Plus size={16} aria-hidden="true" /> Nuevo anuncio</Button>}
      />

      {editor.mode !== 'closed' && (
        <div className="mb-6">
          <AnnouncementForm
            key={editor.mode === 'edit' ? editor.anuncio.id : 'nuevo'}
            initial={editor.mode === 'edit' ? announcementToForm(editor.anuncio) : undefined}
            submitLabel={editor.mode === 'edit' ? 'Guardar cambios' : 'Publicar anuncio'}
            onSubmit={save}
            onCancel={close}
          />
        </div>
      )}

      {isLoading && <p className="text-skpat-muted">Cargando…</p>}
      {!isLoading && items.length === 0 && <p className="py-6 text-center text-sm text-skpat-muted">Aún no hay anuncios.</p>}
      <ul className="grid gap-4">
        {[...items].sort(byPinnedFirst).map((anuncio) => {
          const vigencia = vigenciaOf(anuncio)
          return (
            <li key={anuncio.id} className={`${cardClass} flex flex-col gap-4 sm:flex-row`}>
              {anuncio.image_url && <img src={apiAssetUrl(anuncio.image_url)} alt="" className="h-28 w-full rounded-lg object-cover sm:w-40" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {anuncio.fijado && <Pin size={14} className="text-skpat-oro" aria-label="Fijado" />}
                  <h2 className="font-bold text-skpat-white">{anuncio.titulo}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${vigencia === 'vigente' ? 'bg-skpat-oro text-skpat-bg' : 'bg-white/10 text-skpat-muted'}`}>
                    {VIGENCIA_LABELS[vigencia]}
                  </span>
                </div>
                {anuncio.cuerpo && <p className="mt-1 text-sm text-skpat-text">{anuncio.cuerpo}</p>}
                <p className="mt-2 text-xs text-skpat-muted">{vigenciaRange(anuncio)}</p>
                {anuncio.cta_label && <p className="mt-1 text-xs text-skpat-champan">Botón: {anuncio.cta_label} → {anuncio.cta_url}</p>}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Button variant="secondary" onClick={() => update.mutate({ id: anuncio.id, changes: { fijado: !anuncio.fijado } })}>
                  {anuncio.fijado ? 'Desfijar' : 'Fijar'}
                </Button>
                <Button variant="ghost" onClick={() => setEditor({ mode: 'edit', anuncio })}>Editar</Button>
                <ConfirmDeleteButton itemName={`el anuncio ${anuncio.titulo}`} onConfirm={() => remove.mutateAsync(anuncio.id)} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
