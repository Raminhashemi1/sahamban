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
module.exports={createOrder};
