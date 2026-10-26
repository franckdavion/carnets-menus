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

## Périmètre réellement opérationnel après configuration

- Abonnement Web Push individuel, désabonnement, réception en arrière-plan.
- Envoi automatique des rappels des **rendez-vous internes non récurrents** avec délai de 0 minute à 4 semaines, à partir de leur heure de début.
- Si l'événement est « toute la journée », l'heure de référence est 9 h (heure de Paris).
- Envoi aux membres du foyer concernés par l'événement.
- Les rendez-vous Google, répétitions, tâches, anniversaires, messages, courses, cloche d'historique, préférences individuelles et heures silencieuses ne sont **pas encore reliés à l'envoi**. Ils demandent une deuxième phase. Le bouton cloche ouvre actuellement les paramètres, pas un historique.
- Un rendez-vous en mode démo ne génère pas de notification serveur.
- L'envoi est au mieux une fois par membre et rappel. En cas d'échec transitoire, l'envoi n'est pas réessayé automatiquement.
- Aucun test réel de livraison Apple Push n'a été effectué : tester sur un iPhone après déploiement.

## Sécurité

Ne jamais publier la clé VAPID privée, le secret cron ou la clé service_role sur GitHub.
Les abonnements sont protégés par des politiques RLS par utilisateur.
