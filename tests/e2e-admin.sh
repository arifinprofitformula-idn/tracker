#!/usr/bin/env bash
set -euo pipefail
BASE=https://tracker.arvadigital.my.id
ORIGIN=https://tracker.arvadigital.my.id
COOKIE=$(mktemp); BODY=$(mktemp); trap 'rm -f "$COOKIE" "$BODY"' EXIT
EMAIL=bustanul.bmi@gmail.com
PASS=$(cat .secure/admin_password)
req(){ local expect=$1 label=$2; shift 2; local got; got=$(curl -sS -b "$COOKIE" -c "$COOKIE" -o "$BODY" -w '%{http_code}' "$@"); [[ "$got" == "$expect" ]] || { echo "FAIL $label expected=$expect got=$got body=$(head -c 150 "$BODY")"; exit 1; }; echo "PASS $label $got"; }
req 200 admin_login -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" "$BASE/api/auth/login"
req 200 admin_session "$BASE/api/auth/session"
node -e 'let j=JSON.parse(require("fs").readFileSync(process.argv[1]));if(j.user.role!=="ADMIN")process.exit(1)' "$BODY"
req 200 default_tracker "$BASE/api/modules"
MID=$(node -e 'let j=JSON.parse(require("fs").readFileSync(process.argv[1]));if(!j.length||j[0].days!==40)process.exit(1);process.stdout.write(j[0].id)' "$BODY")
req 200 toggle_on -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"moduleId\":\"$MID\",\"day\":1,\"activityIdx\":0}" "$BASE/api/modules/checks"
req 200 save_note -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"moduleId\":\"$MID\",\"phaseKey\":\"phase-0\",\"content\":\"E2E verification\"}" "$BASE/api/modules/notes"
req 200 admin_users "$BASE/api/admin/users"
req 200 toggle_off -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"moduleId\":\"$MID\",\"day\":1,\"activityIdx\":0}" "$BASE/api/modules/checks"
req 200 clear_note -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"moduleId\":\"$MID\",\"phaseKey\":\"phase-0\",\"content\":\"\"}" "$BASE/api/modules/notes"
req 200 logout -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data '{}' "$BASE/api/auth/logout"
req 401 revoked_session "$BASE/api/auth/session"
echo ADMIN_E2E_PASS
