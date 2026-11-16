#!/usr/bin/env bash
# Serveur local pour essais déplacement repas — port 8765, sans déploiement.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f "$ROOT/demo-repas.html" ]]; then
  echo "ERREUR : demo-repas.html introuvable dans $ROOT"
  echo "Lancez ce script depuis le dossier du projet (celui qui contient demo-repas.html)."
  exit 1
fi
PORT="${PORT:-8765}"
if lsof -i :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $PORT déjà utilisé. Arrêt du serveur existant…"
  lsof -i :"$PORT" -sTCP:LISTEN -t | xargs kill 2>/dev/null || true
  sleep 0.5
fi
LAN="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "IP-LAN")"
echo "=============================================="
echo " Démo repas — NE PAS utiliser en production"
echo " Racine : $ROOT"
echo " Port   : $PORT"
echo " Mac    : http://127.0.0.1:${PORT}/demo-repas.html"
echo " iPhone : http://${LAN}:${PORT}/demo-repas.html"
echo " Cloud  : désactivé (?demo=repas ou session cm_demo_repas)"
echo "=============================================="
exec python3 -m http.server "$PORT" --bind 0.0.0.0