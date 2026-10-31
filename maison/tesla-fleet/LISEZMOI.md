# Tesla Fleet API — erreur 412 « Compte non enregistré »

OAuth Tesla fonctionne, mais la **liste des véhicules** exige que l’application soit **enregistrée** auprès de la Fleet API (une fois par région : Europe, Amérique du Nord).

## 1. Clé publique sur le domaine Tesla

Sur [developer.tesla.com](https://developer.tesla.com), l’**origine autorisée** est en général :

`https://franckdavion.github.io`

Tesla vérifie cette URL (racine du domaine, pas le sous-dossier `/carnets-menus/`) :

`https://franckdavion.github.io/.well-known/appspecific/com.tesla.3p.public-key.pem`

### Générer la paire de clés (sur votre Mac)

```bash
cd maison/tesla-fleet
openssl ecparam -name prime256v1 -genkey -noout -out tesla-command-private.pem
openssl ec -in tesla-command-private.pem -pubout -out com.tesla.3p.public-key.pem
```

- **Ne commitez jamais** `tesla-command-private.pem` (commandes véhicule plus tard).
- Publiez **uniquement** le fichier public.

### Où héberger le fichier public

GitHub Pages sert `https://franckdavion.github.io/…` depuis le dépôt utilisateur **`franckdavion.github.io`** (pas depuis `carnets-menus` seul).

Dans ce dépôt, créez :

`.well-known/appspecific/com.tesla.3p.public-key.pem`

(copie du contenu de `com.tesla.3p.public-key.pem`), commit + push, attendez 1–2 minutes.

Vérification :

```bash
curl -sI "https://franckdavion.github.io/.well-known/appspecific/com.tesla.3p.public-key.pem" | head -1
# HTTP/2 200
```

## 2. Appeler l’endpoint « register »

Depuis le dossier `maison/` :

```bash
export TESLA_CLIENT_ID='…'
export TESLA_CLIENT_SECRET='…'
export TESLA_DOMAIN='franckdavion.github.io'
export TESLA_REGION='eu'
bash supabase/tesla-fleet-register.sh
```

Le script utilise un **jeton partenaire** (`grant_type=client_credentials`), pas le jeton utilisateur OAuth.

## 3. Retester Maisonnée

Domotique › ⚙️ › **Choisir un véhicule**. Le message 412 doit disparaître si la clé est en ligne et l’enregistrement EU a réussi.

## Rappels

- **Facturation** Fleet API sur developer.tesla.com (402 si non activée).
- **Région** du compte Tesla = Europe lors du lien OAuth (421 si mauvaise région).
- Enregistrement **EU et NA** sont distincts si vous ciblez les deux.
