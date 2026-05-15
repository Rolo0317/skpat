import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AiChatWidget } from '../AiChatWidget'

function makeStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  let i = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) { controller.close(); return }
      controller.enqueue(encoder.encode(chunks[i]!))
      i++
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('AiChatWidget', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('renders floating button with chat emoji', () => {
    render(<AiChatWidget />)
    expect(screen.getByLabelText(/Abrir chat/i)).toHaveTextContent('💬')
  })

  it('chat panel is hidden by default', () => {
    render(<AiChatWidget />)
    expect(screen.queryByPlaceholderText(/Pregúntame/i)).not.toBeInTheDocument()
  })

  it('opens chat panel when button is clicked', () => {
    render(<AiChatWidget />)
    fireEvent.click(screen.getByLabelText(/Abrir chat/i))
    expect(screen.getByPlaceholderText(/Pregúntame/i)).toBeInTheDocument()
    expect(screen.getByText(/¡Hola!/i)).toBeInTheDocument()
  })

  it('streams text tokens from /ai/chat when user sends a message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeStreamResponse([
          'data: {"text":"Abrimos "}\n\n',
          'data: {"text":"Vie y Sáb 9pm-4am"}\n\n',
          'data: [DONE]\n\n',
        ])
      )
    )

    render(<AiChatWidget />)
    fireEvent.click(screen.getByLabelText(/Abrir chat/i))
    fireEvent.change(screen.getByPlaceholderText(/Pregúntame/i), {
      target: { value: '¿Horarios?' },
    })
    fireEvent.click(screen.getByText('Enviar'))

    await waitFor(() => {
      expect(screen.getByText(/Abrimos Vie y Sáb 9pm-4am/)).toBeInTheDocument()
    })
  })
})
