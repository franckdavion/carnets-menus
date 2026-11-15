-- 0035 · RLS UPDATE pet_events (nettoyage payload positions) + effacement notifications seules.

drop policy if exists "evenements animaux foyer: modifier" on public.pet_events;
create policy "evenements animaux foyer: modifier" on public.pet_events
  for update to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

grant update on public.pet_events to authenticated;

create or replace function public.pet_clear_notifications(p_pet_id uuid)
returns void language plpgsql security invoker set search_path = public as $fn$
declare hh uuid;
begin
  select household_id into hh from public.household_pets where id = p_pet_id;
  if hh is null or not public.is_member(hh) then raise exception 'Accès refusé'; end if;
  delete from public.pet_events
    where pet_id = p_pet_id and household_id = hh and kind in ('view', 'message', 'found');
  delete from public.pet_consult_sessions where pet_id = p_pet_id and household_id = hh;
end;
$fn$;

revoke execute on function public.pet_clear_notifications(uuid) from anon, public;
grant execute on function public.pet_clear_notifications(uuid) to authenticated;