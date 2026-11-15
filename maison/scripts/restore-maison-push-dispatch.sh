#!/usr/bin/env bash
# Restaure maison-push-dispatch depuis les sources locales (CLI uniquement).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="cluqleqbbidozpioekog"
IDX="$ROOT/supabase/functions/maison-push-dispatch/index.ts"

echo "=== Pré-vol local ==="
test -f "$IDX" || { echo "index.ts introuvable" >&2; exit 1; }
BYTES=$(wc -c < "$IDX" | tr -d ' ')
echo "index.ts: ${BYTES} octets"
test "$BYTES" -gt 20000 || { echo "index.ts trop petit (attendu > 20k)" >&2; exit 1; }
grep -q 'async function syncTasks' "$IDX" || { echo "syncTasks manquant" >&2; exit 1; }
grep -q 'flushDueBundles' "$IDX" || { echo "flushDueBundles manquant" >&2; exit 1; }
grep -q '2b2. Médailles' "$IDX" || { echo "bloc médailles manquant" >&2; exit 1; }
if grep -qi 'PLACEHOLDER' "$ROOT/supabase/functions/maison-push-dispatch" "$ROOT/supabase/functions/_shared/cors.ts" \
  "$ROOT/supabase/functions/_shared/pet-push.ts" "$ROOT/supabase/functions/_shared/pet-notify-core.js" \
  "$ROOT/supabase/functions/_shared/cal.js" 2>/dev/null; then
  echo "Refus: PLACEHOLDER dans les sources." >&2
  exit 1
fi
echo "OK — sources complètes, sans PLACEHOLDER."

if ! npx supabase projects list --project-ref "$REF" >/dev/null 2>&1; then
  echo "Connexion requise. Dans CE terminal (intégré Cursor) :" >&2
  echo "  cd $ROOT && npx supabase login" >&2
  exit 1
fi

echo "=== Déploiement maison-push-dispatch ==="
cd "$ROOT"
npx supabase functions deploy maison-push-dispatch --project-ref "$REF"

echo "=== Versions distantes ==="
npx supabase functions list --project-ref "$REF" -o json | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
const f=(Array.isArray(d)?d:d.functions||[]).find(x=>(x.slug||x.name)==='maison-push-dispatch');
if(!f){console.error('fonction introuvable dans la liste');process.exit(1);}
console.log('slug:', f.slug||f.name);
console.log('version:', f.version);
console.log('verify_jwt:', f.verify_jwt);
"

VERIFY_WD=$(mktemp -d)
trap 'rm -rf "$VERIFY_WD"' EXIT
mkdir -p "$VERIFY_WD/supabase"
if test -f "$ROOT/supabase/config.toml"; then
  cp "$ROOT/supabase/config.toml" "$VERIFY_WD/supabase/config.toml"
fi

echo "=== Post-vol (téléchargement API, hors dossier projet) ==="
cd "$VERIFY_WD"
npx supabase functions download maison-push-dispatch --remote "$REF" --use-api --yes --workdir "$VERIFY_WD"
REMOTE_IDX="$VERIFY_WD/supabase/functions/maison-push-dispatch/index.ts"
test -f "$REMOTE_IDX" || { echo "téléchargement index.ts échoué" >&2; exit 1; }
RB=$(wc -c < "$REMOTE_IDX" | tr -d ' ')
echo "index.ts distant: ${RB} octets"
grep -q 'async function syncTasks' "$REMOTE_IDX" || { echo "syncTasks absent en prod" >&2; exit 1; }
grep -q 'flushDueBundles' "$REMOTE_IDX" || { echo "flushDueBundles absent en prod" >&2; exit 1; }
if grep -qi 'PLACEHOLDER' "$REMOTE_IDX"; then
  echo "ÉCHEC: PLACEHOLDER encore présent en prod." >&2
  exit 1
fi
echo "OK — maison-push-dispatch restaurée et vérifiée (pas de placeholder)."