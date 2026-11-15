-- =====================================================================
--  Maisonnée : albums de la galerie (les albums vides restent visibles pour tout le foyer)
--  À coller dans Supabase › SQL Editor › New query › Run (une fois).
-- =====================================================================
alter table public.households add column if not exists photo_albums jsonb;
grant update (photo_albums) on public.households to authenticated;
