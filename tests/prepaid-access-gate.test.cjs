'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {authorizePrepaidPro,SQL}=require('../server/prepaid-access-gate.cjs');
const now='2026-11-12T10:00:00.000Z';
const subject='oidc|issuer:user-123';
const active={user_id:'u1',account_status:'ACTIVE',paid_until:'2027-02-12T10:00:00.000Z'};
function dbFor(row){
 const calls=[];
 return {calls,prepare(sql){calls.push(['sql',sql]);return {bind(value){calls.push(['bind',value]);return {async first(){calls.push(['first']);if(row instanceof Error)throw row;return row;}};}};}};
}
test('active prepaid entitlement is returned using a bound authenticated subject',async()=>{
 const db=dbFor(active),result=await authorizePrepaidPro(db,{authenticatedSubject:subject,now});
 assert.deepEqual(result,{proEnabled:true,reason:'ACTIVE',paidUntil:active.paid_until});
 assert.deepEqual(db.calls[1],['bind',subject]);
 assert.match(SQL,/WHERE u.auth_subject=\?/);
 assert.doesNotMatch(db.calls[0][1],/user-123/);
});
test('missing or malformed identity fails closed without querying DB',async()=>{
 for(const identity of [undefined,'','bad id',123,"x'; DROP TABLE sahamban_users;--"]){
  const db=dbFor(active),out=await authorizePrepaidPro(db,{authenticatedSubject:identity,now});
  assert.equal(out.proEnabled,false);assert.equal(out.reason,'NOT_AUTHENTICATED');assert.equal(db.calls.length,0);
 }
});
test('account and entitlement missing or invalid fail closed',async()=>{
 const variants=[[null,'NO_ACCOUNT'],[{...active,account_status:'SUSPENDED'},'ACCOUNT_BLOCKED'],
 [{...active,user_id:''},'INVALID_ACCOUNT'],[{...active,paid_until:null},'NO_SUBSCRIPTION'],
 [{...active,paid_until:'2026-02-30T10:00:00Z'},'INVALID_ENTITLEMENT']];
 for(const [row,reason] of variants){const out=await authorizePrepaidPro(dbFor(row),{authenticatedSubject:subject,now});assert.equal(out.reason,reason);assert.equal(out.proEnabled,false);}
});
test('expiry boundary is exclusive and future access remains active',async()=>{
 const expired=await authorizePrepaidPro(dbFor({...active,paid_until:now}),{authenticatedSubject:subject,now});
 assert.equal(expired.reason,'EXPIRED');assert.equal(expired.proEnabled,false);
 const activeResult=await authorizePrepaidPro(dbFor(active),{authenticatedSubject:subject,now});
 assert.equal(activeResult.proEnabled,true);
});
test('bad server time, DB outage and missing DB fail closed',async()=>{
 for(const time of ['bad','2026-02-30T00:00:00Z',undefined]){
  const out=await authorizePrepaidPro(dbFor(active),{authenticatedSubject:subject,now:time});
  assert.equal(out.proEnabled,false);assert.equal(out.reason,'INVALID_SERVER_TIME');
 }
 for(const db of [null,{},dbFor(new Error('offline'))]){
  const out=await authorizePrepaidPro(db,{authenticatedSubject:subject,now});
  assert.equal(out.proEnabled,false);
 }
});
