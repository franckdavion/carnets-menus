-- =====================================================================
--  Maisonnée, étape 13 : Repas et Courses en direct
--  Le carnet commun (table user_state) envoie ses changements en temps réel.
--  À coller dans Supabase › SQL Editor › New query › Run (une seule fois).
-- =====================================================================
alter publication supabase_realtime add table public.user_state;
