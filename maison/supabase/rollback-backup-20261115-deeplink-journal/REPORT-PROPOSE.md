# Proposition locale (non déployée) — 2026-11-15

## Fichiers modifiés
- `supabase/migrations/0035_pet_journal_update_notifications.sql` (nouveau)
- `animaux.js`, `app.js`, `sw.js`
- `animaux-core.test.js`, `supabase/tests/run-pet-journal-rpc.mjs`

## Rollback
Restaurer les copies de ce dossier (`app.js`, `sw.js`, `animaux.js`).

## Déploiement suggéré (après tests iPhone)
1. SQL `0035` uniquement
2. Vercel : `app.js`, `animaux.js`, `sw.js` + bump cache `index.html` + CACHE sw

## Diagnostic iPhone
Safari console ou bookmarklet : `JSON.stringify(mzNavDiagRead(),null,2)`
Interprétation : pas de `sw_message`/`consume` → clic iOS/SW ; `consume` sans `journal_open_ok` → Maisonnée/session.