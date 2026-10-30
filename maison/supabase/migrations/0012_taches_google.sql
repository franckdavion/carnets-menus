-- =====================================================================
--  Maisonnée, étape 11 : les tâches recopiées dans Google Agenda par le serveur
--  (même quand l'appli est fermée). À coller dans Supabase › SQL Editor › New query › Run.
--  google_tasks = { on, cal (agenda Google), user_id (compte Google utilisé), at, err }
-- =====================================================================
alter table public.households add column if not exists google_tasks jsonb;
grant update (google_tasks) on public.households to authenticated;
