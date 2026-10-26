-- =====================================================================
--  Maisonnée, étape 8 : un Carnet de menus commun à tout le foyer
--  À coller dans Supabase › SQL Editor › New query › Run.
--  Le Carnet relié au foyer (households.carnet_user) devient celui de tous
--  les membres qui ont un compte : menus, courses, cave, favoris, notes.
-- =====================================================================

-- Le carnet sur lequel travaille le compte connecté : celui de son foyer s'il y en a un
create or replace function public.shared_carnet_owner() returns uuid
language sql stable security definer set search_path = public as $$
  select h.carnet_user
  from households h join household_members m on m.household_id = h.id
  where m.user_id = auth.uid() and h.carnet_user is not null
  order by (h.carnet_user = auth.uid()) desc, h.created_at
  limit 1;
$$;
grant execute on function public.shared_carnet_owner() to authenticated;

-- Les membres du foyer lisent et modifient ce carnet commun (en plus de leur propre espace)
drop policy if exists "état partagé du foyer" on public.user_state;
create policy "état partagé du foyer" on public.user_state for all
  using (public.is_active() and user_id = public.shared_carnet_owner())
  with check (public.is_active() and user_id = public.shared_carnet_owner());
