-- =====================================================================
--  Maisonnée : consentement explicite pour appliquer les rappels Google
--  au compte de chaque membre (jeton de CE membre uniquement).
--
--  NE PAS exécuter tant que Franck n'a pas validé cette étape.
--  Défaut false : Christine ne reçoit aucun nouveau droit tant qu'elle
--  n'a pas coché le réglage dans Ma famille.
-- =====================================================================

alter table public.google_calendar_tokens
  add column if not exists family_reminders boolean not null default false;

comment on column public.google_calendar_tokens.family_reminders is
  'Si vrai, Maisonnée peut recopier les rappels d''un événement familial sur CE compte Google, avec le jeton de cet utilisateur.';
