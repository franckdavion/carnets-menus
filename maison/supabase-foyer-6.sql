-- =====================================================================
--  Maisonnée, étape 6 : rendez-vous avec rappels, connexion Google côté serveur
--  À coller dans Supabase › SQL Editor › New query › Run.
--  Sans danger si une partie existe déjà (« if not exists »).
-- =====================================================================

-- Rendez-vous : type et rappels (en minutes avant le début)
alter table public.events add column if not exists kind text;
alter table public.events add column if not exists reminders jsonb;
create index if not exists events_reminders_idx on public.events (day) where reminders is not null;

-- Jetons Google de chaque compte (lus et écrits UNIQUEMENT par la fonction google-calendar)
create table if not exists public.google_calendar_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  access_token  text,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.google_calendar_tokens enable row level security;
-- Aucune règle d'accès : ni l'appli ni les autres membres ne peuvent lire ces jetons.
