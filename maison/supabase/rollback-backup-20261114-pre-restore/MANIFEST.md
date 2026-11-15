# Sauvegarde avant rollback notifications — 2026-11-14

## Prod constatée (lecture seule)

| Fonction | Version | Statut |
|----------|---------|--------|
| `animal-public` | v14 | Code 120 s (`pet_consult_sessions`, `flushDueBundles`) — timeouts HTTP 504 observés |
| `maison-push-dispatch` | v30 | `// PLACEHOLDER` uniquement (cassé) |

## Sources restaurées (cible de déploiement)

| Fichier | Origine | Octets | Notes |
|---------|---------|--------|-------|
| `animal-public/index.ts` | Checkpoint Cursor stable matinée + `finderOf` | ~12 k | `notifyHousehold` + webpush direct, pas de regroupement 120 s |
| `maison-push-dispatch/index.ts` | `git HEAD` (`main`, commit `a0271f8`) | 23182 | Agenda, messages, courses, Google tâches — **sans** bloc `2b2` médailles |

## Dossier `animal-public/index.ts` / `maison-push-dispatch/index.ts` (avant restore)

Copies expérimentales 120 s : 13911 et 24132 octets.

## Retour arrière

Recopier depuis ce dossier vers `supabase/functions/` puis redéployer via CLI.