-- =====================================================================
--  Maisonnée, étape 4 : galerie photo du foyer
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois),
--  APRÈS les scripts 1, 2 et 3.
-- =====================================================================

create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  member_id     uuid references public.household_members(id) on delete set null,   -- qui l'a ajoutée
  album         text not null default '',
  caption       text not null default '',
  storage       text not null default 'supabase',   -- où est le fichier (prévu pour un futur cloud à la maison)
  file_path     text not null,                       -- photo réduite (≈ 1600 px)
  thumb_path    text not null,                       -- vignette (≈ 400 px)
  width         int,
  height        int,
  size          int not null default 0,              -- octets (photo + vignette)
  taken_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index on public.photos (household_id, created_at desc);

alter table public.photos enable row level security;
create policy "photos foyer: lire"     on public.photos for select using (public.is_member(household_id));
create policy "photos foyer: ajouter"  on public.photos for insert
  with check (public.is_member(household_id) and member_id = public.my_member(household_id));
create policy "photos foyer: modifier" on public.photos for update
  using (public.is_member(household_id)) with check (public.is_member(household_id));   -- album, légende
-- On ne supprime que ses propres photos
create policy "photos foyer: supprimer" on public.photos for delete
  using (member_id = public.my_member(household_id));

-- Stockage PRIVÉ : un dossier par foyer, visible des seuls membres
insert into storage.buckets (id, name, public) values ('household-photos','household-photos', false)
  on conflict do nothing;
create policy "galerie: lire"      on storage.objects for select to authenticated
  using (bucket_id = 'household-photos' and public.is_member_path(name));
create policy "galerie: envoyer"   on storage.objects for insert to authenticated
  with check (bucket_id = 'household-photos' and public.is_member_path(name));
create policy "galerie: supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'household-photos' and public.is_member_path(name));

alter publication supabase_realtime add table public.photos;
