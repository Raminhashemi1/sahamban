'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {authorizeProAccess,LOOKUP_SQL}=require('../server/pro-access-gate.cjs');
const now='2026-11-05T09:00:00.000Z',subject='oidc|issuer:user-123';
const row={user_id:'user-1',account_status:'ACTIVE',paid_until:'2027-11-05T09:00:00.000Z',suspended:0,auto_renew_cancelled:0};
function mockDB(result){const calls=[];return {calls,prepare(sql){calls.push(['prepare',sql]);return {bind(key){calls.push(['bind',key]);return {async first(){calls.push(['first']);if(result instanceof Error)throw result;return result;}};}};}};}
test('pro access checks authenticated subject with a bound SQL parameter',async()=>{
 const db=mockDB(row);const out=await authorizeProAccess(db,{authenticatedSubject:subject,now});
 assert.equal(out.proEnabled,true);assert.equal(out.reason,'ACTIVE');
 assert.deepEqual(db.calls[1],['bind',subject]);
 assert.match(LOOKUP_SQL,/WHERE u.auth_subject = \?/);
 assert.doesNotMatch(db.calls[0][1],/user-123/);
});
test('missing, forged or unsafely formatted auth subject never queries database',async()=>{
 for(const identity of [undefined,'','bad id','x\'; DROP TABLE sahamban_users;--',123]){
  const db=mockDB(row),out=await authorizeProAccess(db,{authenticatedSubject:identity,now});
  assert.equal(out.proEnabled,false);assert.equal(out.reason,'NOT_AUTHENTICATED');
  assert.equal(db.calls.length,0);
 }
});
test('account suspension, no account and missing subscription fail closed',async()=>{
 for(const [result,expected] of [[null,'NO_ACCOUNT'],[{...row,account_status:'SUSPENDED'},'ACCOUNT_BLOCKED'],[{...row,paid_until:null},'NO_SUBSCRIPTION'],[{...row,user_id:''},'INVALID_ACCOUNT']]){
  const out=await authorizeProAccess(mockDB(result),{authenticatedSubject:subject,now});
  assert.equal(out.proEnabled,false);assert.equal(out.reason,expected);
 }
});
test('expiration, cancellation, billing suspension and invalid entitlement state',async()=>{
 const variants=[
  [{...row,paid_until:now},'EXPIRED'],
  [{...row,suspended:1},'PAYMENT_REVIEW_REQUIRED'],
  [{...row,auto_renew_cancelled:1},'ACTIVE'],
  [{...row,paid_until:'2026-02-30T09:00:00.000Z'},'VERIFICATION_UNAVAILABLE'],
  [{...row,suspended:'0'},'INVALID_ENTITLEMENT'],
  [{...row,auto_renew_cancelled:null},'INVALID_ENTITLEMENT']
 ];
 for(const [r,expected] of variants){const out=await authorizeProAccess(mockDB(r),{authenticatedSubject:subject,now});assert.equal(out.reason,expected);assert.equal(out.proEnabled,expected==='ACTIVE');}
});
test('database problems and bad timestamps never grant Pro',async()=>{
 for(const db of [null,{},mockDB(new Error('offline'))]){
  const out=await authorizeProAccess(db,{authenticatedSubject:subject,now});assert.equal(out.proEnabled,false);
 }
 const out=await authorizeProAccess(mockDB(row),{authenticatedSubject:subject,now:'not UTC'});
 assert.equal(out.proEnabled,false);assert.equal(out.reason,'VERIFICATION_UNAVAILABLE');
});
