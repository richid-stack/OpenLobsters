#!/bin/bash
# Runs browser test suites against a fresh copy of the app: a new database, a fake model provider, and a fake
# sign-in provider. Usage (from apps/web):  tests/browser/run.sh step_tray.py real_tools.py
# Each script prints PASS or FAIL per check and saves screenshots to $SHOTS_OUT (default ./shots).
# Needs: playwright with Chromium (pip install playwright), and openpyxl for real_tools.py.
# Each run starts from an empty database, so run suites that create the same people in separate runs.
set -u
cd "$(dirname "$0")/../.."
pkill -f '[v]ite --host' 2>/dev/null; pkill -f '[t]sx tests/runMock' 2>/dev/null; sleep 2
rm -rf data
(setsid nohup npx tsx tests/runMock.mts > /tmp/openlobs-mock.log 2>&1 < /dev/null &)
(setsid nohup npx tsx tests/runMockIdp.mts > /tmp/openlobs-idp.log 2>&1 < /dev/null &)
sleep 3
(OPENLOBS_AUTH_GITHUB_ID=demo-id OPENLOBS_AUTH_GITHUB_SECRET=demo-secret OPENLOBS_AUTH_GOOGLE_ID=demo-id OPENLOBS_AUTH_GOOGLE_SECRET=demo-secret \
 OPENLOBS_OIDC_ID=mock OPENLOBS_OIDC_NAME="Mock SSO" OPENLOBS_OIDC_ISSUER=http://127.0.0.1:4020 OPENLOBS_OIDC_CLIENT_ID=cid OPENLOBS_OIDC_CLIENT_SECRET=csecret \
 setsid nohup npx vite --host 127.0.0.1 --port 3000 > /tmp/openlobs-dev.log 2>&1 < /dev/null &)
for i in $(seq 1 40); do curl -s -o /dev/null --max-time 3 http://localhost:3000/ && break; sleep 1; done
# Warm the pages so the dependency optimiser does not reload the page in the middle of a test.
for p in / /sign-in /models /api/auth-config; do curl -s -o /dev/null --max-time 60 "http://localhost:3000$p"; done
sleep 6
export SHOTS_OUT="${SHOTS_OUT:-$PWD/shots}"
for s in "$@"; do
  echo "=== $s"
  timeout 280 python3 "tests/browser/$s" 2>&1 | tail -60 | cut -c1-260
done
