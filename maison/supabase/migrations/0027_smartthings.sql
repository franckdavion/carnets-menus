-- =====================================================================
--  Maisonnée : SmartThings (Samsung TV, identifiants côté serveur)
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
--  Le token SmartThings (PAT) n'est jamais lisible depuis l'appli.
-- =====================================================================

alter table public.households add column if not exists smartthings_device_id text
  check (smartthings_device_id is null or char_length(smartthings_device_id) between 5 and 80);

create table if not exists public.household_smartthings (
  household_id  uuid primary key references public.households(id) on delete cascade,
  pat           text not null check (char_length(pat) between 20 and 400),
  device_id     text check (device_id is null or char_length(device_id) between 5 and 80),
  device_name   text,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null
);
alter table public.household_smartthings enable row level security;
revoke all on public.household_smartthings from anon, authenticated, public;
