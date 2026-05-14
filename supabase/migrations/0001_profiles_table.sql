-- 0001_profiles_table.sql
-- Phase 1 / Plan 01-02
-- NOTE: This file is kept for reference only. The project uses SQLite (better-sqlite3),
-- not Supabase/PostgreSQL. The actual schema is created at server startup via
-- backend/src/lib/migrations.ts using SQLite syntax.
--
-- This SQL represents the equivalent Supabase/PostgreSQL schema for future cloud migration.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nombre text not null,
  cedula_encrypted text not null,
  telefono_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);

-- Row Level Security
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

-- Users can update their own profile (but not user_id)
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Inserts come from the service-role backend ONLY (no direct client inserts).
-- No insert/delete policies = anon/authenticated cannot insert/delete.
-- service_role bypasses RLS automatically.

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
