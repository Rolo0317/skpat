// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const frontendSrc = fileURLToPath(new URL('../frontend/src', import.meta.url))

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Las islas React del frontend existente usan el alias "@" y variables VITE_.
    resolve: { alias: { '@': frontendSrc } },
    envPrefix: ['PUBLIC_', 'VITE_'],
    // Módulos nativos/WASM: no se empaquetan, Vercel los traza como dependencias.
    ssr: { external: ['@node-rs/argon2', '@electric-sql/pglite', 'postgres'] },
  },
})
