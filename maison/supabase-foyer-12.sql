-- =====================================================================
--  Maisonnée, étape 12 : dossiers de Documents (les dossiers vides sont gardés pour tout le foyer)
--  À coller dans Supabase › SQL Editor › New query › Run.
-- =====================================================================
alter table public.households add column if not exists doc_folders jsonb;
grant update (doc_folders) on public.households to authenticated;
