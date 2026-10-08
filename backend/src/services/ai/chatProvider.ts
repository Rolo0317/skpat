/** Puerto hacia el modelo de lenguaje: las rutas dependen de esta abstracción, no del SDK concreto. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  system: string
  messages: ChatMessage[]
}

export interface ChatProvider {
  /** Devuelve la respuesta en fragmentos de texto a medida que el modelo los genera. */
  streamReply(request: ChatRequest): AsyncIterable<string>
}
