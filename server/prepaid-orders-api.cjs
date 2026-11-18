'use strict';
// Trusted-server-only order creation for the five approved Sahmino plans.
// Legacy four-plan orders remain in the v1 table as historical records only.
// No checkout URL, payment instruction, or entitlement grant is produced.
const {plan}=require('./prepaid-plans.cjs');
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
const ORDER=/^ord_[a-f0-9]{32}$/;
const INSERT_SQL=[
 'INSERT INTO sahmino_prepaid_subscription_orders',
 '(id,user_id,plan_id,amount_rial,currency,state,created_at,renewal_mode,renewal_consent_version,renewal_consent_at)',
 "SELECT ?,u.id,?,?, 'IRR','PENDING',?,?,?,?",
 'FROM sahamban_users u',
 "WHERE u.auth_subject=? AND u.status='ACTIVE'"
].join(' ');
const INSERT_USER_SQL=INSERT_SQL.replace('u.auth_subject=?','u.id=?');
const SELECT_PENDING_SQL=[
 'SELECT o.id,o.plan_id,o.amount_rial,o.currency,o.created_at,o.renewal_mode,o.renewal_consent_version,o.renewal_consent_at',
 'FROM sahmino_prepaid_subscription_orders o',
 'JOIN sahamban_users u ON u.id=o.user_id',
 "WHERE u.auth_subject=? AND u.status='ACTIVE' AND o.state='PENDING'",
 'LIMIT 1'
] .join(' ');
const SELECT_PENDING_USER_SQL=SELECT_PENDING_SQL.replace('u.auth_subject=?','u.id=?');
function validNow(now){
 if(typeof now!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now))return false;
 const n=Date.parse(now);return Number.isFinite(n)&&new Date(n).toISOString()===now;
}
const fail=(reason,status)=>({reason,status,checkoutEnabled:false,proEnabled:false});
async function createPrepaidOrder(db,{authenticatedSubject,authenticatedUserId,planId,renewalMode='MANUAL',consentVersion=null,now,makeOrderId}={}){
 const byUser=typeof authenticatedUserId==='string'&&/^usr_[a-f0-9]{32}$/.test(authenticatedUserId);
 if(!byUser&&(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject)))return fail('NOT_AUTHENTICATED',401);
 let selected;try{selected=plan(planId);}catch(_){return fail('INVALID_PLAN',400);}
 if(renewalMode!=='MANUAL'&&renewalMode!=='AUTO')return fail('INVALID_RENEWAL_MODE',400);
 if(renewalMode==='AUTO'&&consentVersion!=='sahmino-auto-renew-v1')return fail('EXPLICIT_RENEWAL_CONSENT_REQUIRED',400);
 if(renewalMode==='MANUAL'&&consentVersion!==null)return fail('UNEXPECTED_RENEWAL_CONSENT',400);
 if(!validNow(now))return fail('SERVER_TIME_UNAVAILABLE',503);
 if(!db||typeof db.prepare!=='function')return fail('DATABASE_UNAVAILABLE',503);
 const id=typeof makeOrderId==='function'?makeOrderId():null;
 if(typeof id!=='string'||!ORDER.test(id))return fail('ORDER_ID_UNAVAILABLE',503);
 try{
  const result=await db.prepare(byUser?INSERT_USER_SQL:INSERT_SQL).bind(id,planId,selected.priceRial,now,renewalMode,consentVersion,renewalMode==='AUTO'?now:null,byUser?authenticatedUserId:authenticatedSubject).run();
  if(result?.success!==true)return fail('ORDER_UNAVAILABLE',503);
  if(result?.meta?.changes!==1)return fail('ACCOUNT_NOT_ELIGIBLE',403);
  return {status:201,reason:'PENDING_ORDER_CREATED',order:{id,planId,
   amountRial:selected.priceRial,currency:'IRR',createdAt:now,renewalMode,consentVersion,consentAt:renewalMode==='AUTO'?now:null},checkoutEnabled:false,proEnabled:false};
 }catch(_){return fail('ORDER_UNAVAILABLE',503);}
}
async function findPrepaidPendingOrder(db,authenticatedSubject,authenticatedUserId){
 const byUser=typeof authenticatedUserId==='string'&&/^usr_[a-f0-9]{32}$/.test(authenticatedUserId);
 if(!byUser&&(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject)))return fail('NOT_AUTHENTICATED',401);
 if(!db||typeof db.prepare!=='function')return fail('DATABASE_UNAVAILABLE',503);
 try{
  const row=await db.prepare(byUser?SELECT_PENDING_USER_SQL:SELECT_PENDING_SQL).bind(byUser?authenticatedUserId:authenticatedSubject).first();
  if(!row)return {status:200,reason:'NO_PENDING_ORDER',pending:false,checkoutEnabled:false,proEnabled:false};
  const p=plan(row.plan_id);
  if(typeof row.id!=='string'||!ORDER.test(row.id)||row.amount_rial!==p.priceRial||
    row.currency!=='IRR'||!validNow(row.created_at)||!['MANUAL','AUTO'].includes(row.renewal_mode)||
    (row.renewal_mode==='AUTO'&&(!row.renewal_consent_version||!validNow(row.renewal_consent_at)))||
    (row.renewal_mode==='MANUAL'&&(row.renewal_consent_version!==null||row.renewal_consent_at!==null)))return fail('INVALID_ORDER_STATE',503);
  return {status:200,reason:'PENDING_ORDER',pending:true,order:{
   id:row.id,planId:row.plan_id,amountRial:row.amount_rial,currency:row.currency,createdAt:row.created_at,renewalMode:row.renewal_mode,consentVersion:row.renewal_consent_version,consentAt:row.renewal_consent_at
  },checkoutEnabled:false,proEnabled:false};
 }catch(_){return fail('ORDER_UNAVAILABLE',503);}
}
module.exports=Object.freeze({createPrepaidOrder,findPrepaidPendingOrder,INSERT_SQL,INSERT_USER_SQL,SELECT_PENDING_SQL,SELECT_PENDING_USER_SQL});
