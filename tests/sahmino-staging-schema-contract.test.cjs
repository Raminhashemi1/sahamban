'use strict';
// STATIC staging SQL assertions, not a PostgreSQL integration test or a receipt test.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../billing/staging/001_sahmino_billing_staging.sql'),'utf8');
const strip=sql.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim();
test('staging contract explicitly disallows production execution',()=>{
 assert.match(sql,/STAGING-ONLY/);
 assert.match(sql,/NOT EXECUTED/);
 assert.match(sql,/NO CHECKOUT OR REAL ENTITLEMENTS/);
});
test('schema is isolated and wrapped in a transaction',()=>{
 assert.match(strip,/^BEGIN;/);
 assert.match(strip,/CREATE SCHEMA IF NOT EXISTS sahmino_billing_staging;/);
 assert.match(strip,/COMMIT;$/);
 assert.doesNotMatch(strip,/DROP\s+(TABLE|SCHEMA)/i);
});
test('only four owner-approved channels accepted by purchase constraint',()=>{
 assert.match(strip,/channel text NOT NULL CHECK \(channel IN \('CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'\)\)/);
});
test('only five exact approved plan day counts are allowed',()=>{
 assert.match(strip,/plan_days integer NOT NULL CHECK \(plan_days IN \(30,60,90,180,365\)\)/);
 assert.doesNotMatch(strip,/270/);
});
test('same provider purchase cannot be inserted twice within one channel',()=>{
 assert.match(strip,/UNIQUE \(channel,provider_purchase_id\)/);
});
test('purchase is tied to an account and verification evidence reference',()=>{
 assert.match(strip,/account_id uuid NOT NULL REFERENCES sahmino_billing_staging\.account_lock\(account_id\)/);
 assert.match(strip,/evidence_reference text NOT NULL/);
 assert.match(strip,/verified_at timestamptz NOT NULL/);
});
test('refund and revoked states require invalidation timestamp',()=>{
 assert.match(strip,/state IN \('VERIFIED','REFUNDED','REVOKED'\)/);
 assert.match(strip,/state='VERIFIED' AND invalidated_at IS NULL/);
 assert.match(strip,/state IN \('REFUNDED','REVOKED'\) AND invalidated_at IS NOT NULL/);
});
test('entitlement snapshot has revision and UTC instant storage type',()=>{
 assert.match(strip,/expiry_at timestamptz/);
 assert.match(strip,/revision bigint NOT NULL DEFAULT 0 CHECK \(revision >= 0\)/);
});
test('audit state transitions are unique per purchase',()=>{
 assert.match(strip,/CREATE TABLE IF NOT EXISTS sahmino_billing_staging\.audit_event/);
 assert.match(strip,/UNIQUE\(purchase_id,event_type\)/);
});
test('outbox is retryable and actions are constrained',()=>{
 assert.match(strip,/action IN \('ACKNOWLEDGE','CONSUME','RECONCILE'\)/);
 assert.match(strip,/state IN \('PENDING','IN_PROGRESS','DONE','FAILED'\)/);
 assert.match(strip,/UNIQUE \(purchase_id,action\)/);
});
test('there is no real payment verification or live grant function in this schema',()=>{
 assert.doesNotMatch(strip,/CREATE\s+(FUNCTION|PROCEDURE|TRIGGER)/i);
 assert.doesNotMatch(strip,/INSERT\s+INTO/i);
});
