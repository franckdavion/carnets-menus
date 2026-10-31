-- Maisonnée : disposition de l'accueil par membre (order, hidden).
-- households.home garde météo (city, lat, lon) et domotique (dom).
-- À coller une fois.

alter table public.household_members add column if not exists home_prefs jsonb;

grant update (home_prefs) on public.household_members to authenticated;
