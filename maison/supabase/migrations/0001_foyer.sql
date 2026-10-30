-- =====================================================================
--  Maisonnée : foyers, membres, tâches, agenda, repas et courses partagés
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
--  S'ajoute au script du Carnet de menus (supabase.txt) sans rien modifier :
--  mêmes comptes, même livre de recettes.
-- =====================================================================

-- ---------- 1. FOYERS ----------
create table public.households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 60),
  invite_code  text not null unique,
  people       int  not null default 4 check (people between 1 and 20),  -- couverts par repas
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Membres : avec un compte (user_id) ou sans compte (enfant, colocataire…)
create table public.household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  name          text not null check (char_length(name) between 1 and 40),
  color         text not null default '#3C6E5A',
  role          text not null default 'member' check (role in ('owner','member')),
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  unique (household_id, user_id)
);
create index on public.household_members (user_id);

-- ---------- 2. TÂCHES ----------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 80),
  room          text not null default 'Divers',
  assignee      uuid references public.household_members(id) on delete set null,  -- vide = n'importe qui
  rotate        boolean not null default false,       -- passe au membre suivant après chaque fois
  freq          text not null default 'once' check (freq in ('once','daily','weekly','monthly','every')),
  every_n       int  not null default 1 check (every_n between 1 and 365),
  weekdays      int[] not null default '{}',          -- 1 = lundi … 7 = dimanche (fréquence hebdo)
  next_due      date not null default current_date,
  effort        int  not null default 1 check (effort between 1 and 3),
  notes         text not null default '',
  archived      boolean not null default false,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.tasks (household_id);

create table public.task_log (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  task_id       uuid references public.tasks(id) on delete cascade,
  member_id     uuid references public.household_members(id) on delete set null,
  title         text not null default '',
  effort        int  not null default 1,
  done_on       date not null default current_date,
  prev_due      date,
  prev_assignee uuid,
  at            timestamptz not null default now()
);
create index on public.task_log (household_id, done_on);

-- ---------- 3. AGENDA ----------
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 80),
  day           date not null,
  start_time    time,                                 -- vide = toute la journée
  end_time      time,
  repeat        text not null default 'none' check (repeat in ('none','weekly','monthly','yearly')),
  members       uuid[] not null default '{}',
  place         text not null default '',
  notes         text not null default '',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.events (household_id, day);

-- ---------- 4. REPAS ET COURSES ----------
create table public.meals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  day           date not null,
  slot          text not null check (slot in ('midi','soir')),
  recipe_id     uuid references public.recipes(id) on delete set null,
  label         text not null default '',
  cook          uuid references public.household_members(id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (household_id, day, slot)
);

create table public.shopping_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  qty           text not null default '',
  aisle         text not null default 'Divers',
  done          boolean not null default false,
  source        text not null default '',              -- 'menu:AAAA-MM-JJ' quand ajouté depuis le menu
  added_by      uuid references public.household_members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.shopping_items (household_id);

-- ---------- 5. FONCTIONS ----------
create function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = hid and user_id = auth.uid());
$$;

create function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare c text; a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(a, 1 + floor(random() * char_length(a))::int, 1); end loop;
    exit when not exists (select 1 from households where invite_code = c);
  end loop;
  return c;
end $$;

-- Créer un foyer (on en devient le premier membre)
create function public.create_household(p_name text, p_display text, p_color text default '#E0533D')
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  insert into households (name, invite_code, created_by)
    values (trim(p_name), new_invite_code(), auth.uid()) returning id into hid;
  insert into household_members (household_id, user_id, name, color, role, position)
    values (hid, auth.uid(), trim(p_display), p_color, 'owner', 0);
  return hid;
end $$;

-- Rejoindre un foyer avec son code. p_member : reprendre un membre « sans compte » déjà créé (facultatif)
create function public.join_household(p_code text, p_display text, p_member uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid; n int;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select id into hid from households where invite_code = upper(trim(p_code));
  if hid is null then raise exception 'code inconnu'; end if;
  if exists (select 1 from household_members where household_id = hid and user_id = auth.uid()) then return hid; end if;
  if p_member is not null then
    update household_members set user_id = auth.uid()
      where id = p_member and household_id = hid and user_id is null;
    if found then return hid; end if;
  end if;
  select count(*) into n from household_members where household_id = hid;
  insert into household_members (household_id, user_id, name, color, position)
    values (hid, auth.uid(), trim(p_display),
            (array['#E0533D','#2F8FA6','#E8A33B','#7A4E9C','#3FA27A','#D46A92'])[(n % 6) + 1], n);
  return hid;
end $$;

-- Voir les membres sans compte d'un foyer avant de le rejoindre (pour « c'est moi »)
create function public.household_preview(p_code text)
returns table (household_name text, member_id uuid, member_name text, has_account boolean)
language sql stable security definer set search_path = public as $$
  select h.name, m.id, m.name, m.user_id is not null
  from households h left join household_members m on m.household_id = h.id
  where h.invite_code = upper(trim(p_code)) and auth.uid() is not null
  order by m.position;
$$;

-- Nouveau code d'invitation (l'ancien ne marche plus)
create function public.reset_invite_code(hid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_member(hid) then raise exception 'réservé aux membres du foyer'; end if;
  c := new_invite_code();
  update households set invite_code = c where id = hid;
  return c;
end $$;

-- Quitter un foyer (le membre reste dans l'historique, sans compte)
create function public.leave_household(hid uuid) returns void
language sql security definer set search_path = public as $$
  update household_members set user_id = null, role = 'member' where household_id = hid and user_id = auth.uid();
$$;

-- ---------- 6. SÉCURITÉ (Row Level Security) ----------
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_log          enable row level security;
alter table public.events            enable row level security;
alter table public.meals             enable row level security;
alter table public.shopping_items    enable row level security;

-- Seuls les membres d'un foyer voient et modifient ses données
create policy "foyer: lire"     on public.households for select using (public.is_member(id));
create policy "foyer: modifier" on public.households for update using (public.is_member(id)) with check (public.is_member(id));
revoke update on public.households from authenticated;
grant  update (name, people) on public.households to authenticated;

create policy "membres: lire"     on public.household_members for select using (public.is_member(household_id));
create policy "membres: ajouter"  on public.household_members for insert
  with check (public.is_member(household_id) and user_id is null);          -- on n'ajoute que des membres sans compte
create policy "membres: modifier" on public.household_members for update
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "membres: retirer"  on public.household_members for delete
  using (public.is_member(household_id) and user_id is null);
revoke update on public.household_members from authenticated;
grant  update (name, color, position) on public.household_members to authenticated;

create policy "tâches"   on public.tasks          for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "fait"     on public.task_log       for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "agenda"   on public.events         for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "repas"    on public.meals          for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "courses"  on public.shopping_items for all using (public.is_member(household_id)) with check (public.is_member(household_id));

-- ---------- 7. TEMPS RÉEL (les autres téléphones se mettent à jour tout seuls) ----------
alter publication supabase_realtime add table
  public.households, public.household_members, public.tasks, public.task_log,
  public.events, public.meals, public.shopping_items;
