'use strict';
/*
 * D1 operator-only settlement coordinator; NEVER expose as an HTTP endpoint.
 * The caller must independently authenticate an authorized bank reconciler
 * and verify the actual settled bank credit against the merchant bank ledger.
 * No browser receipt, callback or user "verified" flag is trusted here.
 *
 * D1.batch is atomic. Scalar subqueries in NOT NULL columns make a failed
 * prerequisite abort the entire transaction, including a concurrent CAS miss.
 */
const {randomUUID}=require('node:crypto');
const {addCalendarYear}=require('./subscription-entitlements.cjs');
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
function ident(v){if(typeof v!=='string'||!ID.test(v))throw Error('INVALID_ID');return v;}
function utc(v){
 if(typeof v!=='string'||! /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v))
  throw Error('INVALID_UTC');
 const ms=Date.parse(v);
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==v.slice(0,19))
  throw Error('INVALID_UTC');
 return ms;
}
const FIND=[
 'SELECT o.id,o.user_id,o.plan_id,o.amount_rial,o.currency,o.state,o.created_at,',
 'u.status account_status,e.paid_until,e.suspended FROM subscription_orders o',
 'JOIN sahamban_users u ON u.id=o.user_id',
 'LEFT JOIN subscription_entitlements e ON e.user_id=o.user_id',
 'WHERE o.id=? LIMIT 1'
].join(' ');
const RECONCILE=[
 'INSERT INTO manual_bank_reconciliations',
 '(id,order_id,user_id,amount_rial,currency,state,bank_transaction_id,bank_booked_at,verified_by,verified_at)',
 'VALUES (?,(SELECT o.id FROM subscription_orders o JOIN sahamban_users u ON u.id=o.user_id',
 "WHERE o.id=? AND o.user_id=? AND o.amount_rial=? AND o.currency='IRR'",
 "AND o.state='PENDING' AND u.status='ACTIVE'),",
 "? ,?,'IRR','MANUALLY_VERIFIED',?,?,?,?)"
].join(' ');
const SETTLE=[
 "UPDATE subscription_orders SET state='SETTLED',settled_at=?,",
 "provider_name='MANUAL_BANK',provider_payment_id=?",
 "WHERE id=? AND user_id=? AND amount_rial=? AND currency='IRR' AND state='PENDING'",
 "AND EXISTS(SELECT 1 FROM manual_bank_reconciliations r WHERE r.order_id=?",
 "AND r.user_id=? AND r.bank_transaction_id=? AND r.state='MANUALLY_VERIFIED')"
].join(' ');
const EVENT=[
 'INSERT INTO payment_event_ledger',
 '(id,provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)',
 "VALUES (?,'MANUAL_BANK',?,?,(SELECT id FROM subscription_orders WHERE id=? AND user_id=?",
 "AND state='SETTLED' AND provider_name='MANUAL_BANK' AND provider_payment_id=?),",
 "'MANUAL_BANK_SETTLED',?)"
].join(' ');
const GRANT=[
 'INSERT INTO subscription_entitlements',
 '(user_id,paid_until,suspended,auto_renew_cancelled,updated_at)',
 'SELECT o.user_id,?,0,0,? FROM subscription_orders o',
 'JOIN payment_event_ledger p ON p.order_id=o.id',
 "WHERE o.id=? AND o.user_id=? AND o.state='SETTLED'",
 "AND p.provider_name='MANUAL_BANK' AND p.provider_event_id=?",
 "AND p.provider_payment_id=? AND p.event_type='MANUAL_BANK_SETTLED'",
 'ON CONFLICT(user_id) DO UPDATE SET paid_until=excluded.paid_until,',
 'auto_renew_cancelled=0,updated_at=excluded.updated_at',
 'WHERE subscription_entitlements.suspended=0',
 'AND subscription_entitlements.paid_until IS ?'
].join(' ');
const AUDIT=[
 'INSERT INTO subscription_admin_audit',
 '(id,admin_subject,action,target_order_id,reason,created_at)',
 "VALUES (?,?,(SELECT 'MANUAL_BANK_PAID_GRANT' FROM subscription_entitlements e",
 "JOIN payment_event_ledger p ON p.order_id=? AND p.provider_name='MANUAL_BANK'",
 "AND p.provider_event_id=? AND p.provider_payment_id=? AND p.event_type='MANUAL_BANK_SETTLED'",
 'WHERE e.user_id=? AND e.paid_until=? AND e.updated_at=? AND e.suspended=0),',
 "?,'independently verified bank-ledger credit',?)"
].join(' ');
async function commitVerifiedManualSettlement(db,{orderId,bankRecord,now,
 authorizeOperator,verifyBankRecord,makeId=randomUUID}={}){
 ident(orderId);const nowMs=utc(now);
 if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function')
  throw Error('DATABASE_UNAVAILABLE');
 if(typeof authorizeOperator!=='function'||typeof verifyBankRecord!=='function')
  throw Error('TRUSTED_VERIFIERS_REQUIRED');
 const admin=await authorizeOperator();
 if(!admin||admin.role!=='PAYMENT_RECONCILER'||typeof admin.subject!=='string'||
    !SUBJECT.test(admin.subject))throw Error('OPERATOR_NOT_AUTHORIZED');
 const row=await db.prepare(FIND).bind(orderId).first();
 if(!row||row.state!=='PENDING'||row.account_status!=='ACTIVE'||
    row.plan_id!=='SAHAMBAN_PRO_ANNUAL'||row.currency!=='IRR'||
    !Number.isSafeInteger(row.amount_rial)||row.amount_rial<=0||
    typeof row.user_id!=='string'||!ID.test(row.user_id))
  throw Error('ORDER_NOT_ELIGIBLE');
 if(row.suspended!==null&&row.suspended!==0)throw Error('ACCOUNT_REVIEW_REQUIRED');
 const created=utc(row.created_at);
 const previous=row.paid_until===null?null:utc(row.paid_until);
 if(!bankRecord||typeof bankRecord!=='object'||Array.isArray(bankRecord))
  throw Error('BANK_RECORD_REQUIRED');
 const bankId=ident(bankRecord.transactionId),booked=utc(bankRecord.bookedAt);
 if(bankRecord.direction!=='CREDIT'||bankRecord.status!=='SETTLED'||
    bankRecord.currency!=='IRR'||bankRecord.amountRial!==row.amount_rial||
    booked<created-300000||booked>nowMs+300000)
  throw Error('BANK_CREDIT_MISMATCH');
 if(await verifyBankRecord(bankRecord,{orderId:row.id,userId:row.user_id,
    amountRial:row.amount_rial,currency:'IRR'})!==true)
  throw Error('BANK_CREDIT_NOT_VERIFIED');
 const paidUntil=addCalendarYear(new Date(Math.max(booked,previous??booked)).toISOString());
 const newId=()=>ident(makeId());
 const recId=newId(),eventId=newId(),auditId=newId();
 const statements=[
  db.prepare(RECONCILE).bind(recId,row.id,row.user_id,row.amount_rial,
    row.user_id,row.amount_rial,bankId,bankRecord.bookedAt,admin.subject,now),
  db.prepare(SETTLE).bind(bankRecord.bookedAt,bankId,row.id,row.user_id,
    row.amount_rial,row.id,row.user_id,bankId),
  db.prepare(EVENT).bind(eventId,eventId,bankId,row.id,row.user_id,bankId,now),
  db.prepare(GRANT).bind(paidUntil,now,row.id,row.user_id,eventId,bankId,row.paid_until),
  // Action is NOT NULL: if the grant was skipped by a stale-state CAS,
  // this scalar is NULL, forcing a rollback of all five statements.
  db.prepare(AUDIT).bind(auditId,admin.subject,row.id,eventId,bankId,
    row.user_id,paidUntil,now,row.id,now)
 ];
 let results;
 try{results=await db.batch(statements);}catch(_){throw Error('ATOMIC_SETTLEMENT_FAILED');}
 if(!Array.isArray(results)||results.length!==5||
    results.some(r=>r?.success!==true||r?.meta?.changes!==1))
  throw Error('SETTLEMENT_WRITE_NOT_CONFIRMED');
 return Object.freeze({orderId:row.id,userId:row.user_id,paidUntil,status:'SETTLED'});
}
module.exports=Object.freeze({commitVerifiedManualSettlement});
