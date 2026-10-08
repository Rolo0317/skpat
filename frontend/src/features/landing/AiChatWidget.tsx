import { useRef, useState } from 'react'
import { API_BASE_URL } from '@/lib/api'

type Msg = { role: 'user' | 'ai'; text: string }

/** El backend acepta como máximo 10 mensajes previos para dar contexto a la conversación. */
const MAX_HISTORY_MESSAGES = 10

function toHistory(messages: Msg[]) {
  return messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }))
}

async function streamChat(
  message: string,
  history: Msg[],
  onChunk: (token: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: toHistory(history) }),
  })
  if (!res.ok || !res.body) {
    onError(res.status === 503 ? 'Servicio IA no disponible. Intenta más tarde.' : 'Error de red.')
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data) as { text?: string; error?: string }
        if (parsed.error) {
          onError('La respuesta no pudo generarse.')
          return
        }
        if (parsed.text) onChunk(parsed.text)
      } catch {
        // ignore non-JSON frames
      }
    }
  }
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'ai',
      text: '¡Hola! ¿En qué te puedo ayudar? Puedo decirte sobre eventos, precios, ubicación o palcos VIP 🎵',
    },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || busy) return
    setBusy(true)
    const history = messages
    setMessages((prev) => [...prev, { role: 'user', text: message }])
    setInput('')
    setStreaming('')
    let accumulated = ''
    await streamChat(
      message,
      history,
      (token) => {
        accumulated += token
        setStreaming(accumulated)
      },
      (errMsg) => {
        accumulated = errMsg
        setStreaming(accumulated)
      }
    )
    setMessages((prev) => [...prev, { role: 'ai', text: accumulated || '(sin respuesta)' }])
    setStreaming('')
    setBusy(false)
    // scroll to bottom
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    })
  }

  return (
    <div className="fixed bottom-6 right-6 z-[900] flex flex-col items-end gap-3">
      {open && (
        <div
          className="bg-skpat-card border border-skpat-purple rounded-2xl shadow-lg w-[320px] max-h-[480px] flex flex-col overflow-hidden"
          style={{ boxShadow: '0 8px 32px #8b5cf640' }}
        >
          <div className="px-4 py-3 border-b border-skpat-border flex items-center justify-between">
            <div className="text-skpat-purple text-xs font-bold">🤖 Asistente Skpat</div>
            <button
              className="text-skpat-muted hover:text-white text-xs"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm leading-relaxed ${m.role === 'user' ? 'text-right text-white' : 'text-skpat-text'}`}
              >
                <div
                  className={`inline-block px-3 py-2 rounded-2xl ${m.role === 'user' ? 'bg-skpat-purple text-white' : 'bg-skpat-bg3'}`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="text-sm leading-relaxed text-skpat-text">
                <div className="inline-block px-3 py-2 rounded-2xl bg-skpat-bg3">{streaming}</div>
              </div>
            )}
          </div>
          <form onSubmit={handleSend} className="border-t border-skpat-border p-3 flex gap-2">
            <input
              className="flex-1 bg-skpat-bg2 border border-skpat-border rounded-full px-3 py-2 text-sm text-white outline-none focus:border-skpat-purple"
              placeholder="Pregúntame sobre Skpat…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              {busy ? '…' : 'Enviar'}
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat con asistente Skpat"
        className="w-[52px] h-[52px] rounded-full border-none cursor-pointer flex items-center justify-center text-[22px] text-white"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          animation: 'ai-pulse 2s infinite',
        }}
      >
        💬
      </button>
    </div>
  )
}
