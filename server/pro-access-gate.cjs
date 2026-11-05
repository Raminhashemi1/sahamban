'use strict';
/*
 * SERVER-ONLY entitlement gate. Caller MUST supply authSubject obtained from
 * independently validated authentication (e.g. verified provider token), never
 * a browser-supplied user ID/email/query parameter.
 * Missing authentication, database errors, inactive accounts, missing/invalid
 * subscription state and expiry all FAIL CLOSED.
 *
 * The returned result is for trusted backend authorization decisions only.
 * It must not be sent to the browser as a token or used to unlock static JS.
 */
const {accessDecision}=require('./subscription-entitlements.cjs');
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
const LOOKUP_SQL=[
 'SELECT u.id AS user_id, u.status AS account_status,',
 'e.paid_until AS paid_until, e.suspended AS suspended,',
 'e.auto_renew_cancelled AS auto_renew_cancelled',
 'FROM sahamban_users u',
 'LEFT JOIN subscription_entitlements e ON e.user_id = u.id',
 'WHERE u.auth_subject = ? LIMIT 1'
].join(' ');
const denied=(reason)=>Object.freeze({proEnabled:false,reason});
async function authorizeProAccess(db,{authenticatedSubject,now}={}){
 if(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject))
  return denied('NOT_AUTHENTICATED');
 if(typeof now!=='string')return denied('INVALID_SERVER_TIME');
 if(!db||typeof db.prepare!=='function')return denied('DB_UNAVAILABLE');
 try{
  const row=await db.prepare(LOOKUP_SQL).bind(authenticatedSubject).first();
  if(!row)return denied('NO_ACCOUNT');
  if(row.account_status!=='ACTIVE')return denied('ACCOUNT_BLOCKED');
  if(typeof row.user_id!=='string'||!row.user_id)return denied('INVALID_ACCOUNT');
  if(row.paid_until===null)return denied('NO_SUBSCRIPTION');
  if(typeof row.paid_until!=='string'||
     (row.suspended!==0&&row.suspended!==1)||
     (row.auto_renew_cancelled!==0&&row.auto_renew_cancelled!==1))
   return denied('INVALID_ENTITLEMENT');
  const state={userId:row.user_id,paidUntil:row.paid_until,
   suspended:row.suspended===1,autoRenewCancelled:row.auto_renew_cancelled===1,
   processedEventIds:[],settledPaymentIds:[]};
  const answer=accessDecision(state,{now});
  return Object.freeze({proEnabled:answer.proEnabled,reason:answer.reason,
   paidUntil:answer.paidUntil});
 }catch(_err){return denied('VERIFICATION_UNAVAILABLE');}
}
module.exports=Object.freeze({authorizeProAccess,LOOKUP_SQL});
