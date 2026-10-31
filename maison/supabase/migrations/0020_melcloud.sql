-- =====================================================================
--  Maisonnée : MELCloud (identifiants côté serveur, chauffage Mitsubishi)
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
--  Le mot de passe MELCloud n'est jamais lisible depuis l'appli.
-- =====================================================================

alter table public.households add column if not exists melcloud_device_id bigint
  check (melcloud_device_id is null or melcloud_device_id > 0);

create table if not exists public.household_melcloud (
  household_id  uuid primary key references public.households(id) on delete cascade,
  email         text not null check (char_length(email) between 5 and 120),
  password      text not null check (char_length(password) between 4 and 200),
  context_key   text,
  context_at    timestamptz,
  device_id     bigint check (device_id is null or device_id > 0),
  device_name   text,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null
);
alter table public.household_melcloud enable row level security;
revoke all on public.household_melcloud from anon, authenticated, public;
