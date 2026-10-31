-- =====================================================================
--  Maisonnée : Tesla Fleet API (tokens côté serveur, véhicule du foyer)
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
--  Secrets Supabase : TESLA_CLIENT_ID, TESLA_CLIENT_SECRET
--  Déployer la fonction « tesla » sans JWT sur callback (voir LISEZMOI).
-- =====================================================================

alter table public.households add column if not exists tesla_vehicle_id text
  check (tesla_vehicle_id is null or char_length(tesla_vehicle_id) between 4 and 32);

create table if not exists public.household_tesla (
  household_id       uuid primary key references public.households(id) on delete cascade,
  region             text not null default 'eu' check (region in ('eu', 'na')),
  access_token       text,
  refresh_token      text not null check (char_length(refresh_token) between 8 and 4000),
  token_expires_at   timestamptz,
  vehicle_id         text check (vehicle_id is null or char_length(vehicle_id) between 4 and 32),
  vehicle_name       text,
  vehicle_vin        text,
  updated_at         timestamptz not null default now(),
  updated_by         uuid references auth.users(id) on delete set null
);
alter table public.household_tesla enable row level security;
revoke all on public.household_tesla from anon, authenticated, public;
