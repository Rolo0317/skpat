import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    // Arrancar PGlite (WASM + esquema) en varios workers a la vez puede tardar más que una prueba.
    hookTimeout: 60000,
  },
})
