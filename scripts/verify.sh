#!/usr/bin/env bash
# Bündelt alle reproduzierbaren Prüfungen. Endet bei jedem Fehler mit einem Code ungleich 0.
# Nutzt ausschließlich Wegwerf-Datenbanken (Temp-Verzeichnis, data/e2e, data/restart-check),
# nie die lokale Datenbank aus DATABASE_PATH.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

# Build darf keine echte Datenbank öffnen; sicherheitshalber auf eine Wegwerfdatei zeigen.
export DATABASE_PATH="./data/verify/build.db"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-verify-$(node -e 'console.log(require("crypto").randomBytes(24).toString("base64url"))')}"

step "1/6 Lint"
pnpm lint

step "2/6 Typprüfung"
pnpm typecheck

step "3/6 Unit- und Integrationstests (Vitest, eigene Temp-Datenbanken)"
pnpm test

step "4/6 Produktions-Build"
pnpm build

step "5/6 Browser-End-to-End-Tests (Playwright, 390 px und 1440 px, Test-Datenbank data/e2e)"
pnpm test:e2e

step "6/6 Neustart-Prüfung (A12)"
node scripts/restart-check.mjs

rm -rf ./data/verify
printf '\n\033[1;32m✔ verify: alle Prüfungen bestanden\033[0m\n'
