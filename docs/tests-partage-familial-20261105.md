# Vérifications du partage familial — Carnet de menus / Maisonnée

**Date :** 5 novembre 2026  
**Branche :** `test-securite-partage-familial-20261105`  
**Statut :** audit et préparation des tests. Aucune modification de la production.

## Objectifs

1. Les membres du foyer conservent leur Carnet commun synchronisé à Maisonnée.
2. Un proche extérieur utilise Carnet de menus de façon autonome : ses menus, courses, favoris et préférences restent à lui.
3. Les recettes autorisées peuvent être partagées sans partager les courses ni les menus de leur auteur.
4. Les changements de compte et les courses hors ligne ne mélangent jamais deux espaces.

## Constats tirés du code et des règles Supabase, sans modification

| Sujet | Contrôle |
| --- | --- |
| Carnet personnel / foyer | Le carnet relié au foyer vient de `shared_carnet_owner()`. Sans rattachement, `user_state` utilise l'ID du compte connecté. |
| Courses Maisonnée | Les règles RLS de `shopping_items` exigent l'appartenance au foyer. |
| Menus Carnet | Les règles RLS de `user_state` distinguent les données personnelles et celles du foyer. |
| Validation des comptes | Les colonnes `profiles.role` et `profiles.status` ne sont pas modifiables directement avec le rôle `authenticated`. |
| Recettes | La table des recettes communes est lisible par les comptes actifs, indépendamment du foyer. Une publication par lien est distincte. |
| Profils | Les comptes actifs peuvent consulter les profils. La table `profiles` ne contient pas de champ e-mail. |
| Rattachement | Le changement de Carnet rattaché à un foyer et les invitations nécessitent des tests d'autorisations supplémentaires. |
| Mode hors ligne | Le mode magasin de Maisonnée utilise une copie locale et des coches en attente de synchronisation. |

Les vérifications de structure ne remplacent pas les tests d'accès avec deux sessions authentifiées distinctes.

## Scénarios de test avant toute mise en production

Utiliser deux comptes de test sans données réelles : A (membre d'un foyer de test) et B (extérieur à ce foyer).

- [ ] A modifie un repas dans Carnet : la liste Maisonnée du même foyer se met à jour.
- [ ] A coche un article dans Maisonnée : Carnet reflète l'achat et conserve les quantités.
- [ ] B se connecte à Carnet sans appartenir au foyer de A : les menus et courses de A ne sont pas accessibles.
- [ ] B crée ses propres menus, courses, favoris et préférences : ils ne changent rien chez A.
- [ ] B essaie d'accéder directement aux ressources du foyer A : le serveur refuse, même en contournant l'interface.
- [ ] B consulte un carnet de recettes publié : les recettes prévues sont visibles, mais pas les achats et menus de A.
- [ ] Les comptes non validés ou bloqués ne récupèrent pas la base commune réservée aux comptes actifs.
- [ ] Un compte extérieur ne peut rejoindre un foyer qu'avec le mécanisme d'invitation prévu.
- [ ] Le rattachement du Carnet du foyer ne peut pas être changé par un utilisateur non autorisé.
- [ ] Une déconnexion puis connexion d'un autre compte sur le même téléphone n'affiche pas une ancienne liste privée.
- [ ] Deux appareils effectuent des achats simultanés : les coches ne se perdent pas.
- [ ] En mode avion, la liste déjà téléchargée reste disponible puis se synchronise correctement.

## Points à décider avant tout correctif

- Choisir entre une bibliothèque de recettes commune à **tous les comptes actifs** et un partage **sur invitation**.
- Définir qui est autorisé à rattacher ou détacher le Carnet d'un foyer.
- Prévoir la gestion des données locales lors d'un changement de compte sur le même appareil.
- Vérifier les alertes de sécurité Supabase et les fonctions privilégiées selon leur usage réel.

## Discipline de livraison

- Aucune modification directe de `main`.
- Aucun changement SQL sur Supabase de production avant validation et tests.
- Conserver le calcul des ingrédients, les états des repas, les historiques, les coches et la synchronisation.
- Ne pas mélanger avec la branche `test-refonte-recettes-photos-20261105`.
- Valider les tests sur deux comptes et les appareils avant toute fusion.
