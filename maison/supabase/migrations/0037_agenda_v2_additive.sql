-- Migration 0037 — Agenda V2 : colonnes additives
-- Branche : preview/agenda-v2 — NE PAS exécuter en production avant validation Phase 0.
--
-- Stratégie : ADDITIVE uniquement. Aucune colonne supprimée. Aucune colonne NOT NULL ajoutée.
-- Aucune donnée modifiée sauf backfill allday (NULL → dérivé de start_time).
-- Réversible : voir section ROLLBACK en bas de fichier.
--
-- Nouvelles colonnes :
--   allday      BOOLEAN         — événement toute la journée
--   rrule_json  JSONB           — objet RRULE complet (byDay, until, count, exdates…)
--   travel      INTEGER         — minutes de trajet avant l'événement
--   url         TEXT            — URL associée à l'événement
--   countdown   BOOLEAN         — afficher un compte à rebours dans la vue
--   series_id   UUID            — ID de la série pour les récurrences modifiées
--   exdates     TEXT[]          — dates d'exclusion ISO (occurrences supprimées)
--   rdates      TEXT[]          — dates additionnelles ISO (occurrences ajoutées)
--
-- Colonnes existantes NON modifiées :
--   repeat, reminders, gDefault, colorId, cal, place, kind, members,
--   day, end_day, start_time, end_time, title, notes,
--   id, household_id, created_by, created_at

-- ─── 1. allday ────────────────────────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS allday BOOLEAN;

-- Backfill : allday = TRUE quand start_time IS NULL, FALSE sinon.
-- Les lignes déjà à NULL restent NULL jusqu'à la prochaine écriture (aucune contrainte).
UPDATE events
  SET allday = (start_time IS NULL)
  WHERE allday IS NULL;

-- ─── 2. rrule_json ────────────────────────────────────────────────────────────
-- Stocke le RruleObj V2 complet (byDay, endType, until, count, wkst, monthType…).
-- Prioritaire sur le champ `repeat` (legacy) dans les adaptateurs Phase 0+.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS rrule_json JSONB;

-- ─── 3. travel ────────────────────────────────────────────────────────────────
-- Minutes de trajet à prévoir avant l'événement (0 = pas de trajet, NULL = non renseigné).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS travel INTEGER
  CONSTRAINT events_travel_non_negative CHECK (travel IS NULL OR travel >= 0);

-- ─── 4. url ───────────────────────────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS url TEXT;

-- ─── 5. countdown ─────────────────────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS countdown BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 6. series_id ─────────────────────────────────────────────────────────────
-- UUID de la série pour les occurrences récurrentes modifiées individuellement.
-- Référence l'événement maître (même table) — FK optionnelle, activée Phase 1+.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS series_id UUID;

-- ─── 7. exdates ───────────────────────────────────────────────────────────────
-- Dates ISO 'YYYY-MM-DD' exclues d'une série (occurrences supprimées).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS exdates TEXT[];

-- ─── 8. rdates ────────────────────────────────────────────────────────────────
-- Dates ISO 'YYYY-MM-DD' ajoutées ponctuellement à une série (occurrences supplémentaires).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS rdates TEXT[];

-- ─── 9. Index ─────────────────────────────────────────────────────────────────
-- Index partiel sur series_id (NULL fréquent → partial index plus efficace).
CREATE INDEX IF NOT EXISTS idx_events_series_id
  ON events (series_id)
  WHERE series_id IS NOT NULL;

-- Index GIN sur rrule_json pour les requêtes par fréquence (ex. freq = 'WEEKLY').
CREATE INDEX IF NOT EXISTS idx_events_rrule_json
  ON events USING GIN (rrule_json)
  WHERE rrule_json IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (exécuter dans l'ordre pour annuler cette migration)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- DROP INDEX IF EXISTS idx_events_rrule_json;
-- DROP INDEX IF EXISTS idx_events_series_id;
-- ALTER TABLE events DROP COLUMN IF EXISTS rdates;
-- ALTER TABLE events DROP COLUMN IF EXISTS exdates;
-- ALTER TABLE events DROP COLUMN IF EXISTS series_id;
-- ALTER TABLE events DROP COLUMN IF EXISTS countdown;
-- ALTER TABLE events DROP COLUMN IF EXISTS url;
-- ALTER TABLE events DROP COLUMN IF EXISTS travel;
-- ALTER TABLE events DROP COLUMN IF EXISTS rrule_json;
-- ALTER TABLE events DROP COLUMN IF EXISTS allday;
-- ─────────────────────────────────────────────────────────────────────────────
