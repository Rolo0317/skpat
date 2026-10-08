-- Skpat VIP — esquema aislado `skpat` (no expuesto por PostgREST).
-- Portable: corre igual en Supabase y en PGlite (pruebas/desarrollo). Los permisos de Supabase van en 0003.

create schema if not exists skpat;

create table skpat.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'cliente' check (role in ('cliente','mesero','portero','admin')),
  nombre        text not null,
  cedula_enc    text,
  telefono_enc  text,
  created_at    timestamptz not null default now()
);

create table skpat.refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references skpat.users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on skpat.refresh_tokens(user_id);

create table skpat.reset_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references skpat.users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

create table skpat.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  date            timestamptz not null,
  description     text,
  price           integer not null default 0 check (price >= 0),       -- centavos COP
  image_url       text,
  available_spots integer not null default 100 check (available_spots >= 0),
  is_vip          boolean not null default false,
  is_active       boolean not null default true,
  lineup          text[] not null default '{}',
  genre           text,
  created_at      timestamptz not null default now()
);
create index on skpat.events(date);
create index on skpat.events(is_active);

create table skpat.tickets (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references skpat.events(id),
  user_id      uuid references skpat.users(id),
  nombre       text not null,
  cedula_enc   text not null,
  email        text not null,
  telefono_enc text,
  qr_token     text not null unique,
  qr_used      boolean not null default false,
  qr_used_at   timestamptz,
  ticket_type  text not null default 'general'
               check (ticket_type in ('general','palco_silver','palco_gold','palco_platinum')),
  price_cents  integer not null,
  status       text not null default 'confirmed',
  created_at   timestamptz not null default now()
);
create index on skpat.tickets(event_id);
create index on skpat.tickets(user_id);

create table skpat.palco_reservations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references skpat.events(id),
  palco_tier   text not null check (palco_tier in ('silver','gold','platinum')),
  nombre       text not null,
  email        text not null,
  telefono_enc text,
  price_cents  integer not null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);
create index on skpat.palco_reservations(event_id);

create table skpat.tables (
  id          uuid primary key default gen_random_uuid(),
  number      integer not null unique check (number >= 1),
  label       text,
  qr_token    text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table skpat.menu_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text not null default 'general',
  price_cents integer not null check (price_cents >= 0),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  stock_qty   integer not null default -1,   -- -1 = sin control de inventario
  min_stock   integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table skpat.sales (
  id             uuid primary key default gen_random_uuid(),
  mesero_id      uuid not null references skpat.users(id),
  table_id       uuid references skpat.tables(id),
  table_number   integer,
  payment_method text not null default 'efectivo'
                 check (payment_method in ('efectivo','nequi','transferencia')),
  total_cents    integer not null default 0,
  notes          text,
  sold_at        timestamptz not null default now()
);
create index on skpat.sales(mesero_id);
create index on skpat.sales(sold_at);

create table skpat.sale_items (
  id               uuid primary key default gen_random_uuid(),
  sale_id          uuid not null references skpat.sales(id) on delete cascade,
  menu_item_id     uuid not null references skpat.menu_items(id),
  item_name        text not null,
  item_price_cents integer not null,
  quantity         integer not null default 1 check (quantity >= 1),
  subtotal_cents   integer not null
);
create index on skpat.sale_items(sale_id);

-- Pedidos que un cliente hace desde el QR de su mesa; el mesero los atiende.
create table skpat.table_orders (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references skpat.tables(id),
  items       jsonb not null,               -- [{menu_item_id, name, price_cents, quantity}]
  total_cents integer not null,
  notes       text,
  status      text not null default 'pending' check (status in ('pending','attending','done','cancelled')),
  mesero_id   uuid references skpat.users(id),
  created_at  timestamptz not null default now()
);
create index on skpat.table_orders(status, created_at);

-- Defensa en profundidad: RLS activo sin políticas => nadie salvo el dueño del esquema.
alter table skpat.users              enable row level security;
alter table skpat.refresh_tokens     enable row level security;
alter table skpat.reset_tokens       enable row level security;
alter table skpat.events             enable row level security;
alter table skpat.tickets            enable row level security;
alter table skpat.palco_reservations enable row level security;
alter table skpat.tables             enable row level security;
alter table skpat.menu_items         enable row level security;
alter table skpat.sales              enable row level security;
alter table skpat.sale_items         enable row level security;
alter table skpat.table_orders       enable row level security;

-- Datos de referencia: 10 mesas por defecto.
insert into skpat.tables (number, label)
select n, 'Mesa ' || n from generate_series(1, 10) as n
on conflict (number) do nothing;
