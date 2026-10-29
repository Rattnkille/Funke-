#!/usr/bin/env bash
# FUNKE lokal starten: prüft Node und pnpm, richtet alles ein und startet die App.
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ Prüfe Node.js …"
if ! command -v node >/dev/null 2>&1; then
  echo "✘ Node.js fehlt. Bitte Node 22 (LTS) installieren: https://nodejs.org/de/download"
  exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "✘ Node $(node -v) ist zu alt. Bitte Node 22 oder neuer installieren: https://nodejs.org/de/download"
  exit 1
fi
echo "✔ Node $(node -v)"

echo "▶ Prüfe pnpm …"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "  pnpm fehlt, aktiviere es über corepack (gehört zu Node) …"
  corepack enable || { echo "✘ Bitte einmal ausführen: sudo corepack enable  (oder: npm install -g pnpm)"; exit 1; }
fi
echo "✔ pnpm $(pnpm -v)"

echo "▶ Installiere Pakete …"
pnpm install
pnpm env:init
pnpm db:migrate

if [ ! -f data/.demo-angelegt ]; then
  echo "▶ Lege fiktive Demo-Daten an …"
  pnpm db:seed
  touch data/.demo-angelegt
fi

echo "▶ Baue die App …"
pnpm build
echo ""
echo "✔ Fertig. Öffne http://localhost:3000 im Browser (Stopp: Strg+C)."
pnpm start
