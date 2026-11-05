-- Carnet de trajets Maisonnée : règles réversibles d'exclusion par motif.
-- Une règle s'applique à tous les enfants du foyer et aux prochaines occurrences.
-- Les déplacements déjà confirmés et les événements Google ne sont jamais modifiés.
create table if not exists public.child_trip_ignore_rules (
  household_id uuid not null references public.households(id) on delete cascade,
  motif_key text not null check (char_length(motif_key) between 1 and 120),
  motif_label text not null check (char_length(motif_label) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (household_id, motif_key)
);
create index if not exists child_trip_ignore_rules_household
  on public.child_trip_ignore_rules(household_id);
alter table public.child_trip_ignore_rules enable row level security;
do $mig$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and
                 tablename='child_trip_ignore_rules' and policyname='Règles exclusion trajets foyer') then
    create policy "Règles exclusion trajets foyer" on public.child_trip_ignore_rules
      for all to authenticated
      using(public.is_member(household_id))
      with check(public.is_member(household_id));
  end if;
end $mig$;
revoke all on public.child_trip_ignore_rules from anon;
grant select,insert,delete on public.child_trip_ignore_rules to authenticated;
