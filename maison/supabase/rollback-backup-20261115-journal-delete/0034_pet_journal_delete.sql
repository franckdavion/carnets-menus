-- 0034 · Journal animaux : suppressions réservées aux membres du foyer (via RPC).

drop policy if exists "evenements animaux foyer: supprimer" on public.pet_events;
create policy "evenements animaux foyer: supprimer" on public.pet_events
  for delete to authenticated using (public.is_member(household_id));

drop policy if exists "positions animaux foyer: supprimer" on public.pet_sightings;
create policy "positions animaux foyer: supprimer" on public.pet_sightings
  for delete to authenticated using (public.is_member(household_id));

drop policy if exists "sessions animaux foyer: modifier" on public.pet_consult_sessions;
create policy "sessions animaux foyer: modifier" on public.pet_consult_sessions
  for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

grant delete on public.pet_events to authenticated;
grant delete on public.pet_sightings to authenticated;
grant update on public.pet_consult_sessions to authenticated;

create or replace function public.pet_delete_event(p_event_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare r public.pet_events%rowtype;
begin
  select * into r from public.pet_events where id = p_event_id;
  if not found then return;
  if not public.is_member(r.household_id) then raise exception 'Accès refusé'; end if;
  delete from public.pet_sightings where event_id = p_event_id;
  delete from public.pet_events where id = p_event_id;
end;
$$;

create or replace function public.pet_clear_journal(p_pet_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare hh uuid;
begin
  select household_id into hh from public.household_pets where id = p_pet_id;
  if hh is null or not public.is_member(hh) then raise exception 'Accès refusé'; end if;
  delete from public.pet_sightings where pet_id = p_pet_id and household_id = hh;
  delete from public.pet_events where pet_id = p_pet_id and household_id = hh;
end;
$$;

create or replace function public.pet_clear_positions(p_pet_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare hh uuid;
begin
  select household_id into hh from public.household_pets where id = p_pet_id;
  if hh is null or not public.is_member(hh) then raise exception 'Accès refusé'; end if;
  delete from public.pet_sightings where pet_id = p_pet_id and household_id = hh;
  delete from public.pet_events where pet_id = p_pet_id and household_id = hh and kind = 'location';
  update public.pet_consult_sessions
    set snapshot = snapshot - 'location'
    where pet_id = p_pet_id and household_id = hh and (snapshot ? 'location');
end;
$$;

grant execute on function public.pet_delete_event(uuid) to authenticated;
grant execute on function public.pet_clear_journal(uuid) to authenticated;
grant execute on function public.pet_clear_positions(uuid) to authenticated;