# Inventaire de nettoyage des branches GitHub — 5 novembre 2026

**Dépôt :** `franckdavion/carnets-menus`  
**Base contrôlée :** `main` au commit `0b36c98da03463ce945a1fb40f707db1c915dc32` (5 novembre 2026, 20:04 UTC).  
**État au contrôle :** 28 branches = 1 `main` + 10 entièrement contenues dans `main` + 17 branches divergentes.  
**Aucune suppression ni fusion exécutée.**

## 1. Dix branches intégralement contenues dans `main` — suppression possible

Elles ont toutes **0 commit d'avance** sur `main` dans la comparaison GitHub. Leur suppression ne retire donc aucun de leurs commits de `main`.

- `correctif-rafraichissement-trajets-20261105`
- `publication-presences-trajets-20261105`
- `sauvegarde-avant-correctif-sync-trajets-20261105`
- `sauvegarde-avant-courses-hors-ligne-20261105`
- `sauvegarde-avant-publication-maisonnee-2026-11-04`
- `sauvegarde-avant-publication-repas-google-20261105`
- `sauvegarde-avant-trajets-20261105`
- `sauvegarde-main-avant-publication-v1-20261104`
- `sauvegarde-main-avant-v1-20261104`
- `test-agenda-mois-repliable-20261104`

Avant suppression effective, revérifier qu'elles ont toujours 0 commit d'avance au moment de l'opération.

## 2. Dix-sept branches divergentes — conserver en attendant un contrôle de contenu

Ces branches contiennent des commits absents de l'historique de `main`. **Ne pas les supprimer en lot** : certains essais sont peut-être abandonnés, mais d'autres correspondent à des travaux en cours.

| Branche | Commits en avance sur main | Commit de tête au contrôle |
| --- | ---: | --- |
| `correctif/smartthings-jeton-et-diagnostic-20261104` | 7 | `6a9bd0a8a0a180e3b1d72d70f034ac744012c3e4` |
| `correctif-cors-iphone-local-domotique-v4` | 13 | `09a9a1082b6a4089e4495934d3cc159497244b98` |
| `design-c-ultra-premium-accueil-explorer` | 1 | `581933e071b2fbbf4084317fafe4964492eb5dd6` |
| `online-preview-maisonnee-agenda-20261104` | 4 | `27f6bb2ce3bcef2b3303cd5dcf6d7ed24fda263e` |
| `test-agenda-plus-google-style-20261104` | 14 | `3986607192a2da4c5e6ec5422b84fbc5dfbba361` |
| `test-design-c-meteo-fiable-20261104` | 3 | `660ff2d603c95e315cab581bf9927306e3544a3e` |
| `test-design-cplus-ultra-premium-v2` | 5 | `9d32a63be214de62e97fac3236b8805110c78cba` |
| `test-design-cplus-v3-contours-rotatifs` | 7 | `5b3008439a8979172f35747204b00e6e32288a36` |
| `test-design-cplus-v4-miroir-lumineux` | 9 | `9ea7d5a13144b6ba139cf1a7beb282a987c18eba` |
| `test-presences-trajets-20261105` | 12 | `ac86afcf1d186ec2935ac47cbb5b3ac220e9d4b2` |
| `test-presences-trajets-antidoublons-20261105` | 15 | `0d81b11ace6d7e81181cdeb2c16bbf47315f095a` |
| `test-presences-trajets-exclusions-20261105` | 26 | `79388ac3bec25881a53cd74a34cc0c10a5b3a512` |
| `test-presences-trajets-groupes-20261105` | 19 | `ef8a406418d52d2215415773aea1aa4043041d20` |
| `test-refonte-recettes-photos-20261105` | 8 | `06218c3c769d833779af2821ec07fc58b7fcbbeb` |
| `test-securite-partage-familial-20261105` | 1 | `c5b63243de7bde3cc67a59f32e74a70fe0d1149c` (avant cet inventaire) |
| `test-selection-mensuelle-trajets-20261105` | 9 | `6eb18be2ca3dae1ffe48b977d411e09b943af812` |
| `test-synchro-repas-agenda-20261105` | 10 | `c50774522dab83e2d02e695d3349a9db556aa44d` |

**Travaux à préserver en priorité :** refonte Recettes (essais iPhone en attente), choix mensuel des Trajets, audit de séparation des comptes. Plusieurs branches des Trajets peuvent constituer des étapes historiques d'une même évolution ; vérifier le résultat final avant de juger une branche inutile.

## 3. Méthode de consolidation recommandée

1. Conserver `main` comme source unique de production.
2. Supprimer d'abord les dix branches entièrement contenues dans `main`, après contrôle final.
3. Examiner les branches divergentes par fonctionnalité : vérifier si leur résultat utile est déjà présent sur `main` ou doit être repris/testé.
4. Préserver les travaux non validés dans une unique branche de test **une fois leurs changements rassemblés sans conflit**.
5. Après validation sur iPhone et Mac, fusionner le travail validé dans `main` puis supprimer les branches de chantier devenues inutiles.
6. Viser à terme deux branches : `main` et `test`. Ne pas créer de nouvelles branches provisoires sans nécessité.

**Attention :** conserver seulement un SHA dans ce document ne garantit pas la récupération de commits inaccessibles indéfiniment. Ne pas supprimer une branche divergente avant d'avoir intégré/archivé son contenu utile.

## 4. Garde-fous

- Aucun changement au code de l'application ou à Supabase pendant l'inventaire.
- Ne jamais réinitialiser de force `main`.
- Ne pas fusionner plusieurs versions de Trajets ou de CSS sans tests de régression.
- Ne pas confondre `0 commit en avance` avec `0 différence visuelle` pour les branches divergentes.
- Préserver les réglages, l'historique des achats et le mode hors ligne.
