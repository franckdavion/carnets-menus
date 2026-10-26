-- Maisonnée : abonnements push (à exécuter dans Supabase SQL Editor).
create table if not exists public.maison_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists maison_push_user_idx on public.maison_push_subscriptions(user_id);
alter table public.maison_push_subscriptions enable row level security;
drop policy if exists "push: own read" on public.maison_push_subscriptions;
create policy "push: own read" on public.maison_push_subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "push: own insert" on public.maison_push_subscriptions;
create policy "push: own insert" on public.maison_push_subscriptions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "push: own update" on public.maison_push_subscriptions;
create policy "push: own update" on public.maison_push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push: own delete" on public.maison_push_subscriptions;
create policy "push: own delete" on public.maison_push_subscriptions for delete to authenticated using (user_id = auth.uid());
create table if not exists public.maison_push_deliveries (
  id text primary key,
  sent_at timestamptz not null default now()
);
alter table public.maison_push_deliveries enable row level security;
-- Aucun accès direct depuis le client : uniquement Edge Function avec service_role.
