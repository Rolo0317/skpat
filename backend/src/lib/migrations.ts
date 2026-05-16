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

    -- reset_tokens: single-use password recovery tokens with 1h expiry
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  INTEGER NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_reset_tokens_token_hash ON reset_tokens(token_hash);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title           TEXT NOT NULL,
      date            TEXT NOT NULL,
      description     TEXT,
      price           INTEGER NOT NULL DEFAULT 0,
      image_url       TEXT,
      available_spots INTEGER NOT NULL DEFAULT 100,
      is_vip          INTEGER NOT NULL DEFAULT 0,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      event_id     TEXT NOT NULL REFERENCES events(id),
      user_id      TEXT REFERENCES users(id),
      nombre       TEXT NOT NULL,
      cedula_enc   TEXT NOT NULL,
      email        TEXT NOT NULL,
      telefono_enc TEXT,
      qr_token     TEXT NOT NULL UNIQUE,
      qr_used      INTEGER NOT NULL DEFAULT 0,
      qr_used_at   INTEGER,
      ticket_type  TEXT NOT NULL DEFAULT 'general',
      price_cents  INTEGER NOT NULL,
      status       TEXT NOT NULL DEFAULT 'confirmed',
      created_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_event_id  ON tickets(event_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_qr_token  ON tickets(qr_token);
    CREATE INDEX IF NOT EXISTS idx_tickets_user_id   ON tickets(user_id);

    CREATE TABLE IF NOT EXISTS palco_reservations (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      event_id     TEXT NOT NULL REFERENCES events(id),
      palco_tier   TEXT NOT NULL CHECK(palco_tier IN ('silver','gold','platinum')),
      nombre       TEXT NOT NULL,
      email        TEXT NOT NULL,
      telefono_enc TEXT,
      price_cents  INTEGER NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_palcos_event_id ON palco_reservations(event_id);
  `)

  // Mesas y Carta
  db.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      number      INTEGER NOT NULL UNIQUE CHECK(number >= 1),
      label       TEXT,
      qr_token    TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name        TEXT NOT NULL,
      description TEXT,
      category    TEXT NOT NULL DEFAULT 'general',
      price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
      is_active   INTEGER NOT NULL DEFAULT 1,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sales (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      mesero_id    TEXT NOT NULL REFERENCES users(id),
      table_id     TEXT REFERENCES tables(id),
      table_number INTEGER,
      payment_method TEXT NOT NULL DEFAULT 'efectivo'
                     CHECK(payment_method IN ('efectivo','nequi','transferencia')),
      total_cents  INTEGER NOT NULL DEFAULT 0,
      notes        TEXT,
      sold_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      sale_id       TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      menu_item_id  TEXT NOT NULL REFERENCES menu_items(id),
      item_name     TEXT NOT NULL,
      item_price_cents INTEGER NOT NULL,
      quantity      INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
      subtotal_cents INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sales_mesero_id ON sales(mesero_id);
    CREATE INDEX IF NOT EXISTS idx_sales_sold_at   ON sales(sold_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
  `)

  // Inventario: add stock tracking columns to menu_items
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT -1`)
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 0`)
  } catch { /* column already exists */ }

  // Seed 10 default tables if empty
  const tableCount = (db.prepare('SELECT COUNT(*) as c FROM tables').get() as { c: number }).c
  if (tableCount === 0) {
    const insertTable = db.prepare(
      'INSERT OR IGNORE INTO tables (number, label) VALUES (?, ?)'
    )
    for (let i = 1; i <= 10; i++) {
      insertTable.run(i, `Mesa ${i}`)
    }
  }
}
