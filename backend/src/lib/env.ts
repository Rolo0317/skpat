import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  // Postgres (Supabase). Sin esta variable se usa PGlite: en memoria en pruebas, en disco en desarrollo.
  DATABASE_URL: z.string().url().optional(),
  PGLITE_DIR: z.string().default('./data/pglite'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  ANTHROPIC_API_KEY: z.string().min(10, 'ANTHROPIC_API_KEY is required for /ai/chat').optional(),
  AI_MODEL: z.string().default('claude-sonnet-5-5'),
  // Email / SMTP (all optional — if missing, emails are logged to console only)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().default('noreply@skpatvip.com'),
  // Frontend base URL for links in emails
  FRONTEND_URL: z.string().default('http://localhost:5173'),
})

export const env = envSchema.parse(process.env)
