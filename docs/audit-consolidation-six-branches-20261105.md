# Consolidation des six branches historiques — audit en lecture seule

**Date :** 5 novembre 2026  
**État de référence :** `main` et `test` identiques au début de cet audit, commit `d42b1fc0191778b38446df7fa989ec36ecca0f9c`.  
**Portée :** six anciennes branches. Aucun transfert de code, aucune suppression de branche, aucune modification de `main` ou de Supabase.

Ce document est déposé **uniquement sur `test`** pour que les vérifications restent accessibles sans mettre en production des changements non validés.

## Résultats par chantier

| Branche | Commit examiné | Résultat du contrôle | Décision conservatoire |
| --- | --- | --- | --- |
| `design-c-ultra-premium-accueil-explorer` | `581933e071b2fbbf4084317fafe4964492eb5dd6` | Un commit ancien de CSS Design C ; 37 des 71 lignes ajoutées ne figurent pas à l'identique dans le CSS actuel. Le CSS de `main` contient le design ultérieur C+ V4. | Ne pas réimporter l'ancien CSS ; attendre la validation du visuel actuel avant suppression |
| `online-preview-maisonnee-agenda-20261104` | `27f6bb2ce3bcef2b3303cd5dcf6d7ed24fda263e` | Quatre fichiers `maison/essai-*`. Environ 99 % des lignes utiles de `essai-app.js` et 98 % de `essai-modules.js` apparaissent déjà dans leurs versions actuelles de `main`, mais les fichiers ne sont pas identiques. | Conserver jusqu'au contrôle du comportement de la prévisualisation Agenda |
| `test-agenda-plus-google-style-20261104` | `3986607192a2da4c5e6ec5422b84fbc5dfbba361` | Le bouton `+`, `calCreateTask` et les champs `due_time` / `deadline_on` sont présents dans `maison/app.js` sur `main`. Le fichier SQL `0028_tasks_schedule.sql` de l'ancienne branche n'est pas présent sous ce chemin dans `main`, et plusieurs différences d'interface et de fonction Google subsistent. | Conserver ; vérifier le schéma réellement déployé et les parcours de tâches avant consolidation |
| `test-presences-trajets-exclusions-20261105` | `79388ac3bec25881a53cd74a34cc0c10a5b3a512` | Les migrations `0016` à `0019` ont des empreintes identiques sur `main`, mais certains anciens traitements d'événements, de lieux et d'affichage ont été remplacés par des versions plus récentes. | Conserver jusqu'aux tests de non-régression des exclusions et doublons |
| `test-refonte-recettes-photos-20261105` | `06218c3c769d833779af2821ec07fc58b7fcbbeb` | Modifications propres : galerie compacte, photos 3:2, menu « Ajouter », fermeture du menu sur iOS. Les sélecteurs `rec-gallery` et `recActions` sont absents des fichiers officiels vérifiés. | **Conserver impérativement** et prévoir une intégration minimale sur `test` puis essais iPhone/Mac, sans fusion de la branche entière |
| `test-selection-mensuelle-trajets-20261105` | `6eb18be2ca3dae1ffe48b977d411e09b943af812` | Les 67 lignes de styles Trajets V2 de l'ancienne branche sont déjà reprises dans `maison/trajets-v2.css` sur `main` (seul le commentaire d'en-tête diffère). Le JS officiel inclut le nouveau traitement des communes Google et une interface plus récente. | Conserver jusqu'à vérification fonctionnelle de la sélection mensuelle et du rafraîchissement des trajets |

## Vérifications effectuées

- Liste actuelle des branches et des SHA consultée directement sur GitHub.
- Comparaisons `main...branche` : **six branches divergentes avec des commits non encore présents dans l'historique de `main`**. Une similitude du code ne signifie pas fusion Git.
- Comparaison des patches par rapport à l'ancêtre commun, recherche des lignes ajoutées dans les fichiers officiels.
- Comparaison du CSS Trajets V2 avec son nouvel emplacement dans `main`.
- Vérification des éléments Agenda présents dans `maison/app.js` et de l'absence du fichier de migration nommé `0028_tasks_schedule.sql` sous ce chemin.
- Aucune requête ni mutation de la base de données.

## Priorités pour la reprise

1. **Recettes** : identifier précisément les trois fichiers à adapter sur `test` en préservant le fonctionnement Carnet/Maisonnée, puis faire valider la galerie et le menu Ajouter.
2. **Trajets** : vérifier mensuellement les sélections, doublons, exclusions et changements d'événement sur la version officielle ; ne pas réinstaller l'ancien code.
3. **Agenda** : tester une tâche, une échéance et un rendez-vous dans un foyer de test ; confirmer les colonnes et règles SQL avant toute conclusion.
4. **Design C et prévisualisation** : ne nettoyer les deux branches historiques qu'après avoir confirmé que les styles et comportements conservés suffisent.

## Garde-fous

- `main` doit rester inchangée tant qu'une nouvelle mise en production n'a pas été expressément validée.
- Ne pas fusionner les anciennes branches en bloc : leurs bases sont anciennes et `main` a évolué.
- Préserver les fonctions existantes (repas, courses hors ligne, agenda, Shelly, Dreame, Mitsubishi, SmartThings).
- Ne supprimer aucune branche divergente uniquement sur un pourcentage de lignes similaires : exiger un contrôle métier, une conservation des modifications utiles et des tests.
- L'option de suppression automatique GitHub après fusion ne vaut pas autorisation d'une nouvelle fusion vers `main`.
