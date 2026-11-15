-- 0032 · Mes animaux : fiches foyer, médailles QR, signalements.
-- Additive. Ne touche pas aux tables existantes. Ne pas appliquer en production sans accord.

create table if not exists public.household_pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  species text not null default 'chien' check (char_length(species) between 1 and 40),
  breed text not null default '' check (char_length(breed) <= 60),
  sex text not null default '' check (sex in ('', 'male', 'female')),
  birth_date date,
  color text not null default '' check (char_length(color) <= 80),
  signs text not null default '' check (char_length(signs) <= 400),
  description text not null default '' check (char_length(description) <= 800),
  photo_path text check (photo_path is null or left(photo_path, length(household_id::text) + 1) = household_id::text || '/'),
  contact_name text not null default '' check (char_length(contact_name) <= 60),
  phone text not null default '' check (char_length(phone) <= 24),
  phone2 text not null default '' check (char_length(phone2) <= 24),
  phone_emergency text not null default '' check (char_length(phone_emergency) <= 24),
  publish_phone boolean not null default true,
  publish_phone2 boolean not null default false,
  publish_emergency boolean not null default false,
  message_public text not null default '' check (char_length(message_public) <= 400),
  approach_note text not null default '' check (char_length(approach_note) <= 400),
  medical_note text not null default '' check (char_length(medical_note) <= 400),
  publish_medical boolean not null default false,
  vet_name text not null default '' check (char_length(vet_name) <= 80),
  vet_phone text not null default '' check (char_length(vet_phone) <= 24),
  publish_vet boolean not null default false,
  reward text not null default '' check (char_length(reward) <= 120),
  publish_reward boolean not null default false,
  status text not null default 'ok' check (status in ('ok', 'lost', 'found')),
  notify_on_view boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists household_pets_household_idx
  on public.household_pets (household_id, updated_at desc);

create table if not exists public.pet_medals (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.household_pets(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  public_token text not null unique check (char_length(public_token) between 16 and 40),
  active boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists pet_medals_one_active
  on public.pet_medals (pet_id) where active;
create index if not exists pet_medals_token_idx on public.pet_medals (public_token);

create table if not exists public.pet_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pet_id uuid not null references public.household_pets(id) on delete cascade,
  medal_id uuid references public.pet_medals(id) on delete set null,
  kind text not null check (kind in ('view', 'found', 'location', 'message')),
  ip_hash text not null default '' check (char_length(ip_hash) <= 64),
  user_agent text not null default '' check (char_length(user_agent) <= 240),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists pet_events_pet_idx on public.pet_events (pet_id, created_at desc);
create index if not exists pet_events_dedup_idx on public.pet_events (medal_id, kind, ip_hash, created_at desc);

create table if not exists public.pet_sightings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pet_id uuid not null references public.household_pets(id) on delete cascade,
  event_id uuid references public.pet_events(id) on delete set null,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  accuracy int,
  address text not null default '' check (char_length(address) <= 200),
  source text not null default 'gps' check (source in ('gps', 'manual')),
  created_at timestamptz not null default now()
);
create index if not exists pet_sightings_pet_idx on public.pet_sightings (pet_id, created_at desc);

create or replace function public.household_pets_touch()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'Changement de foyer interdit';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists household_pets_touch on public.household_pets;
create trigger household_pets_touch
  before update on public.household_pets
  for each row execute function public.household_pets_touch();

alter table public.household_pets enable row level security;
alter table public.pet_medals enable row level security;
alter table public.pet_events enable row level security;
alter table public.pet_sightings enable row level security;

drop policy if exists "animaux foyer: lire" on public.household_pets;
create policy "animaux foyer: lire" on public.household_pets
  for select to authenticated using (public.is_member(household_id));
drop policy if exists "animaux foyer: ajouter" on public.household_pets;
create policy "animaux foyer: ajouter" on public.household_pets
  for insert to authenticated with check (public.is_member(household_id));
drop policy if exists "animaux foyer: modifier" on public.household_pets;
create policy "animaux foyer: modifier" on public.household_pets
  for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
drop policy if exists "animaux foyer: retirer" on public.household_pets;
create policy "animaux foyer: retirer" on public.household_pets
  for delete to authenticated using (public.is_member(household_id));

drop policy if exists "medailles foyer: lire" on public.pet_medals;
create policy "medailles foyer: lire" on public.pet_medals
  for select to authenticated using (public.is_member(household_id));
drop policy if exists "medailles foyer: ajouter" on public.pet_medals;
create policy "medailles foyer: ajouter" on public.pet_medals
  for insert to authenticated with check (public.is_member(household_id));
drop policy if exists "medailles foyer: modifier" on public.pet_medals;
create policy "medailles foyer: modifier" on public.pet_medals
  for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

drop policy if exists "evenements animaux foyer: lire" on public.pet_events;
create policy "evenements animaux foyer: lire" on public.pet_events
  for select to authenticated using (public.is_member(household_id));
drop policy if exists "positions animaux foyer: lire" on public.pet_sightings;
create policy "positions animaux foyer: lire" on public.pet_sightings
  for select to authenticated using (public.is_member(household_id));

grant select, insert, update, delete on public.household_pets to authenticated;
grant select, insert, update on public.pet_medals to authenticated;
grant select on public.pet_events to authenticated;
grant select on public.pet_sightings to authenticated;
revoke all on public.household_pets from anon;
revoke all on public.pet_medals from anon;
revoke all on public.pet_events from anon;
revoke all on public.pet_sightings from anon;

insert into storage.buckets (id, name, public, file_size_limit)
values ('household-pets', 'household-pets', false, 3145728)
on conflict (id) do nothing;

drop policy if exists "animaux stockage : voir" on storage.objects;
create policy "animaux stockage : voir" on storage.objects
  for select to authenticated using (bucket_id = 'household-pets' and public.is_member_path(name));
drop policy if exists "animaux stockage : envoyer" on storage.objects;
create policy "animaux stockage : envoyer" on storage.objects
  for insert to authenticated with check (bucket_id = 'household-pets' and public.is_member_path(name));
drop policy if exists "animaux stockage : remplacer" on storage.objects;
create policy "animaux stockage : remplacer" on storage.objects
  for update to authenticated using (bucket_id = 'household-pets' and public.is_member_path(name));
drop policy if exists "animaux stockage : retirer" on storage.objects;
create policy "animaux stockage : retirer" on storage.objects
  for delete to authenticated using (bucket_id = 'household-pets' and public.is_member_path(name));

do $$ begin
  alter publication supabase_realtime add table public.household_pets;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.pet_events;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.pet_sightings;
exception when duplicate_object then null;
end $$;
