'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {settle}=require('../server/billing/settlement.cjs');

const now='2026-01-01T00:00:00.000Z';
const planId='SAHAMBAN_PRO_30D';
const subject='manual-billing-test-user';
function setup({beforeBatch}={}){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE sahamban_users(id TEXT PRIMARY KEY,auth_subject TEXT UNIQUE,status TEXT NOT NULL);');
 sqlite.exec(fs.readFileSync(path.join(__dirname,'../server/billing/schema.sql'),'utf8'));
 sqlite.prepare("INSERT INTO sahamban_users(id,auth_subject,status) VALUES(?,?, 'ACTIVE')").run('u1',subject);
 let hook=beforeBatch;
 const adapter={
  prepare(sql){
   return {bind(...values){return {
    first:async()=>sqlite.prepare(sql).get(...values)||null,
    run:async()=>{const result=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:Number(result.changes)}};}
   }}};
  },
  async batch(statements){
   sqlite.exec('BEGIN');
   try{
    if(hook){const current=hook;hook=null;current(sqlite);}
    const results=statements.map(statement=>{
     const result=statement.sql?sqlite.prepare(statement.sql).run(...statement.values):null;
     return {success:true,meta:{changes:Number(result?.changes??0)}};
    });
    sqlite.exec('COMMIT');
    return results;
   }catch(error){sqlite.exec('ROLLBACK');throw error;}
  }
 };
 return {sqlite,adapter};
}
function createOrder(sqlite,id,createdAt=now){
 sqlite.prepare("INSERT INTO billing_orders(id,user_id,plan_id,status,created_at) VALUES(?,?,?,'CREATED',?)")
  .run(id,'u1',planId,createdAt);
}
function input(id,hash){return {orderId:id,subject,planId,bazaarOrderId:'bazaar-'+hash.slice(0,8),
 tokenHash:hash,purchaseTime:now,now};}

test('real SQLite settlement writes order, unique event and manual entitlement atomically',async()=>{
 const {sqlite,adapter}=setup(),id='ord_'+'a'.repeat(32),hash='a'.repeat(64);
 createOrder(sqlite,id);
 const result=await settle(adapter,input(id,hash));
 assert.deepEqual(result,{ok:true,restored:false,expiresAt:'2026-01-31T00:00:00.000Z',
  daysAdded:30,renewalMode:'MANUAL'});
 const paidOrder=sqlite.prepare('SELECT status,purchase_token_hash FROM billing_orders WHERE id=?').get(id);
 assert.equal(paidOrder.status,'PAID');assert.equal(paidOrder.purchase_token_hash,hash);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM billing_events').get().n,1);
 const access=sqlite.prepare('SELECT expires_at,auto_renewing FROM billing_access WHERE user_id=?').get('u1');
 assert.equal(access.expires_at,'2026-01-31T00:00:00.000Z');assert.equal(access.auto_renewing,0);
 sqlite.close();
});

test('replayed purchase is idempotent and early manual repurchase stacks exactly 30 days',async()=>{
 const {sqlite,adapter}=setup(),first='ord_'+'b'.repeat(32),second='ord_'+'c'.repeat(32);
 createOrder(sqlite,first);
 const initial=await settle(adapter,input(first,'b'.repeat(64)));
 assert.equal(initial.expiresAt,'2026-01-31T00:00:00.000Z');
 const replay=await settle(adapter,input(first,'b'.repeat(64)));
 assert.equal(replay.restored,true);assert.equal(replay.daysAdded,0);
 createOrder(sqlite,second);
 const next=await settle(adapter,input(second,'c'.repeat(64)));
 assert.equal(next.expiresAt,'2026-03-02T00:00:00.000Z');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM billing_events').get().n,2);
 sqlite.close();
});

test('two different purchases verified concurrently both extend the same account entitlement',async()=>{
 const {sqlite,adapter}=setup(),first='ord_'+'2'.repeat(32),second='ord_'+'3'.repeat(32);
 createOrder(sqlite,first);createOrder(sqlite,second);
 const [a,b]=await Promise.all([
  settle(adapter,input(first,'2'.repeat(64))),
  settle(adapter,input(second,'3'.repeat(64)))
 ]);
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 const expiry=sqlite.prepare('SELECT expires_at FROM billing_access WHERE user_id=?').get('u1').expires_at;
 assert.equal(expiry,'2026-03-02T00:00:00.000Z');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM billing_events').get().n,2);
 sqlite.close();
});

test('a lost concurrent order race cannot create an event or extend the entitlement',async()=>{
 const id='ord_'+'d'.repeat(32),hash='d'.repeat(64);
 const {sqlite,adapter}=setup({beforeBatch(db){
  db.prepare("UPDATE billing_orders SET status='PAID',paid_at=?,bazaar_product_id=?,bazaar_order_id=?,purchase_token_hash=? WHERE id=?")
   .run(now,planId,'other-order','e'.repeat(64),id);
  db.prepare("INSERT INTO billing_access(user_id,expires_at,auto_renewing,updated_at) VALUES(?,?,0,?)")
   .run('u1','2026-02-01T00:00:00.000Z',now);
 }});
 createOrder(sqlite,id);
 const result=await settle(adapter,input(id,hash));
 assert.equal(result.ok,false);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM billing_events').get().n,0);
 assert.equal(sqlite.prepare('SELECT expires_at FROM billing_access WHERE user_id=?').get('u1').expires_at,
  '2026-02-01T00:00:00.000Z');
 sqlite.close();
});

test('a purchase token already used by another order rolls back the entire new settlement',async()=>{
 const {sqlite,adapter}=setup(),first='ord_'+'f'.repeat(32),second='ord_'+'1'.repeat(32),hash='f'.repeat(64);
 createOrder(sqlite,first);createOrder(sqlite,second);
 assert.equal((await settle(adapter,input(first,hash))).ok,true);
 const before=sqlite.prepare('SELECT expires_at FROM billing_access WHERE user_id=?').get('u1').expires_at;
 const duplicate=await settle(adapter,{...input(second,hash),bazaarOrderId:'bazaar-different-order'});
 assert.equal(duplicate.ok,false);
 assert.equal(sqlite.prepare('SELECT status FROM billing_orders WHERE id=?').get(second).status,'CREATED');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM billing_events').get().n,1);
 assert.equal(sqlite.prepare('SELECT expires_at FROM billing_access WHERE user_id=?').get('u1').expires_at,before);
 sqlite.close();
});
