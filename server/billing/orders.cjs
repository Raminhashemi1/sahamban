'use strict';
const {isValidUserId}=require('./user-id.cjs');
const {getPlan}=require('./catalog.cjs');
const ORDER=/^ord_[a-f0-9]{32}$/;
async function createOrder(db,{subject,userId,planId,now,makeId,skuMap:rawSkuMap}={}){
 const p=getPlan(planId);
 if(!(typeof subject==='string'&&subject.length>0&&subject.length<=256)&&!(isValidUserId(userId)))return {status:401,error:'UNAUTHENTICATED'};
 if(!p)return {status:400,error:'UNKNOWN_PLAN'};
 const mapping=parseStoreSkuMap(rawSkuMap);
 if(!mapping)return {status:503,error:'BAZAAR_SKU_MAP_NOT_CONFIGURED'};
 if(!db||typeof db.prepare!=='function')return {status:503,error:'DATABASE_UNAVAILABLE'};
 const id=typeof makeId==='function'?makeId():null;
 if(typeof id!=='string'||!ORDER.test(id))return {status:503,error:'ORDER_ID_UNAVAILABLE'};
 try{
  const query=userId
   ? "INSERT INTO billing_orders(id,user_id,plan_id,status,store,store_product_id,amount_irr,created_at) SELECT ?,id,?,'CREATED','BAZAAR',?,?,? FROM sahamban_users WHERE id=? AND status='ACTIVE'"
   : "INSERT INTO billing_orders(id,user_id,plan_id,status,store,store_product_id,amount_irr,created_at) SELECT ?,id,?,'CREATED','BAZAAR',?,?,? FROM sahamban_users WHERE auth_subject=? AND status='ACTIVE'";
  const result=await db.prepare(query).bind(id,p.id,mapping[p.id],p.priceRial,now,userId||subject).run();
  if(result?.success!==true||result?.meta?.changes!==1)return {status:403,error:'ACCOUNT_NOT_ELIGIBLE'};
  return {status:201,order:{id,planId:p.id,days:p.days,priceRial:p.priceRial,store:'BAZAAR'}};
 }catch(_){return {status:503,error:'ORDER_CREATE_FAILED'};}
}
function parseStoreSkuMap(raw){
 try{
  const value=typeof raw==='string'?JSON.parse(raw):raw;
  const ids=['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D'];
  if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==5||
   ids.some(id=>typeof value[id]!=='string'||!/^[A-Za-z0-9._-]{1,100}$/.test(value[id]) || value[id].startsWith('REPLACE_'))||
   new Set(Object.values(value)).size!==5)return null;
  return value;
 }catch(_){return null;}
}
async function createMyketOrder(db,{subject,userId,planId,now,makeId,skuMap:rawSkuMap}={}){
 const plan=getPlan(planId);
 if(!(typeof subject==='string'&&subject.length>0&&subject.length<=256)&&!(isValidUserId(userId)))return {status:401,error:'UNAUTHENTICATED'};
 if(!plan)return {status:400,error:'UNKNOWN_PLAN'};
 const mapping=parseStoreSkuMap(rawSkuMap);
 if(!mapping)return {status:503,error:'MYKET_SKU_MAP_NOT_CONFIGURED'};
 if(!db||typeof db.prepare!=='function')return {status:503,error:'DATABASE_UNAVAILABLE'};
 const id=typeof makeId==='function'?makeId():null;
 if(typeof id!=='string'||!ORDER.test(id))return {status:503,error:'ORDER_ID_UNAVAILABLE'};
 try{
  const query=userId
   ? "INSERT INTO billing_orders(id,user_id,plan_id,status,store,store_product_id,amount_irr,created_at) SELECT ?,id,?,'CREATED','MYKET',?,?,? FROM sahamban_users WHERE id=? AND status='ACTIVE'"
   : "INSERT INTO billing_orders(id,user_id,plan_id,status,store,store_product_id,amount_irr,created_at) SELECT ?,id,?,'CREATED','MYKET',?,?,? FROM sahamban_users WHERE auth_subject=? AND status='ACTIVE'";
  const result=await db.prepare(query).bind(id,plan.id,mapping[plan.id],plan.priceRial,now,userId||subject).run();
  if(result?.success!==true||result?.meta?.changes!==1)return {status:403,error:'ACCOUNT_NOT_ELIGIBLE'};
  return {status:201,order:{id,planId:plan.id,days:plan.days,priceRial:plan.priceRial,store:'MYKET'}};
 }catch(_){return {status:503,error:'ORDER_CREATE_FAILED'};}
}
module.exports={createOrder,createMyketOrder,parseStoreSkuMap};
