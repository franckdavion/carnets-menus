# Maisonnée

Les tâches, l'agenda et les repas de la maison, partagés entre les membres du foyer.
Nouvelle version du Carnet de menus, dans son propre dossier : le Carnet continue de fonctionner à côté.

## Mise en route (une seule fois)

1. Ouvrir Supabase › SQL Editor › New query.
2. Coller tout le contenu de `supabase-foyer.sql`, puis Run.
3. Ouvrir l'appli : `https://franckdavion.github.io/carnets-menus/maison/`
4. Se connecter avec le compte du Carnet de menus, puis « Créer un foyer ».
5. Dans l'onglet Foyer, « Envoyer une invitation » aux autres membres.
6. Pour la messagerie et la carte : coller aussi `supabase-foyer-2.sql` (une seule fois).
7. Pour Anniversaires, Budget, Documents et Emploi du temps : coller `supabase-foyer-3.sql` (une seule fois).

Sans le script, le bouton « Essayer sans compte » permet de tout tester (les données restent sur le téléphone).

## Ce que contient l'appli

L'accueil affiche les tâches du jour puis une grille de modules (à personnaliser dans Explorer). En bas : Accueil, Messages, Explorer.

- **Anniversaires**, **Budget**, **Documents**, **Emploi du temps**, **Recettes** : nouveaux modules.

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
- `supabase-foyer.sql` : tables, règles d'accès et temps réel
- `supabase-foyer-2.sql` : messagerie et positions
- `supabase-foyer-3.sql` : anniversaires, budget, documents (stockage privé), emploi du temps
- `modules.js` : accueil en modules, Explorer, calendrier du mois et nouveaux modules
