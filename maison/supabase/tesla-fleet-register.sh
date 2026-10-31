#!/usr/bin/env bash
# Enregistrement Fleet API Tesla (corrige HTTP 412 « Compte non enregistré »).
# À lancer une fois par région (eu et/ou na) après avoir publié la clé publique sur le domaine.
set -euo pipefail

REGION="${TESLA_REGION:-eu}"
DOMAIN="${TESLA_DOMAIN:-franckdavion.github.io}"
CLIENT_ID="${TESLA_CLIENT_ID:?Définissez TESLA_CLIENT_ID}"
CLIENT_SECRET="${TESLA_CLIENT_SECRET:?Définissez TESLA_CLIENT_SECRET}"

case "$REGION" in
  eu)
    AUDIENCE="https://fleet-api.prd.eu.vn.cloud.tesla.com"
    FLEET="https://fleet-api.prd.eu.vn.cloud.tesla.com"
    ;;
  na)
    AUDIENCE="https://fleet-api.prd.na.vn.cloud.tesla.com"
    FLEET="https://fleet-api.prd.na.vn.cloud.tesla.com"
    ;;
  *)
    echo "TESLA_REGION doit être eu ou na (actuel : $REGION)" >&2
    exit 1
    ;;
esac

DOMAIN="$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]')"
PUB_URL="https://${DOMAIN}/.well-known/appspecific/com.tesla.3p.public-key.pem"

echo "→ Vérification clé publique : $PUB_URL"
HTTP="$(curl -sS -o /tmp/tesla-pub.pem -w '%{http_code}' "$PUB_URL" || true)"
if [[ "$HTTP" != "200" ]]; then
  echo "Échec HTTP $HTTP — Tesla exige cette URL avant l'enregistrement." >&2
  echo "" >&2
  echo "Votre app Tesla a l'origine https://franckdavion.github.io → la clé doit être à la RACINE du site GitHub," >&2
  echo "pas sous /carnets-menus/." >&2
  echo "" >&2
  echo "1. Générez une paire de clés (une seule fois) :" >&2
  echo "   openssl ecparam -name prime256v1 -genkey -noout -out tesla-command-private.pem" >&2
  echo "   openssl ec -in tesla-command-private.pem -pubout -out com.tesla.3p.public-key.pem" >&2
  echo "2. Dans le dépôt GitHub « franckdavion.github.io », créez :" >&2
  echo "   .well-known/appspecific/com.tesla.3p.public-key.pem" >&2
  echo "   (copiez le contenu de com.tesla.3p.public-key.pem)" >&2
  echo "3. Gardez tesla-command-private.pem en secret (Supabase secret TESLA_COMMAND_PRIVATE_KEY plus tard)." >&2
  echo "4. Attendez 1–2 min après le push GitHub Pages, puis relancez ce script." >&2
  exit 1
fi
echo "   OK ($(wc -c </tmp/tesla-pub.pem | tr -d ' ') octets)"

echo "→ Jeton partenaire (client_credentials, région $REGION)…"
TOKEN_JSON="$(curl -sS --fail -X POST 'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "audience=$AUDIENCE" \
  --data-urlencode 'scope=openid vehicle_device_data vehicle_cmds vehicle_charging_cmds')"
PARTNER_TOKEN="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])' <<<"$TOKEN_JSON")"

echo "→ POST /api/1/partner_accounts (domain=$DOMAIN)…"
REG="$(curl -sS -w '\n%{http_code}' -X POST "$FLEET/api/1/partner_accounts" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "{\"domain\":\"$DOMAIN\"}")"
REG_BODY="$(sed '$d' <<<"$REG")"
REG_CODE="$(tail -n1 <<<"$REG")"
echo "   HTTP $REG_CODE — $REG_BODY"

echo "→ Vérification enregistrement…"
VERIFY="$(curl -sS -X GET "$FLEET/api/1/partner_accounts/public_key?domain=$DOMAIN" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -H 'Accept: application/json')"
echo "$VERIFY" | python3 -m json.tool 2>/dev/null || echo "$VERIFY"

echo ""
echo "Terminé. Réessayez « Choisir un véhicule » dans Maisonnée."
echo "Si vous utilisez aussi des comptes Tesla NA, relancez avec TESLA_REGION=na."
