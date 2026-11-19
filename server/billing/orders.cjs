'use strict';
const {getPlan}=require('./catalog.cjs');
const ORDER=/^ord_[a-f0-9]{32}$/;
async function createOrder(db,{subject,planId,now,makeId}={}){
 const p=getPlan(planId);
 if(!subject)return {status:401,error:'UNAUTHENTICATED'};
 if(!p)return {status:400,error:'UNKNOWN_PLAN'};
 if(!db||typeof db.prepare!=='function')return {status:503,error:'DATABASE_UNAVAILABLE'};
 const id=typeof makeId==='function'?makeId():null;
 if(typeof id!=='string'||!ORDER.test(id))return {status:503,error:'ORDER_ID_UNAVAILABLE'};
 try{
  const result=await db.prepare("INSERT INTO billing_orders(id,user_id,plan_id,status,created_at) SELECT ?,id,?,'CREATED',? FROM sahamban_users WHERE auth_subject=? AND status='ACTIVE'")
   .bind(id,p.id,now,subject).run();
  if(result?.success!==true||result?.meta?.changes!==1)return {status:403,error:'ACCOUNT_NOT_ELIGIBLE'};
  return {status:201,order:{id,planId:p.id,days:p.days}};
 }catch(_){return {status:503,error:'ORDER_CREATE_FAILED'};}
}


function parseStoreSkuMap(raw) {
 try {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const ids = ['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D',
   'SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D'];
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).length !== ids.length ||
      ids.some(id => typeof value[id] !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(value[id])) ||
      new Set(Object.values(value)).size !== ids.length) return null;
  return value;
 } catch (_) { return null; }
}

/** Creates an order bound to the server-selected Myket deployment and its SKU. */
async function createMyketOrder(db, {subject, planId, now, makeId, skuMap: rawSkuMap} = {}) {
 const plan = getPlan(planId);
 if (!subject) return {status:401,error:'UNAUTHENTICATED'};
 if (!plan) return {status:400,error:'UNKNOWN_PLAN'};
 const mapping = parseStoreSkuMap(rawSkuMap);
 if (!mapping) return {status:503,error:'MYKET_SKU_MAP_NOT_CONFIGURED'};
 if (!db || typeof db.prepare !== 'function') return {status:503,error:'DATABASE_UNAVAILABLE'};
 const id = typeof makeId === 'function' ? makeId() : null;
 if (typeof id !== 'string' || !ORDER.test(id)) return {status:503,error:'ORDER_ID_UNAVAILABLE'};
 try {
  const result = await db.prepare("INSERT INTO billing_orders(id,user_id,plan_id,status,store,store_product_id,created_at) SELECT ?,id,?,'CREATED','MYKET',?,? FROM sahamban_users WHERE auth_subject=? AND status='ACTIVE'")
   .bind(id,plan.id,mapping[plan.id],now,subject).run();
  if (result?.success !== true || result?.meta?.changes !== 1)
   return {status:403,error:'ACCOUNT_NOT_ELIGIBLE'};
  return {status:201,order:{id,planId:plan.id,days:plan.days,store:'MYKET'}};
 } catch (_) { return {status:503,error:'ORDER_CREATE_FAILED'}; }
}

module.exports = {createOrder, createMyketOrder, parseStoreSkuMap};

