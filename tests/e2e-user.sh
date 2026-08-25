#!/usr/bin/env bash
set -euo pipefail
BASE=https://tracker.arvadigital.my.id; ORIGIN=$BASE
C1=$(mktemp);C2=$(mktemp);B=$(mktemp);trap 'rm -f "$C1" "$C2" "$B"' EXIT
STAMP=$(date +%s); E1="e2e-one-$STAMP@example.com";E2="e2e-two-$STAMP@example.com";P='E2E-Strong-Password-2026!'
req(){ local jar=$1 expect=$2 label=$3;shift 3;local got;got=$(curl -sS -b "$jar" -c "$jar" -o "$B" -w '%{http_code}' "$@");[[ "$got" == "$expect" ]]||{ echo "FAIL $label expected=$expect got=$got body=$(head -c 150 "$B")";exit 1;};echo "PASS $label $got";}
req "$C1" 201 register_one -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"name\":\"E2E One\",\"email\":\"$E1\",\"password\":\"$P\"}" "$BASE/api/auth/register"
req "$C1" 200 default_tracker_one "$BASE/api/modules"; M1=$(node -e 'let j=JSON.parse(require("fs").readFileSync(process.argv[1]));if(j.length!==1||j[0].days!==40)process.exit(1);process.stdout.write(j[0].id)' "$B")
req "$C1" 403 non_admin_denied "$BASE/api/admin/users"
req "$C2" 201 register_two -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"name\":\"E2E Two\",\"email\":\"$E2\",\"password\":\"$P\"}" "$BASE/api/auth/register"
req "$C2" 403 cross_user_check_denied -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data "{\"moduleId\":\"$M1\",\"day\":1,\"activityIdx\":0}" "$BASE/api/modules/checks"
printf '%s\n%s\n' "$E1" "$E2" > .secure/e2e_users
echo USER_OWNERSHIP_E2E_PASS
