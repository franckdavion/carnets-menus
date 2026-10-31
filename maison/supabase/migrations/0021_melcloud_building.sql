-- MELCloud : identifiant bâtiment pour Device/Get (températures à jour)
alter table public.household_melcloud add column if not exists building_id bigint
  check (building_id is null or building_id > 0);
