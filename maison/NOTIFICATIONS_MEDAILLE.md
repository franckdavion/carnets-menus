# Notifications médaille (regroupement 120 s)

## Comportement

1. **Consultation** : enregistrée tout de suite, **aucun push immédiat**.
2. **120 secondes** : une seule notification regroupe consultation, GPS, lieu manuel, signalement « retrouvé », coordonnées.
3. **Après l’envoi** : toute **nouvelle** position, signalement ou coordonnées → push **immédiat** (tag distinct + `renotify`).

## Planification serveur

- À **chaque** requête `animal-public` : `flushDueBundles` (sessions échues).
- **Chaque minute** (cron `maison-push-dispatch-minute`) : `maison-push-dispatch` appelle aussi `flushDueBundles` (page fermée, scan seul).

## Tester avec Bandy (sans spammer)

1. Ouvrir `https://carnets-menus.vercel.app/a/<token>` en navigation privée.
2. Attendre **2 min** sans interaction → notification « Médaille consultée ».
3. Réouvrir le lien, **Envoyer ma position** dans les 2 min → une seule notif regroupée.
4. Après la notif, renvoyer un lieu manuel → notif « Nouvelle position » immédiate.

**Dry-run** (pas de push) : en-tête `x-animal-dry-run: 1` ou variable `ANIMAL_PUSH_DISABLED=1`.

## Déploiement Edge Functions

Après modification de `animal-public` ou `_shared/pet-push.ts` :

```bash
cd maison
npx supabase functions deploy animal-public --project-ref cluqleqbbidozpioekog
npx supabase functions deploy maison-push-dispatch --project-ref cluqleqbbidozpioekog
```

Migration **0033** : table `pet_consult_sessions`, colonne `pet_events.session_id`.

## Limites iOS / Android

- Push Web PWA : titre + texte (~240 car.), pas de carte enrichie sur écran verrouillé.
- Livraison : souvent &lt; 1 min si `maison-push-dispatch` actif ; en secours, au prochain hit `animal-public`.
- Tags : bundle `pet-xxxxxxxx-bundle`, mises à jour `pet-xxxxxxxx-late-…` pour éviter d’écraser silencieusement.