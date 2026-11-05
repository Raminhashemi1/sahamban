'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {commitVerifiedManualSettlement:commit}=require('../server/manual-settlement-db.cjs');
const schema=fs.readFileSync('server/d1-schema.sql','utf8');
const now='2026-11-05T10:00:00.000Z',bookedAt='2026-11-05T09:30:00.000Z';
const bank={transactionId:'bank-unique-1',bookedAt,amountRial:1800000,
 currency:'IRR',direction:'CREDIT',status:'SETTLED'};
function harness(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');sql.exec(schema);
 const db={
  prepare(source){return {bind(...params){return {
    first:async()=>sql.prepare(source).get(...params)??null,source,params
   }}}},
  async batch(statements){
   sql.exec('BEGIN IMMEDIATE');
   try{
    const out=statements.map(s=>{
     const r=sql.prepare(s.source).run(...s.params);
     return {success:true,meta:{changes:r.changes}};
    });
    sql.exec('COMMIT');return out;
   }catch(e){sql.exec('ROLLBACK');throw e;}
  }
 };
 const addUser=(id='u1')=>sql.prepare(
  'INSERT INTO sahamban_users(id,created_at,status) VALUES(?,?,?)'
 ).run(id,now,'ACTIVE');
 const addOrder=(id='o1',user='u1')=>sql.prepare(
  "INSERT INTO subscription_orders(id,user_id,plan_id,amount_rial,currency,state,created_at) VALUES(?,?,'SAHAMBAN_PRO_ANNUAL',1800000,'IRR','PENDING',?)"
 ).run(id,user,'2026-11-05T09:00:00.000Z');
 addUser();addOrder();
 const idGen=()=>{let n=0;return ()=>'synthetic-id-'+(++n)};
 const options={orderId:'o1',bankRecord:{...bank},now,
  authorizeOperator:async()=>({subject:'admin|verified',role:'PAYMENT_RECONCILER'}),
  verifyBankRecord:async()=>true,makeId:idGen()};
 const count=t=>sql.prepare('SELECT count(*) n FROM '+t).get().n;
 return {sql,db,options,addUser,addOrder,idGen,count};
}
test('atomic bank settlement grants exactly one year and writes five matching records',async()=>{
 const h=harness(),r=await commit(h.db,h.options);
 assert.equal(r.paidUntil,'2027-11-05T09:30:00.000Z');
 assert.equal(h.sql.prepare("SELECT state FROM subscription_orders WHERE id='o1'").get().state,'SETTLED');
 assert.equal(h.sql.prepare("SELECT paid_until FROM subscription_entitlements WHERE user_id='u1'").get().paid_until,r.paidUntil);
 assert.equal(h.count('manual_bank_reconciliations'),1);
 assert.equal(h.count('payment_event_ledger'),1);
 assert.equal(h.sql.prepare('SELECT action FROM subscription_admin_audit').get().action,'MANUAL_BANK_PAID_GRANT');
});
test('forged, missing or unverified bank credit and untrusted admin cannot unlock Pro',async()=>{
 for(const change of [
  o=>({...o,verifyBankRecord:async()=>false}),
  o=>({...o,verifyBankRecord:null}),
  o=>({...o,authorizeOperator:async()=>({subject:'admin',role:'USER'})}),
  o=>({...o,bankRecord:{...o.bankRecord,amountRial:1}}),
  o=>({...o,bankRecord:{...o.bankRecord,status:'PENDING'}}),
  o=>({...o,bankRecord:{...o.bankRecord,bookedAt:'2030-01-01T00:00:00.000Z'}})
 ]){
  const h=harness();await assert.rejects(commit(h.db,change(h.options)));
  assert.equal(h.sql.prepare("SELECT state FROM subscription_orders WHERE id='o1'").get().state,'PENDING');
  assert.equal(h.count('subscription_entitlements'),0);
  assert.equal(h.count('payment_event_ledger'),0);
 }
});
test('replaying the same bank payment against another order rolls back everything',async()=>{
 const h=harness();await commit(h.db,h.options);h.addUser('u2');h.addOrder('o2','u2');
 await assert.rejects(commit(h.db,{...h.options,orderId:'o2',makeId:h.idGen()}),/ATOMIC_SETTLEMENT_FAILED/);
 assert.equal(h.sql.prepare("SELECT state FROM subscription_orders WHERE id='o2'").get().state,'PENDING');
 assert.equal(h.sql.prepare("SELECT paid_until FROM subscription_entitlements WHERE user_id='u2'").get(),undefined);
 assert.equal(h.count('payment_event_ledger'),1);
});
test('renewal adds one calendar year to existing paid time, not to bank booking date',async()=>{
 const h=harness();
 h.sql.prepare('INSERT INTO subscription_entitlements(user_id,paid_until,updated_at) VALUES(?,?,?)')
  .run('u1','2027-12-01T00:00:00.000Z','2026-11-01T00:00:00.000Z');
 assert.equal((await commit(h.db,h.options)).paidUntil,'2028-12-01T00:00:00.000Z');
});
test('suspended accounts cannot renew through manual settlement',async()=>{
 const h=harness();
 h.sql.prepare('INSERT INTO subscription_entitlements(user_id,paid_until,suspended,updated_at) VALUES(?,?,1,?)')
  .run('u1','2027-12-01T00:00:00.000Z',now);
 await assert.rejects(commit(h.db,h.options),/ACCOUNT_REVIEW_REQUIRED/);
 assert.equal(h.count('payment_event_ledger'),0);
});
test('stale entitlement changed concurrently rolls back order and reconciliation',async()=>{
 const h=harness(),realBatch=h.db.batch;
 h.sql.prepare('INSERT INTO subscription_entitlements(user_id,paid_until,updated_at) VALUES(?,?,?)')
  .run('u1','2027-12-01T00:00:00.000Z','2026-11-01T00:00:00.000Z');
 h.db.batch=async statements=>{
  h.sql.prepare("UPDATE subscription_entitlements SET paid_until='2029-02-01T00:00:00.000Z' WHERE user_id='u1'").run();
  return realBatch(statements);
 };
 await assert.rejects(commit(h.db,h.options),/ATOMIC_SETTLEMENT_FAILED/);
 assert.equal(h.sql.prepare("SELECT state FROM subscription_orders WHERE id='o1'").get().state,'PENDING');
 assert.equal(h.count('manual_bank_reconciliations'),0);
 assert.equal(h.count('payment_event_ledger'),0);
 assert.equal(h.count('subscription_admin_audit'),0);
});
test('failure injected at any batch stage rolls back every prior write',async()=>{
 for(const stage of [1,2,3,4,5]){
  const h=harness(),realBatch=h.db.batch;
  h.db.batch=async statements=>{
   statements.splice(stage-1,0,h.db.prepare('INSERT INTO no_such_table VALUES(1)').bind());
   return realBatch(statements);
  };
  await assert.rejects(commit(h.db,h.options),/ATOMIC_SETTLEMENT_FAILED/);
  assert.equal(h.sql.prepare("SELECT state FROM subscription_orders WHERE id='o1'").get().state,'PENDING');
  for(const table of ['manual_bank_reconciliations','payment_event_ledger','subscription_entitlements','subscription_admin_audit'])
   assert.equal(h.count(table),0,table);
 }
});
