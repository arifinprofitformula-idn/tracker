#!/usr/bin/env bash
set -euo pipefail
B=https://tracker.arvadigital.my.id;O=$B;C=$(mktemp);R=$(mktemp);trap 'rm -f "$C" "$R"' EXIT
P=$(cat .secure/admin_password)
code=$(curl -sS -c "$C" -o "$R" -w '%{http_code}' -X POST -H "Origin: $O" -H 'Content-Type: application/json' --data "{\"email\":\"bustanul.bmi@gmail.com\",\"password\":\"$P\"}" "$B/api/auth/login");test "$code" = 200
for v in false true;do code=$(curl -sS -b "$C" -o "$R" -w '%{http_code}' -X POST -H "Origin: $O" -H 'Content-Type: application/json' --data "{\"key\":\"registration.enabled\",\"value\":\"$v\"}" "$B/api/admin/settings");test "$code" = 200;done
code=$(curl -sS -b "$C" -o "$R" -w '%{http_code}' "$B/api/admin/settings");test "$code" = 200
node -e 'let j=JSON.parse(require("fs").readFileSync(process.argv[1]));if(!j.some(x=>x.key==="registration.enabled"&&x.value==="true"))process.exit(1)' "$R"
echo FEATURE_SETTINGS_E2E_PASS
