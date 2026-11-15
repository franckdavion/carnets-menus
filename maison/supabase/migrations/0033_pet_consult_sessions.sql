-- 0033 · Consultations médaille : regroupement push 120 s, sessions distinctes.

create table if not exists public.pet_consult_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pet_id uuid not null references public.household_pets(id) on delete cascade,
  medal_id uuid not null references public.pet_medals(id) on delete cascade,
  ip_hash text not null default '' check (char_length(ip_hash) <= 64),
  user_agent text not null default '' check (char_length(user_agent) <= 240),
  opened_at timestamptz not null default now(),
  bundle_due_at timestamptz not null,
  bundle_sent_at timestamptz,
  snapshot jsonb not null default '{}',
  last_push_at timestamptz,
  last_push_fingerprint text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists pet_consult_sessions_due_idx
  on public.pet_consult_sessions (bundle_due_at)
  where bundle_sent_at is null;

create index if not exists pet_consult_sessions_medal_open_idx
  on public.pet_consult_sessions (medal_id, ip_hash, opened_at desc)
  where bundle_sent_at is null;

alter table public.pet_events
  add column if not exists session_id uuid references public.pet_consult_sessions(id) on delete set null;

create index if not exists pet_events_session_idx on public.pet_events (session_id, created_at);

alter table public.pet_consult_sessions enable row level security;

drop policy if exists "sessions animaux foyer: lire" on public.pet_consult_sessions;
create policy "sessions animaux foyer: lire" on public.pet_consult_sessions
  for select to authenticated using (public.is_member(household_id));

revoke all on public.pet_consult_sessions from anon;
grant select on public.pet_consult_sessions to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.pet_consult_sessions;
exception when duplicate_object then null;
end $$;