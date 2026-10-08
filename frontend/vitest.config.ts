import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reutiliza plugins y alias de vite.config.ts; aquí solo va lo propio de las pruebas.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      testTimeout: 10000,
    },
  }),
)
