# Notifications Maisonnée — installation (étape 1)

Cette mise à jour ajoute une interface « Notifications » (cloche en haut), l'abonnement Web Push et la réception de notifications iPhone lorsque Maisonnée est fermée.

## À faire AVANT de tester

1. Dans Supabase > SQL Editor, exécuter `maison/notifications-supabase.sql`.
2. Exécuter `maison/supabase-foyer-6.sql` : il crée les colonnes `events.kind` et `events.reminders` (et la table des jetons Google) s'ils n'existent pas encore.
3. Générer une paire de clés VAPID avec `npx web-push generate-vapid-keys` (Node.js requis). Conserver la clé privée secrète.
4. Coller UNIQUEMENT la clé PUBLIQUE dans `maison/push-config.js`.
5. Dans Supabase Edge Functions, déployer `maison/supabase/functions/maison-push-dispatch/index.ts` sous le nom `maison-push-dispatch`. Désactiver la vérification JWT pour CETTE fonction : elle contrôle elle-même un secret fort via `x-cron-secret`.
6. Configurer les secrets de la fonction : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (ex. `mailto:adresse@exemple.fr`), `CRON_SECRET` (chaîne aléatoire longue). Les secrets `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` doivent aussi être accessibles côté serveur. Ne JAMAIS les placer dans le site GitHub.
7. Programmer un appel POST à l'URL de la fonction **chaque minute**, avec le header `x-cron-secret: <CRON_SECRET>` (Supabase Cron + pg_net, ou autre planificateur). Un simple déploiement de la fonction ne programme pas les rappels.
8. Mettre à jour GitHub Pages avec les fichiers modifiés et nouveaux du dossier `maison/`.
9. Sur chaque iPhone : ouvrir Maisonnée depuis son icône sur l'écran d'accueil, se connecter, appuyer sur la cloche, puis « Activer sur cet iPhone ». Accepter la demande iOS.

## Ce qui est notifié (fonction maison-push-dispatch)

- **Rappels des rendez-vous Maisonnée**, simples ou répétés, de 0 minute à 4 semaines avant (9 h pour un rendez-vous « toute la journée »), aux membres concernés.
- **Nouveaux messages** du foyer, à tous sauf l'auteur, dans la minute.
- **Résumé du matin**, à l'heure choisie par chacun : tâches du jour (les siennes et celles de « n'importe qui »), agenda Maisonnée du jour, repas du soir, anniversaires du jour, documents qui expirent aujourd'hui, dans 7 ou 30 jours.
- **Anniversaires** : la veille à 19 h.
- Chacun choisit ce qu'il reçoit dans la cloche 🔔 (table `maison_push_prefs`, script `supabase-foyer-10.sql`).
- Les rendez-vous enregistrés dans **Google Agenda** sont rappelés par Google Agenda lui-même.

## Tâches dans Google Agenda, appli fermée (même fonction)

Toutes les 5 minutes, `maison-push-dispatch` recopie les tâches des foyers qui l'ont activé (Ma famille › « Tâches dans Google Agenda ») dans l'agenda choisi, avec le compte Google de la personne qui l'a activé.

1. Coller `maison/supabase-foyer-11.sql` dans le SQL Editor (colonne `households.google_tasks`).
2. Redéployer `maison-push-dispatch` avec le nouveau `index.ts`.
3. Les secrets `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` (déjà créés pour la fonction `google-calendar`) servent aussi ici : rien à ajouter.
4. Dans Ma famille, désactiver puis réactiver « Mettre les tâches dans Google Agenda » une fois. La ligne « Appli fermée » indique le dernier passage du serveur.

## Sécurité

Ne jamais publier la clé VAPID privée, le secret cron ou la clé service_role sur GitHub.
Les abonnements sont protégés par des politiques RLS par utilisateur.
