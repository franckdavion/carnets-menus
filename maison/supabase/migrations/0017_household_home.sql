-- Maisonnée : ville de la météo et disposition de l'accueil, partagées par le foyer.
-- home = { order, hidden, city, lat, lon }
-- À coller une fois.

alter table public.households add column if not exists home jsonb;
grant update (home) on public.households to authenticated;
