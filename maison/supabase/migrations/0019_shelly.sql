-- =====================================================================
--  Maisonnée : Shelly Cloud (clé côté serveur, équipements du foyer)
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
--  La clé d'autorisation n'est jamais lisible depuis l'appli.
-- =====================================================================

alter table public.households add column if not exists shelly_host text
  check (shelly_host is null or char_length(shelly_host) between 12 and 120);

create table if not exists public.household_shelly (
  household_id uuid primary key references public.households(id) on delete cascade,
  auth_key     text not null check (char_length(auth_key) between 20 and 400),
  server_uri   text not null check (char_length(server_uri) between 12 and 120),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) on delete set null
);
alter table public.household_shelly enable row level security;
revoke all on public.household_shelly from anon, authenticated, public;

create table if not exists public.shelly_devices (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 70),
  zone          text not null check (zone in ('exterieur','rdc','etage')),
  type          text not null check (type in ('volet','lumiere','portail','prise')),
  shelly_id     text not null default '',
  channel       int  not null default 0 check (channel between 0 and 7),
  channel_b     int  check (channel_b is null or channel_b between 0 and 7),
  pulse_sec     numeric not null default 1 check (pulse_sec >= 0 and pulse_sec <= 30),
  position      int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists shelly_devices_hh_idx on public.shelly_devices (household_id);
alter table public.shelly_devices enable row level security;
drop policy if exists "shelly: foyer" on public.shelly_devices;
create policy "shelly: foyer" on public.shelly_devices for all
  using (public.is_member(household_id)) with check (public.is_member(household_id));

do $$
begin
  alter publication supabase_realtime add table public.shelly_devices;
exception when duplicate_object then null;
end $$;
