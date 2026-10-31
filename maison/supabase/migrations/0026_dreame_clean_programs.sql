-- Programmes de nettoyage Dreame (mode + pièces), mémorisés pour le foyer.
alter table public.household_dreame add column if not exists clean_programs jsonb not null default '[]'::jsonb;
