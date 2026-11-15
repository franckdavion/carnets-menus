#!/usr/bin/env bash
# Déploie animal-public + maison-push-dispatch (vérifie qu'il n'y a pas de PLACEHOLDER).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="cluqleqbbidozpioekog"

if grep -r 'PLACEHOLDER' supabase/functions/animal-public supabase/functions/maison-push-dispatch supabase/functions/_shared/cors.ts supabase/functions/_shared/pet-push.ts supabase/functions/_shared/pet-notify-core.js supabase/functions/_shared/cal.js 2>/dev/null; then
  echo "Refus: PLACEHOLDER détecté dans les sources." >&2
  exit 1
fi

if ! npx supabase projects list >/dev/null 2>&1; then
  echo "Connexion requise: lancez « npx supabase login » dans CE terminal (navigateur)." >&2
  exit 1
fi

npx supabase functions deploy animal-public --project-ref "$REF"
npx supabase functions deploy maison-push-dispatch --project-ref "$REF"
echo "OK. Vérifiez les versions dans le dashboard Supabase."