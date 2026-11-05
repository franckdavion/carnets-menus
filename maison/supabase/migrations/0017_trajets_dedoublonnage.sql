-- Protection complémentaire contre les doublons : lieu et trajet validé.
-- Compatible avec les deux lieux existants et sans suppression de données.
alter table public.child_trips
  add column if not exists event_fingerprint text;

create unique index if not exists child_trips_one_actual_appointment
  on public.child_trips (household_id, child_id, event_fingerprint)
  where event_fingerprint is not null;

-- Évite deux lieux avec le même nom ou la même adresse dans un foyer.
-- Les abréviations (PP, Ortho, etc.) sont contrôlées aussi par l'interface.
create unique index if not exists child_trip_places_one_normalized_label
  on public.child_trip_places
  (household_id, lower(regexp_replace(trim(label), '[[:space:]]+', ' ', 'g')));
create unique index if not exists child_trip_places_one_normalized_address
  on public.child_trip_places
  (household_id, lower(regexp_replace(trim(address), '[[:space:]]+', ' ', 'g')));
