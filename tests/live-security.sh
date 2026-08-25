#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-https://tracker.arvadigital.my.id}"
COOKIE=$(mktemp)
BODY=$(mktemp)
cleanup(){ rm -f "$COOKIE" "$BODY"; }
trap cleanup EXIT

expect(){
  local label=$1 expected=$2; shift 2
  local got
  got=$(curl -sS -o "$BODY" -w '%{http_code}' "$@")
  if [[ "$got" != "$expected" ]]; then
    printf 'FAIL %-28s expected=%s got=%s body=%s\n' "$label" "$expected" "$got" "$(head -c 180 "$BODY")"
    exit 1
  fi
  printf 'PASS %-28s %s\n' "$label" "$got"
}

expect 'health' 200 "$BASE/api/health"
expect 'anonymous session' 401 "$BASE/api/auth/session"
expect 'anonymous trackers' 401 "$BASE/api/trackers"
expect 'foreign-origin registration' 403 -X POST -H 'Content-Type: application/json' -H 'Origin: https://evil.example' --data '{"name":"Test","email":"nobody@example.invalid","password":"ValidPassword123!"}' "$BASE/api/auth/register"

for header in content-security-policy x-content-type-options x-frame-options referrer-policy strict-transport-security; do
  curl -sSI "$BASE/login" | tr -d '\r' | grep -qi "^${header}:" || { echo "FAIL missing header $header"; exit 1; }
  echo "PASS header $header"
done

curl -sS "$BASE/manifest.webmanifest" > "$BODY"
node -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1])); if(m.display!=="standalone"||!m.start_url||!m.icons?.length)process.exit(1)' "$BODY"
echo 'PASS PWA manifest'
expect 'service worker' 200 "$BASE/sw.js"
echo 'LIVE_BASELINE_PASS'
