# Maisonnée

Les tâches, l'agenda et les repas de la maison, partagés entre les membres du foyer.
Nouvelle version du Carnet de menus, dans son propre dossier : le Carnet continue de fonctionner à côté.

## Mise en route (une seule fois)

1. Ouvrir Supabase › SQL Editor › New query.
2. Coller tout le contenu de `supabase/migrations/0001_foyer.sql`, puis Run.
3. Ouvrir l'appli : `https://franckdavion.github.io/carnets-menus/maison/`
4. Se connecter avec le compte du Carnet de menus, puis « Créer un foyer ».
5. Dans l'onglet Foyer, « Envoyer une invitation » aux autres membres.
6. Pour la messagerie et la carte : coller aussi `supabase/migrations/0002_messages_positions.sql` (une seule fois).
7. Pour Anniversaires, Budget, Documents et Emploi du temps : coller `supabase/migrations/0003_anniversaires_budget_documents.sql` (une seule fois).
8. Pour la Galerie : coller `supabase/migrations/0004_galerie.sql` (une seule fois).
9. Pour relier le Carnet, Google Agenda et les adresses : coller `supabase/migrations/0005_carnet_google.sql` (une seule fois).

Sans le script, le bouton « Essayer sans compte » permet de tout tester (les données restent sur le téléphone).

Les scripts de `supabase/migrations` se collent dans l'ordre des numéros, chacun une seule fois. Une base déjà installée jusqu'aux présences n'a plus que deux scripts à coller : `0016_events_repeat_custom.sql` (répétition du type `custom:3:weeks`) et `0017_household_home.sql` (ville de la météo et disposition de l'accueil). Les fichiers `0006` à `0015` sont les anciennes étapes, déjà décrites dans `NOTIFICATIONS_INSTALLATION.md` pour les notifications.

## Ce que contient l'appli

L'accueil affiche les tâches du jour puis une grille de modules (à personnaliser dans Explorer). En bas : Accueil, Messages, Explorer.

- **Anniversaires**, **Budget**, **Documents**, **Emploi du temps**, **Recettes**, **Galerie** : nouveaux modules.

- **Aujourd'hui** : tâches du jour, repas du jour, agenda d'aujourd'hui et demain. La barre de couleurs montre qui a fait quoi.
- **Tâches** : tâches récurrentes (chaque jour, certains jours, tous les X jours, chaque mois), attribuées ou « chacun son tour », et le bilan des 7 derniers jours.
- **Agenda** : événements du foyer, avec les membres concernés et les répétitions.
- **Repas** : menu de la semaine partagé (livre de recettes du Carnet) et liste de courses commune.
- **Messages** : discussion commune du foyer.
- **Où sont-ils ?** (icône de position en haut) : chacun choisit de partager sa position ; elle se met à jour quand l'appli est ouverte.
- **Foyer** (prénoms en haut) : membres (avec ou sans compte), code d'invitation, couverts par repas.

Les modifications apparaissent en direct sur les téléphones des autres membres.

## Fichiers

- `index.html`, `app.js` : l'appli
- `sw.js`, `manifest.json`, `icon-*.png` : installation sur l'écran d'accueil
- `supabase/migrations/0001_foyer.sql` : tables, règles d'accès et temps réel
- `supabase/migrations/0002_messages_positions.sql` : messagerie et positions
- `supabase/migrations/0005_carnet_google.sql` : Carnet relié, identifiant Google, adresses des positions
- `pont.js` : chargé par le Carnet de menus, synchronise repas et courses avec le foyer
- `supabase/migrations/0004_galerie.sql` : galerie photo (stockage privé « household-photos »)
- `supabase/migrations/0003_anniversaires_budget_documents.sql` : anniversaires, budget, documents (stockage privé), emploi du temps
- `modules.js` : accueil en modules, Explorer, calendrier du mois et nouveaux modules
- `natif.js`, `natif/` : appli iPhone (Capacitor) qui partage la position en arrière-plan, envoyée seulement après un déplacement de plus de 50 m (voir `natif/LISEZMOI.md`)

## Carnet de menus relié

Dans Maisonnée › Ma famille › « Relier mon Carnet ». Ensuite, chaque fois que le Carnet est ouvert sur ce compte :
- les repas (semaine passée → 4 semaines devant) sont synchronisés dans les deux sens ;
- les ingrédients des repas validés du Carnet apparaissent dans Courses, et les coches vont dans les deux sens ;
- les articles ajoutés à la main (« En plus » dans le Carnet) vont dans les deux sens.
Si un repas a changé des deux côtés, c'est la version du Carnet qui l'emporte.
Le Carnet a un bouton « 🏠 Maisonnée » en haut pour revenir.

## Agenda Google : créer l'identifiant (une seule fois, gratuit)

1. Aller sur https://console.cloud.google.com et créer un projet (ex. « Maisonnée »).
2. « API et services » › « Bibliothèque » : chercher **Google Calendar API** › Activer.
3. « Écran de consentement OAuth » (ou « Google Auth Platform ») : type **Externe**, nom « Maisonnée », votre e-mail.
   Dans « Audience » / « Utilisateurs test », ajouter les adresses Gmail qui se connecteront (vous, Christine…).
4. « Identifiants » › « Créer des identifiants » › **ID client OAuth** › type **Application Web** :
   - Origines JavaScript autorisées : `https://franckdavion.github.io`
   - URI de redirection autorisés : `https://franckdavion.github.io/carnets-menus/maison/`
5. Copier l'**ID client** (il finit par `.apps.googleusercontent.com`) et le coller dans Maisonnée › Ma famille › Agenda Google.

Chacun connecte ensuite son propre agenda sur son téléphone (lecture seule) : les événements Google ne sont visibles que sur ce téléphone.
« Importer mes anniversaires » copie les anniversaires Google dans le module Anniversaires, partagé avec le foyer.

## Présences des enfants (étape 14)

1. Coller `supabase/migrations/0015_presences.sql` dans Supabase › SQL Editor › Run (crée 5 tables réservées aux membres du foyer).
2. Ouvrir la tuile **Présences**, onglet **Enfants** : ajouter les enfants (permanent / relais, périodes), choisir les agendas Google à analyser.
3. Les présences se calculent depuis Google Agenda (lecture seule) ; une case touchée se corrige à la main.
4. Tests, depuis la racine du projet : `node maison/tests/presences.test.js`, `node maison/tests/cal.test.mjs`, `node maison/tests/robot.test.mjs`, `node maison/tests/carnet.test.mjs`, `node maison/tests/pont.test.mjs`, puis `node maison/supabase/verifier.mjs`.
Les relevés PDF et Excel sont fabriqués sur le téléphone, sans bibliothèque ni service externe.
