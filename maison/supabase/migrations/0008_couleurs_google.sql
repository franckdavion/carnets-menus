-- Maisonnée, étape 7 : prénom associé à chaque couleur Google (partagé par le foyer)
alter table public.households add column if not exists google_colors jsonb;
grant update (google_colors) on public.households to authenticated;
