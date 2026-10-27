-- =====================================================================
--  Maisonnée, étape 14 : module « Présences des enfants »
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
--  Ne fait que CRÉER des tables : aucune donnée existante n'est modifiée.
--  Toutes les tables sont réservées aux membres connectés du foyer (RLS is_member),
--  et fermées aux visiteurs non connectés (anon).
-- =====================================================================

-- ---------- 1. ENFANTS ACCUEILLIS ----------
create table if not exists public.children (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  first_name    text not null check (char_length(first_name) between 1 and 40),
  last_name     text not null default '' check (char_length(last_name) <= 60),
  aliases       text[] not null default '{}',          -- variantes du prénom dans l'agenda
  archived      boolean not null default false,        -- l'historique est toujours conservé
  notes         text not null default '' check (char_length(notes) <= 500),
  created_at    timestamptz not null default now()
);
create index if not exists children_hh on public.children (household_id);

-- ---------- 2. PÉRIODES D'ACCUEIL (permanent / relais) ----------
-- Un passage de relais à permanent = deux périodes : les anciennes gardent leur règle.
create table if not exists public.child_periods (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  child_id      uuid not null references public.children(id) on delete cascade,
  kind          text not null check (kind in ('permanent','relais')),
  start_day     date not null,
  end_day       date,                                   -- vide = toujours en cours
  check (end_day is null or end_day >= start_day)
);
create index if not exists child_periods_hh on public.child_periods (household_id, child_id);

-- ---------- 3. ÉVÉNEMENTS GOOGLE RECONNUS ----------
-- Seuls les événements contenant le prénom d'un enfant enregistré sont gardés.
create table if not exists public.presence_events (
  household_id  uuid not null references public.households(id) on delete cascade,
  child_id      uuid not null references public.children(id) on delete cascade,
  gid           text not null,                          -- identifiant Google de l'occurrence
  series        text not null default '',               -- identifiant de la série (événements répétés)
  cal           text not null default '',
  title         text not null default '',
  sig           text not null,                          -- abs | rel | only | other | both | datesko
  start_day     date not null,
  end_day       date not null,                          -- inclus (fin exclusive de Google déjà convertie)
  seen_at       timestamptz not null default now(),
  primary key (household_id, child_id, gid)
);
create index if not exists presence_events_days on public.presence_events (household_id, start_day, end_day);

-- ---------- 4. CORRECTIONS MANUELLES (prioritaires, jamais effacées par la synchro) ----------
create table if not exists public.presence_overrides (
  household_id  uuid not null references public.households(id) on delete cascade,
  child_id      uuid not null references public.children(id) on delete cascade,
  day           date not null,
  status        text not null check (status in ('present','absent','none')),
  member_id     uuid references public.household_members(id) on delete set null,
  at            timestamptz not null default now(),
  primary key (household_id, child_id, day)
);

-- ---------- 5. RÉPONSES AUX ÉVÉNEMENTS AMBIGUS (mémorisées) ----------
create table if not exists public.presence_rules (
  household_id  uuid not null references public.households(id) on delete cascade,
  key           text not null,                          -- s:<série Google> ou t:<titre normalisé>
  child_id      uuid not null references public.children(id) on delete cascade,
  decision      text not null check (decision in ('absence','presence','ignore')),
  member_id     uuid references public.household_members(id) on delete set null,
  at            timestamptz not null default now(),
  primary key (household_id, key, child_id)
);

-- ---------- 6. RÉGLAGES (agendas analysés, mots reconnus, dernière synchro) ----------
alter table public.households add column if not exists presence_settings jsonb;
grant update (presence_settings) on public.households to authenticated;

-- ---------- 7. SÉCURITÉ ----------
alter table public.children           enable row level security;
alter table public.child_periods      enable row level security;
alter table public.presence_events    enable row level security;
alter table public.presence_overrides enable row level security;
alter table public.presence_rules     enable row level security;
create policy "enfants"            on public.children           for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "périodes"           on public.child_periods      for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "événements présence" on public.presence_events   for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "corrections"        on public.presence_overrides for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "règles présence"    on public.presence_rules     for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
revoke all on public.children, public.child_periods, public.presence_events, public.presence_overrides, public.presence_rules from anon;
grant select, insert, update, delete on public.children, public.child_periods, public.presence_events, public.presence_overrides, public.presence_rules to authenticated;

-- ---------- 8. TEMPS RÉEL (une correction faite sur un téléphone apparaît sur l'autre) ----------
alter publication supabase_realtime add table public.children, public.child_periods, public.presence_events, public.presence_overrides, public.presence_rules;
