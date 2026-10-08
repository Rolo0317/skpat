-- Operación real de eventos (basada en los flyers de Skpat):
-- gestores con WhatsApp, configuración del lugar, etapas de precio, listas por promotor,
-- QR por persona que vence con su fecha, plano de palcos y mesas, galería y anuncios.
-- Portable (Supabase y PGlite) e idempotente: se puede aplicar varias veces.

-- Gestores: personas que venden y atienden por WhatsApp (hay varios números).
create table if not exists skpat.promoters (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  whatsapp    text not null check (whatsapp ~ '^\+?[0-9]{10,15}$'),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Datos editables del lugar (fila única): la dirección la define el admin desde el panel.
create table if not exists skpat.venue_settings (
  id          boolean primary key default true check (id),
  direccion   text,
  referencia  text,
  mapa_url    text,
  updated_at  timestamptz not null default now()
);
insert into skpat.venue_settings (id) values (true) on conflict (id) do nothing;

-- Eventos: hasta cuándo vale el QR y qué gestor atiende por defecto.
alter table skpat.events add column if not exists ends_at timestamptz;
alter table skpat.events add column if not exists promoter_id uuid references skpat.promoters(id) on delete set null;

-- Etapas de venta (Etapa 1 $10K, Etapa 2 $15K...). Vigente: la primera por sort_order sin vencer.
-- Si ninguna está vigente, aplica events.price (taquilla).
create table if not exists skpat.event_price_stages (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references skpat.events(id) on delete cascade,
  nombre      text not null,
  price_cents integer not null check (price_cents >= 0),
  ends_at     timestamptz,
  sort_order  integer not null default 0
);
create index if not exists event_price_stages_event on skpat.event_price_stages(event_id, sort_order);

-- Listas de ingreso por evento (una por promotor, cumpleaños, etc.), con enlace público por slug.
create table if not exists skpat.guest_lists (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references skpat.events(id) on delete cascade,
  nombre      text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  promoter_id uuid references skpat.promoters(id) on delete set null,
  cupo        integer check (cupo > 0),
  cierra_at   timestamptz,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists guest_lists_event on skpat.guest_lists(event_id);

-- Plano fijo del lugar: palcos y mesas con su posición (% del plano) para dibujar el mapa.
create table if not exists skpat.venue_spots (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('palco','mesa')),
  numero      integer not null check (numero >= 1),
  capacidad   integer not null check (capacidad >= 1),
  posicion_x  numeric not null check (posicion_x between 0 and 100),
  posicion_y  numeric not null check (posicion_y between 0 and 100),
  activo      boolean not null default true,
  unique (tipo, numero)
);
-- Distribución del flyer "Maratoneados en Springfield": palcos 1-4 a la izquierda, 5-6 a la derecha, mesas 1-4 al centro.
insert into skpat.venue_spots (tipo, numero, capacidad, posicion_x, posicion_y) values
  ('palco', 1, 10, 12, 18), ('palco', 2, 10, 12, 36), ('palco', 3, 10, 12, 54), ('palco', 4, 10, 12, 72),
  ('palco', 5, 10, 88, 36), ('palco', 6, 10, 88, 54),
  ('mesa', 1, 8, 42, 36), ('mesa', 2, 8, 58, 36), ('mesa', 3, 8, 42, 54), ('mesa', 4, 8, 58, 54)
on conflict (tipo, numero) do nothing;

-- Precio y qué incluye cada tipo de ubicación en cada evento (Palco VIP $1.200.000, Mesa VIP $1.000.000...).
create table if not exists skpat.event_spot_offers (
  event_id    uuid not null references skpat.events(id) on delete cascade,
  tipo        text not null check (tipo in ('palco','mesa')),
  price_cents integer not null check (price_cents >= 0),
  incluye     text[] not null default '{}',
  primary key (event_id, tipo)
);

-- Reserva de un palco o mesa: queda pendiente hasta que el staff confirma el pago por WhatsApp.
create table if not exists skpat.spot_reservations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references skpat.events(id) on delete cascade,
  spot_id      uuid not null references skpat.venue_spots(id),
  nombre       text not null,
  email        text not null,
  telefono_enc text,
  price_cents  integer not null,
  status       text not null default 'pending_payment' check (status in ('pending_payment','confirmed','cancelled')),
  promoter_id  uuid references skpat.promoters(id) on delete set null,
  confirmed_at timestamptz,
  confirmed_by uuid references skpat.users(id),
  created_at   timestamptz not null default now()
);
create unique index if not exists spot_reservations_unica
  on skpat.spot_reservations (event_id, spot_id) where status <> 'cancelled';

-- Tiquetes: un QR por persona. Las compras pagas nacen pendientes y el staff las confirma.
alter table skpat.tickets add column if not exists guest_list_id uuid references skpat.guest_lists(id) on delete set null;
alter table skpat.tickets add column if not exists promoter_id uuid references skpat.promoters(id) on delete set null;
alter table skpat.tickets add column if not exists spot_reservation_id uuid references skpat.spot_reservations(id) on delete cascade;
alter table skpat.tickets add column if not exists price_stage text;
alter table skpat.tickets add column if not exists confirmed_at timestamptz;
alter table skpat.tickets add column if not exists confirmed_by uuid references skpat.users(id);

alter table skpat.tickets drop constraint if exists tickets_status_check;
alter table skpat.tickets add constraint tickets_status_check
  check (status in ('pending_payment','confirmed','cancelled'));

alter table skpat.tickets drop constraint if exists tickets_ticket_type_check;
alter table skpat.tickets add constraint tickets_ticket_type_check
  check (ticket_type in ('general','lista','palco','mesa','palco_silver','palco_gold','palco_platinum'));

-- Galería de fotos de los eventos (archivos en Vercel Blob; aquí solo la URL pública).
create table if not exists skpat.event_photos (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references skpat.events(id) on delete set null,
  url         text not null,
  pathname    text not null,
  caption     text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists event_photos_event on skpat.event_photos(event_id, sort_order);

-- Anuncios tipo historia: flyers, cambios de horario, invitados especiales.
create table if not exists skpat.announcements (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  cuerpo      text,
  image_url   text,
  cta_label   text,
  cta_url     text,
  event_id    uuid references skpat.events(id) on delete set null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  activo      boolean not null default true,
  fijado      boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table skpat.promoters          enable row level security;
alter table skpat.venue_settings     enable row level security;
alter table skpat.event_price_stages enable row level security;
alter table skpat.guest_lists        enable row level security;
alter table skpat.venue_spots        enable row level security;
alter table skpat.event_spot_offers  enable row level security;
alter table skpat.spot_reservations  enable row level security;
alter table skpat.event_photos       enable row level security;
alter table skpat.announcements      enable row level security;
