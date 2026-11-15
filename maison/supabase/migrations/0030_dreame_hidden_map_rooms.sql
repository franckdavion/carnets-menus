-- Segments Dreame que le foyer masque dans Maisonnée (toujours sur la carte robot).
alter table public.household_dreame
  add column if not exists hidden_map_room_ids jsonb not null default '[]'::jsonb;
