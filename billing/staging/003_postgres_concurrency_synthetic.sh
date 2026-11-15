#!/usr/bin/env bash
# DISPOSABLE CI POSTGRES ONLY. Verifies DB mechanics; NOT production billing.
set -euo pipefail
: "$PGPASSWORD"
# Destructive test fixture must never target production, even if invoked manually.
if [[ "${PGDATABASE:-}" != 'sahmino_synthetic_ci' || "${PGHOST:-}" != '127.0.0.1' ]]; then
  echo 'Refusing non-ephemeral/non-loopback database' >&2; exit 1
fi
tmp="$(mktemp -d)"
holder=''
cleanup() {
  if [[ -n "$holder" ]]; then kill "$holder" 2>/dev/null || true; wait "$holder" 2>/dev/null || true; fi
  rm -rf "$tmp"
}
trap cleanup EXIT
psql -X -q -v ON_ERROR_STOP=1 -c \
  "INSERT INTO sahmino_billing_staging.account_lock(account_id) VALUES ('00000000-0000-4000-8000-000000000099') ON CONFLICT DO NOTHING;"
wait_for_signal() {
  local pid="$1" file="$2" i
  for i in {1..100}; do
    [[ -f "$file" ]] && return 0
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "Holder exited early" >&2; cat "$tmp/holder.log" >&2; exit 1
    fi
    sleep 0.05
  done
  echo "Timed out waiting for holder lock" >&2; cat "$tmp/holder.log" >&2; exit 1
}
# A holds account lock and explicitly signals after SELECT FOR UPDATE.
export SAHMINO_LOCK_READY="$tmp/account-locked"
psql -X -q -v ON_ERROR_STOP=1 >"$tmp/holder.log" 2>&1 <<'SQL' &
BEGIN;
SELECT account_id FROM sahmino_billing_staging.account_lock
 WHERE account_id='00000000-0000-4000-8000-000000000099' FOR UPDATE;
\! sh -c 'touch "$SAHMINO_LOCK_READY"'
SELECT pg_sleep(3);
COMMIT;
SQL
holder=$!
wait_for_signal "$holder" "$SAHMINO_LOCK_READY"
if PGOPTIONS='-c statement_timeout=700ms' psql -X -q -v ON_ERROR_STOP=1 -c \
 "BEGIN; SELECT account_id FROM sahmino_billing_staging.account_lock WHERE account_id='00000000-0000-4000-8000-000000000099' FOR UPDATE; COMMIT;" \
 >"$tmp/contender.log" 2>&1; then
  echo "FAIL: concurrent account lock was not blocked" >&2; exit 1
fi
grep -qi 'statement timeout' "$tmp/contender.log" || {
  echo "FAIL: expected lock timeout" >&2; cat "$tmp/contender.log" >&2; exit 1;
}
wait "$holder"
holder=''
psql -X -q -v ON_ERROR_STOP=1 -c \
 "BEGIN; SELECT account_id FROM sahmino_billing_staging.account_lock WHERE account_id='00000000-0000-4000-8000-000000000099' FOR UPDATE; COMMIT;" >/dev/null
# A inserts uncommitted purchase; B attempts the same unique key.
export SAHMINO_LOCK_READY="$tmp/duplicate-uncommitted"
psql -X -q -v ON_ERROR_STOP=1 >"$tmp/holder.log" 2>&1 <<'SQL' &
BEGIN;
INSERT INTO sahmino_billing_staging.purchase
 (id,channel,provider_purchase_id,account_id,plan_days,state,verified_at,effective_at,evidence_reference)
VALUES ('10000000-0000-4000-8000-000000000099','CAFEBAZAAR','synthetic-concurrent-99',
 '00000000-0000-4000-8000-000000000099',30,'VERIFIED',now(),now(),'FAKE_ONLY');
\! sh -c 'touch "$SAHMINO_LOCK_READY"'
SELECT pg_sleep(3);
COMMIT;
SQL
holder=$!
wait_for_signal "$holder" "$SAHMINO_LOCK_READY"
count=$(PGOPTIONS='-c statement_timeout=10000ms' psql -X -q -At -v ON_ERROR_STOP=1 -c \
 "WITH attempted AS (
   INSERT INTO sahmino_billing_staging.purchase
    (id,channel,provider_purchase_id,account_id,plan_days,state,verified_at,effective_at,evidence_reference)
   VALUES ('10000000-0000-4000-8000-000000000098','CAFEBAZAAR','synthetic-concurrent-99',
    '00000000-0000-4000-8000-000000000099',30,'VERIFIED',now(),now(),'FAKE_ONLY')
   ON CONFLICT (channel,provider_purchase_id) DO NOTHING RETURNING id
 ) SELECT count(*) FROM attempted;")
wait "$holder"
holder=''
[[ "$count" == "0" ]] || { echo "FAIL: duplicate inserted ($count)" >&2; exit 1; }
actual=$(psql -X -q -At -v ON_ERROR_STOP=1 -c \
 "SELECT count(*) FROM sahmino_billing_staging.purchase WHERE channel='CAFEBAZAAR' AND provider_purchase_id='synthetic-concurrent-99';")
[[ "$actual" == "1" ]] || { echo "FAIL: purchase count ($actual)" >&2; exit 1; }
echo 'ISOLATED_POSTGRES_CONCURRENCY_PASS'
