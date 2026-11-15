#!/usr/bin/env bash
# Rollback animal-public + maison-push-dispatch (pré-120 s). CLI uniquement.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="cluqleqbbidozpioekog"
ANIMAL="$ROOT/supabase/functions/animal-public/index.ts"
PUSH="$ROOT/supabase/functions/maison-push-dispatch/index.ts"

preflight() {
  local f="$1" label="$2" min_bytes="$3"
  test -f "$f" || { echo "$label: fichier absent" >&2; exit 1; }
  local b=$(wc -c < "$f" | tr -d ' ')
  echo "$label: ${b} octets"
  test "$b" -ge "$min_bytes" || { echo "$label trop petit" >&2; exit 1; }
  if grep -qi 'PLACEHOLDER' "$f"; then echo "PLACEHOLDER dans $label" >&2; exit 1; fi
}

echo "=== Pré-vol local (rollback) ==="
preflight "$ANIMAL" "animal-public" 10000
grep -q 'notifyHousehold' "$ANIMAL" || { echo "animal-public: notifyHousehold manquant" >&2; exit 1; }
! grep -q 'pet_consult_sessions' "$ANIMAL" || { echo "animal-public: encore le mode 120 s" >&2; exit 1; }
! grep -q 'flushDueBundles' "$ANIMAL" || { echo "animal-public: flushDueBundles interdit" >&2; exit 1; }

preflight "$PUSH" "maison-push-dispatch" 20000
grep -q 'async function syncTasks' "$PUSH" || { echo "maison-push-dispatch: syncTasks manquant" >&2; exit 1; }
! grep -q 'flushDueBundles' "$PUSH" || { echo "maison-push-dispatch: bloc 120 s encore présent" >&2; exit 1; }

if ! npx supabase projects list -o json 2>/dev/null | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); const ok=Array.isArray(d)&&d.some(p=>(p.ref||p.id)==='${REF}'); process.exit(ok?0:1)"; then
  echo "Connexion requise (terminal intégré Cursor) :" >&2
  echo "  cd $ROOT && npx supabase login" >&2
  exit 1
fi

cd "$ROOT"
echo "=== 1/2 Déploiement animal-public ==="
npx supabase functions deploy animal-public --project-ref "$REF"

echo "=== Test sec animal-public (dry-run, sans push famille) ==="
ANON="${SUPABASE_PUBLISHABLE_KEY:-}"
if test -z "$ANON" && test -f "$ROOT/../.env.local"; then
  ANON=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=|^SUPABASE_ANON_KEY=' "$ROOT/../.env.local" | head -1 | cut -d= -f2- | tr -d '"' || true)
fi
if test -n "${BANDY_MEDAL_TOKEN:-}" && test -n "$ANON"; then
  code=$(curl -sS -m 45 -o /tmp/animal-dry-run.json -w "%{http_code}" -X POST \
    "https://${REF}.supabase.co/functions/v1/animal-public" \
    -H "Content-Type: application/json" -H "apikey: $ANON" \
    -H "User-Agent: Mozilla/5.0 (Macintosh)" -H "x-animal-dry-run: 1" \
    -d "{\"token\":\"$BANDY_MEDAL_TOKEN\",\"action\":\"view\"}") || code="000"
  echo "HTTP $code"
  head -c 400 /tmp/animal-dry-run.json; echo
  test "$code" = "200" || { echo "animal-public: test dry-run échoué" >&2; exit 1; }
else
  echo "(Passez BANDY_MEDAL_TOKEN + clé anon pour test auto; sinon testez le QR à la main.)"
fi

echo "=== 2/2 Déploiement maison-push-dispatch ==="
npx supabase functions deploy maison-push-dispatch --project-ref "$REF"

echo "=== Versions distantes ==="
npx supabase functions list --project-ref "$REF" -o json | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
const rows=(Array.isArray(d)?d:d.functions||[]).filter(x=>['animal-public','maison-push-dispatch'].includes(x.slug||x.name));
for (const f of rows) console.log((f.slug||f.name)+': v'+f.version+' verify_jwt='+f.verify_jwt);
"

echo "OK — rollback déployé. Vérifiez le dashboard Supabase (contenu des fichiers, pas de PLACEHOLDER)."