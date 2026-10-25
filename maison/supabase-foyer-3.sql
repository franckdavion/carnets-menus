-- =====================================================================
--  Maisonnée, étape 3 : anniversaires, budget, documents, emploi du temps
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois),
--  APRÈS supabase-foyer.sql et supabase-foyer-2.sql.
-- =====================================================================

-- ---------- 1. ANNIVERSAIRES ----------
create table public.birthdays (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  day           int  not null check (day between 1 and 31),
  month         int  not null check (month between 1 and 12),
  year          int  check (year between 1900 and 2100),      -- facultatif (pour l'âge)
  member_id     uuid references public.household_members(id) on delete set null,
  notes         text not null default '',
  created_at    timestamptz not null default now()
);
create index on public.birthdays (household_id);

-- ---------- 2. BUDGET ----------
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  label         text not null check (char_length(label) between 1 and 80),
  amount        numeric(10,2) not null check (amount >= 0),
  kind          text not null default 'out' check (kind in ('out','in')),   -- dépense ou rentrée
  category      text not null default 'Divers',
  paid_by       uuid references public.household_members(id) on delete set null,
  day           date not null default current_date,
  created_at    timestamptz not null default now()
);
create index on public.expenses (household_id, day);

alter table public.households add column budget_limit numeric(10,2) check (budget_limit is null or budget_limit >= 0);
grant update (budget_limit) on public.households to authenticated;

-- ---------- 3. DOCUMENTS ----------
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 80),
  category      text not null default 'Autre',
  member_id     uuid references public.household_members(id) on delete set null,   -- à qui il appartient
  file_path     text,                                                               -- dans le stockage « household-docs »
  file_name     text not null default '',
  mime          text not null default '',
  size          int  not null default 0,
  expires_on    date,
  notes         text not null default '',
  created_at    timestamptz not null default now()
);
create index on public.documents (household_id);

-- Stockage PRIVÉ : un dossier par foyer (<id du foyer>/…), visible des seuls membres
insert into storage.buckets (id, name, public) values ('household-docs','household-docs', false)
  on conflict do nothing;
-- Vérifie que le premier dossier du chemin est un foyer dont on est membre (sans planter sur un nom qui n'est pas un identifiant)
create function public.is_member_path(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare f text := split_part(path, '/', 1);
begin
  if f !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return public.is_member(f::uuid);
end $$;
create policy "docs: lire"      on storage.objects for select to authenticated
  using (bucket_id = 'household-docs' and public.is_member_path(name));
create policy "docs: envoyer"   on storage.objects for insert to authenticated
  with check (bucket_id = 'household-docs' and public.is_member_path(name));
create policy "docs: supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'household-docs' and public.is_member_path(name));

-- ---------- 4. EMPLOI DU TEMPS (semaine type) ----------
create table public.schedule (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  member_id     uuid references public.household_members(id) on delete cascade,
  weekday       int  not null check (weekday between 1 and 7),               -- 1 = lundi
  start_time    time not null,
  end_time      time not null,
  title         text not null check (char_length(title) between 1 and 60),
  place         text not null default '',
  created_at    timestamptz not null default now()
);
create index on public.schedule (household_id);

-- ---------- 5. SÉCURITÉ ----------
alter table public.birthdays enable row level security;
alter table public.expenses  enable row level security;
alter table public.documents enable row level security;
alter table public.schedule  enable row level security;
create policy "anniversaires" on public.birthdays for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "budget"        on public.expenses  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "documents"     on public.documents for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "emploi du temps" on public.schedule for all using (public.is_member(household_id)) with check (public.is_member(household_id));

-- ---------- 6. TEMPS RÉEL ----------
alter publication supabase_realtime add table public.birthdays, public.expenses, public.documents, public.schedule;
