'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {prepaidAccountOverview,LOOKUP,HISTORY}=require('../server/prepaid-account-overview.cjs');
const now='2026-11-12T10:00:00.000Z',subject='oidc|user:123';
const account={user_id:'u1',account_status:'ACTIVE',paid_until:'2027-02-12T10:00:00.000Z'};
const item={id:'ord_abc',plan_id:'SAHAMBAN_PRO_3M',amount_rial:4500000,currency:'IRR',
 state:'SETTLED',created_at:now,settled_at:'2026-11-12T10:05:00.000Z'};
function dbFor({user=account,orders=[item],error=false}={}){
 const calls=[];
 return {calls,prepare(sql){calls.push({sql});return {bind(arg){calls.at(-1).arg=arg;return {
  async first(){if(error)throw Error('database offline');return user;},
  async all(){if(error)throw Error('database offline');return {success:true,results:orders};}
 };}};}};
}
test('overview reports remaining paid access, explicit no auto-renew and private history',async()=>{
 const db=dbFor(),result=await prepaidAccountOverview(db,{authenticatedSubject:subject,now});
 assert.equal(result.status,200);assert.equal(result.proEnabled,true);
 assert.equal(result.paidUntil,account.paid_until);
 assert.equal(result.remainingSeconds,92*86400);
 assert.equal(result.autoRenew,false);assert.equal(result.checkoutEnabled,false);
 assert.deepEqual(result.orders,[{orderId:item.id,planId:item.plan_id,amountRial:item.amount_rial,
  currency:'IRR',state:'SETTLED',createdAt:now,settledAt:item.settled_at}]);
 assert.deepEqual(db.calls.map(x=>x.arg),[subject,'u1']);
 assert.match(LOOKUP,/WHERE u.auth_subject=\?/);assert.match(HISTORY,/WHERE user_id=\?/);
});
test('expiry boundary, absent purchase and blocked account',async()=>{
 const expired=await prepaidAccountOverview(dbFor({user:{...account,paid_until:now}}),{authenticatedSubject:subject,now});
 assert.equal(expired.reason,'EXPIRED');assert.equal(expired.remainingSeconds,0);
 const free=await prepaidAccountOverview(dbFor({user:{...account,paid_until:null},orders:[]}),{authenticatedSubject:subject,now});
 assert.equal(free.reason,'NO_SUBSCRIPTION');assert.deepEqual(free.orders,[]);
 for(const user of [null,{...account,account_status:'SUSPENDED'}]){
  const out=await prepaidAccountOverview(dbFor({user}),{authenticatedSubject:subject,now});
  assert.equal(out.status,403);assert.equal(out.proEnabled,false);
 }
});
test('untrusted identity, invalid dates and database outage fail closed',async()=>{
 const db=dbFor();
 assert.equal((await prepaidAccountOverview(db,{authenticatedSubject:'bad subject',now})).status,401);
 assert.equal(db.calls.length,0);
 assert.equal((await prepaidAccountOverview(db,{authenticatedSubject:subject,now:'invalid'})).status,503);
 assert.equal((await prepaidAccountOverview(dbFor({user:{...account,paid_until:'2026-02-30T00:00:00Z'}}),{authenticatedSubject:subject,now})).status,503);
 assert.equal((await prepaidAccountOverview(dbFor({error:true}),{authenticatedSubject:subject,now})).status,503);
 assert.equal((await prepaidAccountOverview(null,{authenticatedSubject:subject,now})).status,503);
});
test('malformed order history fails without leaking partial history',async()=>{
 const out=await prepaidAccountOverview(dbFor({orders:[item,{...item,amount_rial:0}]}),{authenticatedSubject:subject,now});
 assert.equal(out.status,503);assert.equal(out.proEnabled,false);assert.equal(out.orders,undefined);
});
