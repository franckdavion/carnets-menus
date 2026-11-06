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


---

## Contrôles de non-régression du 6 novembre 2026

### Isolation de la branche `test`

`main` a reçu 85 commits supplémentaires avant la synchronisation de `test`. Les fichiers concernés étaient les données `agenda.json` / `carnet.json` et certains fichiers de Maisonnée (courses, accueil, fonds visuels, service worker). Aucune modification des trois fichiers Recettes repris sur `test` n'a été détectée dans cette période.

Une fusion **effectuée seulement sur `test`**, avec `main` comme deuxième parent, a reconstruit son contenu à partir de l'arbre de `main` puis appliqué uniquement les trois fichiers Recettes et ce rapport. GitHub a confirmé **0 commit de retard** de `test` par rapport au `main` examiné et quatre fichiers différents seulement :
`index.html`, `carnet.css`, `carnet-partage.js`, et le présent rapport.

### Recettes : contrôles exécutés

- Syntaxe du code `carnet-partage.js` et des scripts `carnet-base.js`, `carnet-semaine.js`, `carnet-courses.js`, `carnet-cloud.js`, `carnet-repas.js` : **OK**.
- Scripts JavaScript intégrés à `index.html` : syntaxe **OK**.
- Identifiants du nouvel écran : `recList`, `recActions`, `recWebPanel`, `findForm`, `q`, `favQuick`, `filtBtn` : chacun trouvé **une seule fois** ; aucun ID HTML dupliqué détecté.
- Boutons liés à leurs actions : `recLayout`, `recAll`, `recActionsClose`, `newRecipe`, `goFind`, `impOpen`, `impPaste`, `openReview`, `kindFav`, `openFilt` : **OK**.
- Sélecteurs CSS galerie/photos/menu Ajouter présents.
- Le rendu de la liste reconstruit le contenu du conteneur `#recList` sans en remplacer le nœud, ce qui permet de conserver la classe `rec-gallery`.
- Simulation isolée de `applyRecLayout()` : liste initiale, galerie, retour à la liste, persistance de l'option et attributs `aria-pressed` : **4 contrôles réussis**.

### Trajets : contrôles exécutés sur le code actuel de `main`

Les fonctions de sélection mensuelle ont été extraites du code officiel et exécutées avec des événements simulés, sans accès à Supabase ou Google :

- Seuls les déplacements déjà passés sont sélectionnables.
- La sélection multiple ne lance pas d'enregistrement.
- La validation par lot prépare seulement les trajets cochés.
- Chaque trajet traité est retiré de la sélection.
- En fin de lot, le reste du mois n'est pas comptabilisé.
- Changer de mois efface les sélections périmées et déclenche le rafraîchissement prévu.
- Une valeur de mois invalide est ignorée.
- Le filtre par enfant est appliqué.
- L'annulation de sélection remet le lot à zéro.

**Résultat : 11 assertions vérifiées, aucune erreur.** Cela ne prouve pas le fonctionnement du flux réel Google Agenda/Supabase.

### Limites et décisions

- Aucune navigation iPhone/Mac réelle n'a été exécutée et aucune opération de création/enregistrement sur les données du foyer n'a été testée.
- La branche Recettes historique n'est pas supprimée : la refonte de `test` doit encore être validée visuellement, notamment sur iPhone.
- Les branches Trajets, Agenda et Design restent intactes jusqu'aux validations correspondantes.
- **Aucune fusion vers `main`, aucun déploiement, aucune modification Supabase.**


---

## Validation navigateur Recettes — 6 novembre 2026

**Portée de la validation :** branche `test` uniquement ; 50 cartes de recettes de démonstration rendues dans un navigateur isolé, sans accès à Supabase ni aux données personnelles.

### Tests GitHub Actions

- Workflow dédié `.github/workflows/validation-recettes-test.yml` : seulement sur la branche `test`.
- Tests Node : syntaxe JavaScript, interface, calculs Recettes et Courses, dates, Présences, importation de recettes et pont entre Carnet de menus et Maisonnée : **tous réussis**.
- Tests interactifs Playwright : navigation Recettes, liste/galerie, mémorisation, favoris, recherche, bouton Toutes, menu Ajouter, import depuis Internet, formulaire de création, absence d'erreurs JavaScript : **tous réussis**.
- Contrôle du débordement horizontal : aucun, aux largeurs **320, 390, 820 et 1280 pixels**.
- Tests WebKit supplémentaires à 390 pixels pour approcher Safari sur iPhone : **réussis**.

| Moteur simulé | Taille | Résultat |
| --- | --- | --- |
| Chromium iPhone compact | 320 × 667 | OK |
| Chromium iPhone standard | 390 × 844 | OK |
| Chromium tablette | 820 × 1180 | OK |
| Chromium ordinateur | 1280 × 800 | OK |
| WebKit (proche Safari) iPhone | 390 × 844 | OK |

La dernière exécution complète est disponible à :
https://github.com/franckdavion/carnets-menus/actions/runs/42204804421

Captures des **cinq** scénarios (artefact GitHub à durée limitée) :
https://github.com/franckdavion/carnets-menus/actions/runs/42204804421/artifacts/13495987685

**Limites** : les navigateurs sont automatisés et n'utilisent pas de vrais comptes. Ils ne remplacent pas un contrôle tactile sur iPhone physique ni les tests de synchronisation avec les données du foyer.

**Garantie de non-publication :** aucun changement fonctionnel n'a été porté dans `main`. Le dernier rattrapage de `main` vers `test` a intégré uniquement des mises à jour de `agenda.json` et `carnet.json` déjà présentes sur `main`, en préservant la refonte Recettes sur `test` uniquement. Aucun appel à Supabase et aucune suppression de branche ancienne n'ont été effectués.
