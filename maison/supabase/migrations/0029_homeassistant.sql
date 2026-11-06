create table if not exists public.household_homeassistant (
  household_id uuid primary key references public.households(id) on delete cascade,
  base_url text not null check (char_length(base_url) between 12 and 200),
  token text not null check (char_length(token) between 20 and 800),
  entity_id text check (entity_id is null or char_length(entity_id) between 5 and 120),
  entity_name text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.household_homeassistant enable row level security;
revoke all on public.household_homeassistant from anon, authenticated, public;
