# Maisonnée en appli iPhone (position en arrière-plan)

Cette coquille Capacitor ouvre la Maisonnée publiée sur GitHub Pages et y ajoute le GPS natif.
Le code web (repas, courses, tâches…) ne change pas : chaque mise à jour poussée sur GitHub
arrive dans l'appli sans recompiler.

## Ce qu'elle fait

- Quand « Partager ma position » est activé, le GPS de l'iPhone continue en arrière-plan
  et écran verrouillé (`natif.js`, plugin `@capacitor-community/background-geolocation`).
- Une position n'est envoyée à Supabase (`member_locations`) que si le membre s'est
  éloigné de **plus de 50 m** de sa dernière position enregistrée. Les relevés flous
  (précision > 100 m) sont ignorés.
- Aucune modification de la base Supabase n'est nécessaire (tables de `supabase-foyer-2.sql` et `-5.sql`).

Limite iOS : si quelqu'un ferme Maisonnée en la balayant vers le haut dans le sélecteur
d'applis, iOS arrête le suivi jusqu'à la prochaine ouverture. Le simple retour à l'écran
d'accueil ou le verrouillage ne l'arrêtent pas.

## Installation (une seule fois, sur le Mac)

Il faut : un Mac avec Xcode, Node.js 20 ou plus, et un identifiant Apple
(gratuit : appli valable 7 jours ; compte développeur 99 €/an : durable et TestFlight pour la famille).

```bash
git clone https://github.com/franckdavion/carnets-menus.git
cd carnets-menus/maison/natif
npm install
npm run preparer-ios     # crée le projet iOS + ajoute les réglages de position
npm run ouvrir           # ouvre Xcode
```

Dans Xcode :
1. Cliquer sur **App** (à gauche) › onglet **Signing & Capabilities** › **Team** : choisir votre identifiant Apple.
2. Brancher l'iPhone, le choisir en haut, puis ▶ (Run).
3. Sur l'iPhone, la première fois : Réglages › Général › VPN et gestion de l'appareil › faire confiance au développeur.

Dans l'appli : se connecter (la session de Safari n'est pas partagée), ouvrir **Localisation**,
activer « Partager ma position » et accepter. Quand iOS le propose, choisir **« Toujours autoriser »**
(ou Réglages › Maisonnée › Position › Toujours).

Après un `git pull` qui modifie ce dossier : `npm run maj`, puis ▶ dans Xcode.

## Bon à savoir

- Le lien avec Google Agenda se fait plutôt depuis Safari : Google refuse souvent ses
  connexions dans une appli intégrée. Les données restent visibles partout via Supabase.
- Les notifications de la PWA (Web Push) ne fonctionnent pas dans la coquille native.
- La PWA installée depuis Safari reste utilisable à côté ; elle garde le partage « appli ouverte ».
