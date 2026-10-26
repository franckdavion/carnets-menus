-- =====================================================================
--  Maisonnée, étape 10 : préférences de notifications de chacun
--  À coller dans Supabase › SQL Editor › New query › Run.
-- =====================================================================
create table if not exists public.maison_push_prefs (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  prefs      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.maison_push_prefs enable row level security;
drop policy if exists "préférences: les siennes" on public.maison_push_prefs;
create policy "préférences: les siennes" on public.maison_push_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
