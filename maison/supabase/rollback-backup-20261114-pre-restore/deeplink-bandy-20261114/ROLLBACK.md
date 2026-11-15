# Rollback deep link Bandy (2026-11-14)

Sauvegardes avant déploiement :
- `animal-public-v17.ts`, `app.js`, `animaux.js`, `sw.js`

## Vercel
Restaurer les trois fichiers PWA depuis ce dossier, remettre les `?v=` d’avant dans `index.html`, republier.

## Supabase
```bash
cd maison
cp supabase/rollback-backup-20261114-pre-restore/deeplink-bandy-20261114/animal-public-v17.ts supabase/functions/animal-public/index.ts
npx supabase functions deploy animal-public --project-ref cluqleqbbidozpioekog --yes
```