-- Présences · Trajets groupés et exclusion de rendez-vous (novembre 2026).
-- L'installation a été testée dans le projet Supabase de Maisonnée.
-- Les réservations Google ne sont ni effacées ni modifiées.
create table if not exists public.child_trip_event_marks (
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  event_fingerprint text not null check (length(event_fingerprint) between 4 and 400),
  calendar_id text not null,
  event_id text not null,
  day date not null,
  title text not null,
  decision text not null check (decision in ('ignored','counted')),
  trip_id uuid references public.child_trips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(household_id,child_id,event_fingerprint),
  check ((decision='ignored' and trip_id is null) or (decision='counted' and trip_id is not null))
);
create index if not exists child_trip_marks_household_day on public.child_trip_event_marks(household_id,day);
create index if not exists child_trip_marks_trip on public.child_trip_event_marks(trip_id) where trip_id is not null;
alter table public.child_trip_event_marks enable row level security;
do $sql$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='child_trip_event_marks' and policyname='Trajets événements foyer') then
    create policy "Trajets événements foyer" on public.child_trip_event_marks
      for all to authenticated using (public.is_member(household_id))
      with check(public.is_member(household_id)
        and exists(select 1 from public.children c where c.id=child_id and c.household_id=child_trip_event_marks.household_id)
        and (trip_id is null or exists(select 1 from public.child_trips t where t.id=trip_id and t.household_id=child_trip_event_marks.household_id)));
  end if;
end $sql$;
revoke all on public.child_trip_event_marks from anon;
grant select,insert,update,delete on public.child_trip_event_marks to authenticated;
CREATE OR REPLACE FUNCTION public.confirm_child_trip_group(p_trip jsonb, p_events jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_hh uuid;
  v_owner uuid;
  v_day date;
  v_id uuid;
  v_e jsonb;
  v_child uuid;
  v_fingerprint text;
begin
  if p_trip is null or jsonb_typeof(p_trip)<>'object'
     or jsonb_typeof(p_events)<>'array'
     or jsonb_array_length(p_events) < 1 or jsonb_array_length(p_events) > 12
     then raise exception 'Paramètres de trajet invalides'; end if;
  v_hh=(p_trip->>'household_id')::uuid;
  v_owner=(p_trip->>'child_id')::uuid;
  v_day=(p_trip->>'day')::date;
  if v_hh is null or not public.is_member(v_hh) then
    raise exception 'Foyer non autorisé'; end if;
  if not exists(select 1 from public.children c
                 where c.id=v_owner and c.household_id=v_hh)
     then raise exception 'Enfant non associé au foyer'; end if;
  if v_day > current_date then
    raise exception 'Le trajet ne peut être confirmé avant le jour prévu'; end if;
  if (p_trip->>'distance_km')::numeric < 0
     or (p_trip->>'calculated_km')::numeric < 0
     then raise exception 'Kilométrage invalide'; end if;
  for v_e in select value from jsonb_array_elements(p_events) loop
    v_child=(v_e->>'child_id')::uuid;
    v_fingerprint=trim(v_e->>'event_fingerprint');
    if v_child is null or coalesce(length(v_fingerprint),0)<4
       or coalesce(v_e->>'calendar_id','')=''
       or coalesce(v_e->>'event_id','')=''
       or (v_e->>'day')::date is distinct from v_day
       or not exists(select 1 from public.children c
                     where c.id=v_child and c.household_id=v_hh)
       then raise exception 'Rendez-vous lié invalide'; end if;
  end loop;
  insert into public.child_trips(
    household_id,child_id,calendar_id,event_id,event_fingerprint,
    day,title,category,origin_label,destination_label,return_label,
    trip_mode,calculated_km,distance_km,legs)
  values(
    v_hh,v_owner,p_trip->>'calendar_id',p_trip->>'event_id',p_trip->>'event_fingerprint',
    v_day,p_trip->>'title',p_trip->>'category',
    p_trip->>'origin_label',p_trip->>'destination_label',coalesce(p_trip->>'return_label',''),
    p_trip->>'trip_mode',(p_trip->>'calculated_km')::numeric,
    (p_trip->>'distance_km')::numeric,p_trip->'legs'
  ) returning id into v_id;
  for v_e in select value from jsonb_array_elements(p_events) loop
    insert into public.child_trip_event_marks(
      household_id,child_id,event_fingerprint,calendar_id,event_id,
      day,title,decision,trip_id)
    values(
      v_hh,(v_e->>'child_id')::uuid,trim(v_e->>'event_fingerprint'),
      v_e->>'calendar_id',v_e->>'event_id',
      (v_e->>'day')::date,v_e->>'title','counted',v_id);
  end loop;
  return v_id;
end;
$function$

revoke all on function public.confirm_child_trip_group(jsonb,jsonb) from public,anon;
grant execute on function public.confirm_child_trip_group(jsonb,jsonb) to authenticated;
