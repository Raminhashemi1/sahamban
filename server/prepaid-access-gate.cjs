'use strict';
// Server-only read gate for the prepaid four-tier entitlement ledger.
// authenticatedSubject MUST be independently verified by the caller.
// This module never accepts a user ID from browser input and never grants access
// when identity, DB state, UTC time, or entitlement data is invalid.
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
const SQL=[
 'SELECT u.id AS user_id, u.status AS account_status, e.paid_until AS paid_until',
 'FROM sahamban_users u',
 'LEFT JOIN prepaid_subscription_entitlements e ON e.user_id=u.id',
 'WHERE u.auth_subject=? LIMIT 1'
].join(' ');
const deny=reason=>Object.freeze({proEnabled:false,reason,paidUntil:null});
function validUTC(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))return false;
 const n=Date.parse(value);
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===value.slice(0,19);
}
async function authorizePrepaidPro(db,{authenticatedSubject,now}={}){
 if(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject))return deny('NOT_AUTHENTICATED');
 if(!validUTC(now))return deny('INVALID_SERVER_TIME');
 if(!db||typeof db.prepare!=='function')return deny('DB_UNAVAILABLE');
 try{
  const row=await db.prepare(SQL).bind(authenticatedSubject).first();
  if(!row)return deny('NO_ACCOUNT');
  if(row.account_status!=='ACTIVE')return deny('ACCOUNT_BLOCKED');
  if(typeof row.user_id!=='string'||!row.user_id)return deny('INVALID_ACCOUNT');
  if(row.paid_until===null)return deny('NO_SUBSCRIPTION');
  if(!validUTC(row.paid_until))return deny('INVALID_ENTITLEMENT');
  if(Date.parse(row.paid_until)<=Date.parse(now))return deny('EXPIRED');
  return Object.freeze({proEnabled:true,reason:'ACTIVE',paidUntil:row.paid_until});
 }catch(_){return deny('VERIFICATION_UNAVAILABLE');}
}
module.exports=Object.freeze({authorizePrepaidPro,SQL,validUTC});
