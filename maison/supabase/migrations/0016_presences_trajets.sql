-- Maisonnée : carnet de trajets des enfants, indépendant du calcul de présences.
-- Aucune table existante n'est supprimée ou modifiée.
create table if not exists public.child_trip_places (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 90),
  address text not null check (length(trim(address)) between 5 and 400),
  longitude double precision,
  latitude double precision,
  is_home boolean not null default false,
  keywords text not null default '' check (length(keywords) <= 300),
  created_at timestamptz not null default now(),
  check ((longitude is null and latitude is null) or
         (longitude between -180 and 180 and latitude between -90 and 90))
);
create index if not exists child_trip_places_hh on public.child_trip_places(household_id);
create unique index if not exists child_trip_places_one_home on public.child_trip_places(household_id) where is_home;

create table if not exists public.child_trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  calendar_id text not null,
  event_id text not null,
  day date not null,
  title text not null check (length(title) <= 200),
  category text not null default 'activite',
  origin_label text not null,
  destination_label text not null,
  return_label text not null default '',
  trip_mode text not null check (trip_mode in ('one','round','four','custom')),
  calculated_km numeric(9,1) not null check (calculated_km >= 0),
  distance_km numeric(9,1) not null check (distance_km >= 0),
  legs jsonb not null default '[]'::jsonb,
  confirmed_at timestamptz not null default now(),
  unique(household_id,child_id,calendar_id,event_id)
);
create index if not exists child_trips_hh_day on public.child_trips(household_id,day desc);
create index if not exists child_trips_child_day on public.child_trips(household_id,child_id,day desc);

alter table public.child_trip_places enable row level security;
alter table public.child_trips enable row level security;
create policy "places accessible foyer" on public.child_trip_places
  for all to authenticated using (public.is_member(household_id))
  with check (public.is_member(household_id));
create policy "trajets accessibles foyer" on public.child_trips
  for all to authenticated using (public.is_member(household_id))
  with check (public.is_member(household_id) and
    exists(select 1 from public.children c where c.id=child_id and c.household_id=child_trips.household_id));
revoke all on public.child_trip_places, public.child_trips from anon;
grant select,insert,update,delete on public.child_trip_places, public.child_trips to authenticated;
