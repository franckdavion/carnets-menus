#!/usr/bin/env bash
# Déploie la fonction Edge « tesla » sur le projet Maisonnée.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_REF="${SUPABASE_PROJECT_REF:-cluqleqbbidozpioekog}"
echo "Projet Supabase : $PROJECT_REF"
echo "Connexion (si besoin) : npx supabase login"
npx supabase functions deploy tesla --no-verify-jwt --project-ref "$PROJECT_REF"
echo "OK. Vérifiez : curl -s -o /dev/null -w '%{http_code}' https://${PROJECT_REF}.supabase.co/functions/v1/tesla/status"
