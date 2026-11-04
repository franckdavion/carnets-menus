-- 0028 · Portefeuille de fidélité : cartes partagées et captures privées.
-- Migration additive ; à ne pas réexécuter si déjà appliquée via Supabase.
create table if not exists public.household_loyalty_cards (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  brand_id text not null default '' check (char_length(brand_id) <= 60),
  code text not null default '' check (char_length(code) <= 256),
  format text not null default '' check (char_length(format) <= 60),
  hash text not null default '' check (char_length(hash) <= 128),
  image_path text check (image_path is null or left(image_path, length(household_id::text) + 1) = household_id::text || '/'),
  favorite boolean not null default false,
  revision bigint not null default 1 check (revision >= 1),
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists household_loyalty_cards_household_updated
  on public.household_loyalty_cards (household_id, updated_at desc);

create or replace function public.household_loyalty_touch()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'Changement de foyer interdit';
  end if;
  new.revision := old.revision + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists household_loyalty_cards_touch on public.household_loyalty_cards;
create trigger household_loyalty_cards_touch
  before update on public.household_loyalty_cards
  for each row execute function public.household_loyalty_touch();

alter table public.household_loyalty_cards enable row level security;
create policy "Cartes famille : lecture" on public.household_loyalty_cards
  for select to authenticated using (public.is_member(household_id));
create policy "Cartes famille : ajout" on public.household_loyalty_cards
  for insert to authenticated with check (public.is_member(household_id) and created_by = (select auth.uid()));
create policy "Cartes famille : mise à jour" on public.household_loyalty_cards
  for update to authenticated using (public.is_member(household_id))
  with check (public.is_member(household_id));
grant select, insert, update on public.household_loyalty_cards to authenticated;
revoke all on public.household_loyalty_cards from anon;

insert into storage.buckets (id, name, public, file_size_limit)
values ('household-loyalty', 'household-loyalty', false, 3145728)
on conflict (id) do nothing;
create policy "Cartes famille stockage : voir" on storage.objects
  for select to authenticated using (bucket_id = 'household-loyalty' and public.is_member_path(name));
create policy "Cartes famille stockage : envoyer" on storage.objects
  for insert to authenticated with check (bucket_id = 'household-loyalty' and public.is_member_path(name));
create policy "Cartes famille stockage : retirer" on storage.objects
  for delete to authenticated using (bucket_id = 'household-loyalty' and public.is_member_path(name));

alter publication supabase_realtime add table public.household_loyalty_cards;
