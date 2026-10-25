-- =====================================================================
--  Maisonnée, étape 2 : messagerie du foyer et positions partagées
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois),
--  APRÈS supabase-foyer.sql.
-- =====================================================================

-- Le membre qui correspond au compte connecté, dans un foyer donné
create function public.my_member(hid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from household_members where household_id = hid and user_id = auth.uid() limit 1;
$$;

-- ---------- 1. MESSAGES ----------
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  member_id     uuid references public.household_members(id) on delete set null,
  body          text not null check (char_length(body) between 1 and 2000),
  created_at    timestamptz not null default now()
);
create index on public.messages (household_id, created_at desc);

alter table public.messages enable row level security;
create policy "messages: lire" on public.messages for select using (public.is_member(household_id));
-- On n'écrit qu'en son propre nom
create policy "messages: écrire" on public.messages for insert
  with check (public.is_member(household_id) and member_id = public.my_member(household_id));
-- On ne supprime que ses propres messages
create policy "messages: supprimer" on public.messages for delete
  using (member_id = public.my_member(household_id));

-- ---------- 2. POSITIONS (partage volontaire, une ligne par membre) ----------
create table public.member_locations (
  id            uuid primary key references public.household_members(id) on delete cascade,  -- = le membre
  household_id  uuid not null references public.households(id) on delete cascade,
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  accuracy      int,
  updated_at    timestamptz not null default now()
);

alter table public.member_locations enable row level security;
create policy "positions: lire" on public.member_locations for select using (public.is_member(household_id));
-- Chacun ne publie, ne met à jour et n'efface que SA position
create policy "positions: publier" on public.member_locations for insert
  with check (id = public.my_member(household_id));
create policy "positions: mettre à jour" on public.member_locations for update
  using (id = public.my_member(household_id)) with check (id = public.my_member(household_id));
create policy "positions: arrêter" on public.member_locations for delete
  using (id = public.my_member(household_id));

-- ---------- 3. TEMPS RÉEL ----------
alter publication supabase_realtime add table public.messages, public.member_locations;
