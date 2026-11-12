'use strict';
// Trusted-server-only order creation for the four prepaid Pro plans.
// No checkout URL, payment instructions, or entitlement grant is produced.
// authenticatedSubject must be derived from a separately verified identity token.
const {plan}=require('./prepaid-plans.cjs');
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
const ORDER=/^ord_[a-f0-9]{32}$/;
const INSERT_SQL=[
 'INSERT INTO prepaid_subscription_orders',
 '(id,user_id,plan_id,amount_rial,currency,state,created_at)',
 "SELECT ?,u.id,?,?, 'IRR','PENDING',?",
 'FROM sahamban_users u',
 "WHERE u.auth_subject=? AND u.status='ACTIVE'"
].join(' ');
const SELECT_PENDING_SQL=[
 'SELECT o.id,o.plan_id,o.amount_rial,o.currency,o.created_at',
 'FROM prepaid_subscription_orders o',
 'JOIN sahamban_users u ON u.id=o.user_id',
 "WHERE u.auth_subject=? AND u.status='ACTIVE' AND o.state='PENDING'",
 'LIMIT 1'
].join(' ');
function validNow(now){
 if(typeof now!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now))return false;
 const n=Date.parse(now);return Number.isFinite(n)&&new Date(n).toISOString()===now;
}
const fail=(reason,status)=>({reason,status,checkoutEnabled:false,proEnabled:false});
async function createPrepaidOrder(db,{authenticatedSubject,planId,now,makeOrderId}={}){
 if(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject))return fail('NOT_AUTHENTICATED',401);
 let selected;
 try{selected=plan(planId);}catch(_){return fail('INVALID_PLAN',400);}
 if(!validNow(now))return fail('SERVER_TIME_UNAVAILABLE',503);
 if(!db||typeof db.prepare!=='function')return fail('DATABASE_UNAVAILABLE',503);
 const id=typeof makeOrderId==='function'?makeOrderId():null;
 if(typeof id!=='string'||!ORDER.test(id))return fail('ORDER_ID_UNAVAILABLE',503);
 try{
  const result=await db.prepare(INSERT_SQL).bind(id,planId,selected.priceRial,now,authenticatedSubject).run();
  if(result?.success!==true)return fail('ORDER_UNAVAILABLE',503);
  if(result?.meta?.changes!==1)return fail('ACCOUNT_NOT_ELIGIBLE',403);
  return {status:201,reason:'PENDING_ORDER_CREATED',order:{id,planId,
   amountRial:selected.priceRial,currency:'IRR',createdAt:now},
   checkoutEnabled:false,proEnabled:false};
 }catch(_){return fail('ORDER_UNAVAILABLE',503);}
}
async function findPrepaidPendingOrder(db,authenticatedSubject){
 if(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject))return fail('NOT_AUTHENTICATED',401);
 if(!db||typeof db.prepare!=='function')return fail('DATABASE_UNAVAILABLE',503);
 try{
  const row=await db.prepare(SELECT_PENDING_SQL).bind(authenticatedSubject).first();
  if(!row)return {status:200,reason:'NO_PENDING_ORDER',pending:false,checkoutEnabled:false,proEnabled:false};
  const p=plan(row.plan_id);
  if(typeof row.id!=='string'||!ORDER.test(row.id)||row.amount_rial!==p.priceRial||
    row.currency!=='IRR'||!validNow(row.created_at))return fail('INVALID_ORDER_STATE',503);
  return {status:200,reason:'PENDING_ORDER',pending:true,order:{
   id:row.id,planId:row.plan_id,amountRial:row.amount_rial,
   currency:row.currency,createdAt:row.created_at
  },checkoutEnabled:false,proEnabled:false};
 }catch(_){return fail('ORDER_UNAVAILABLE',503);}
}
module.exports=Object.freeze({createPrepaidOrder,findPrepaidPendingOrder,INSERT_SQL,SELECT_PENDING_SQL});
