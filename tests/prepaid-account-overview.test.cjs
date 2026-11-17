'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepaidAccountOverview,LOOKUP,HISTORY}=require('../server/prepaid-account-overview.cjs');
const now='2026-11-12T10:00:00.000Z',subject='oidc|user:123';
const account={user_id:'u1',account_status:'ACTIVE',payment_suspended:0,paid_until:'2027-02-12T10:00:00.000Z'};
const item={id:'ord_abc',plan_id:'SAHAMBAN_PRO_30D',amount_rial:1500000,currency:'IRR',state:'SETTLED',created_at:now,settled_at:'2026-11-12T10:05:00.000Z'};
function dbFor({user=account,orders=[item],error=false}={}){const calls=[];return {calls,prepare(sql){calls.push({sql});return {bind(...args){calls.at(-1).args=args;return {async first(){if(error)throw Error('database offline');return user;},async all(){if(error)throw Error('database offline');return {success:true,results:orders};}};}};}};}
test('overview reports paid access, manual renewal default and merged private order history',async()=>{
 const db=dbFor(),result=await prepaidAccountOverview(db,{authenticatedSubject:subject,now});
 assert.equal(result.status,200);assert.equal(result.proEnabled,true);assert.equal(result.paidUntil,account.paid_until);
 assert.equal(result.remainingSeconds,92*86400);assert.equal(result.autoRenew,false);assert.equal(result.checkoutEnabled,false);
 assert.equal(result.orders[0].planId,item.plan_id);assert.deepEqual(db.calls.map(x=>x.args),[[subject],['u1','u1']]);
 assert.match(LOOKUP,/WHERE u.auth_subject=\?/);assert.match(LOOKUP,/sahmino_prepaid_subscription_entitlements/);assert.match(LOOKUP,/COALESCE/);assert.match(HISTORY,/UNION ALL/);assert.match(HISTORY,/sahmino_prepaid_subscription_orders/);
});
test('expiry boundary, absent purchase and blocked account',async()=>{
 assert.equal((await prepaidAccountOverview(dbFor({user:{...account,paid_until:now}}),{authenticatedSubject:subject,now})).reason,'EXPIRED');
 const free=await prepaidAccountOverview(dbFor({user:{...account,paid_until:null},orders:[]}),{authenticatedSubject:subject,now});
 assert.equal(free.reason,'NO_SUBSCRIPTION');assert.deepEqual(free.orders,[]);
 for(const user of [null,{...account,account_status:'SUSPENDED'},{...account,payment_suspended:1}])assert.equal((await prepaidAccountOverview(dbFor({user}),{authenticatedSubject:subject,now})).status,403);
});
test('untrusted identity, invalid dates and database outage fail closed',async()=>{
 const db=dbFor();assert.equal((await prepaidAccountOverview(db,{authenticatedSubject:'bad subject',now})).status,401);assert.equal(db.calls.length,0);
 assert.equal((await prepaidAccountOverview(db,{authenticatedSubject:subject,now:'invalid'})).status,503);
 assert.equal((await prepaidAccountOverview(dbFor({user:{...account,paid_until:'2026-02-30T00:00:00Z'}}),{authenticatedSubject:subject,now})).status,503);
 assert.equal((await prepaidAccountOverview(dbFor({error:true}),{authenticatedSubject:subject,now})).status,503);
 assert.equal((await prepaidAccountOverview(dbFor({user:{...account,payment_suspended:'0'}}),{authenticatedSubject:subject,now})).status,503);
 assert.equal((await prepaidAccountOverview(null,{authenticatedSubject:subject,now})).status,503);
});
test('malformed order history fails without leaking partial history',async()=>{
 const out=await prepaidAccountOverview(dbFor({orders:[item,{...item,amount_rial:0}]}),{authenticatedSubject:subject,now});
 assert.equal(out.status,503);assert.equal(out.proEnabled,false);assert.equal(out.orders,undefined);
});

test('OTP internal user ID resolves account and history without auth_subject',async()=>{
 const userId='usr_'+'a'.repeat(32),db=dbFor(),result=await prepaidAccountOverview(db,{authenticatedUserId:userId,now});
 assert.equal(result.status,200);assert.equal(result.proEnabled,true);
 assert.deepEqual(db.calls.map(x=>x.args),[[userId],['u1','u1']]);
 assert.match(db.calls[0].sql,/WHERE u\.id=\?/);
});
