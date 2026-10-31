-- =====================================================================
--  Maisonnée : Dreame Home (identifiants côté serveur, aspirateur)
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
-- =====================================================================

alter table public.households add column if not exists dreame_device_id text
  check (dreame_device_id is null or char_length(dreame_device_id) between 4 and 80);

create table if not exists public.household_dreame (
  household_id    uuid primary key references public.households(id) on delete cascade,
  email           text not null check (char_length(email) between 5 and 120),
  password        text not null check (char_length(password) between 4 and 200),
  region          text not null default 'eu' check (region in ('eu', 'us', 'cn', 'ru', 'sg', 'in', 'de', 'tw')),
  country         text not null default 'FR' check (char_length(country) between 2 and 2),
  lang            text not null default 'fr' check (char_length(lang) between 2 and 5),
  access_token    text,
  refresh_token   text,
  token_expires_at timestamptz,
  uid             text,
  device_id       text check (device_id is null or char_length(device_id) between 4 and 80),
  device_name     text,
  device_model    text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);
alter table public.household_dreame enable row level security;
revoke all on public.household_dreame from anon, authenticated, public;
