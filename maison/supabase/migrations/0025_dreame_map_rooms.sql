-- Pièces de la carte Dreame, mémorisées pour le foyer (nettoyage ciblé).
alter table public.household_dreame add column if not exists map_rooms jsonb not null default '[]'::jsonb;
