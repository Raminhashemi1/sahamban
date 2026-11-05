'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('server/d1-schema.sql','utf8');
test('D1 ledger schema keeps payment identities unique and amounts integer-positive',()=>{
 assert.match(sql,/amount_rial INTEGER NOT NULL CHECK\(amount_rial > 0\)/);
 assert.match(sql,/UNIQUE\(provider_name, provider_payment_id\)/);
 assert.match(sql,/UNIQUE\(provider_name, provider_event_id\)/);
 assert.match(sql,/bank_transaction_id TEXT UNIQUE/);
 assert.match(sql,/order_id TEXT NOT NULL UNIQUE REFERENCES subscription_orders\(id\)/);
});
test('D1 schema has separate entitlement, reconciliation and admin audit tables',()=>{
 for(const table of ['sahamban_users','subscription_orders','manual_bank_reconciliations','subscription_entitlements','payment_event_ledger','subscription_admin_audit'])
  assert.match(sql,new RegExp('CREATE TABLE IF NOT EXISTS '+table));
 assert.match(sql,/verified_by TEXT,/);\n assert.match(sql,/state = 'MANUALLY_VERIFIED'[\\s\\S]*?verified_by IS NOT NULL/);
 assert.match(sql,/CHECK\(suspended IN \(0,1\)\)/);
});
test('D1 schema does not ask to store raw bank/card secrets',()=>{
 assert.doesNotMatch(sql,/card_number|cvv|otp|bank_password|gateway_secret/i);
});
