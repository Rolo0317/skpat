/// <reference types="astro/client" />

declare module 'astro' {
  interface AstroClientDirectives {
    /** Hidrata la isla del escenario 3D solo en escritorio y cuando el hilo principal está libre. */
    'client:escenario'?: boolean
  }
}

export {}
