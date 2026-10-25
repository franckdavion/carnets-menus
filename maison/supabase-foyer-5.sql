-- =====================================================================
--  Maisonnée, étape 5 : Carnet de menus relié, agenda Google, adresses
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois),
--  APRÈS les scripts 1 à 4.
-- =====================================================================

-- Le compte dont le Carnet de menus est relié au foyer (repas et courses synchronisés)
alter table public.households add column carnet_user uuid references public.profiles(id) on delete set null;
-- Identifiant client OAuth Google (public, pas secret) pour afficher les agendas Google
alter table public.households add column google_client_id text check (google_client_id is null or char_length(google_client_id) < 200);
grant update (carnet_user, google_client_id) on public.households to authenticated;

-- On ne peut relier QUE son propre Carnet (ou délier)
create function public.households_check_carnet() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.carnet_user is distinct from old.carnet_user
     and new.carnet_user is not null and new.carnet_user <> auth.uid() then
    raise exception 'on ne peut relier que son propre Carnet';
  end if;
  return new;
end $$;
create trigger households_check_carnet before update on public.households
  for each row execute function public.households_check_carnet();

-- Adresse approximative de la position partagée (calculée sur le téléphone de la personne)
alter table public.member_locations add column address text check (address is null or char_length(address) < 200);
