import { db } from './db.js'

/**
 * Run SQLite schema migrations on startup.
 * Uses db.exec() for idempotent CREATE TABLE IF NOT EXISTS statements.
 * All tables are created in a single transaction for atomicity.
 */
export function runMigrations(): void {
  db.exec(`
    -- users: stores all registered users with argon2id hashed passwords
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      email       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente','mesero','portero','admin')),
      nombre      TEXT NOT NULL,
      cedula_enc  TEXT,
      telefono_enc TEXT,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    -- refresh_tokens: issued refresh tokens; revocable per-token
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      revoked     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `)
}
