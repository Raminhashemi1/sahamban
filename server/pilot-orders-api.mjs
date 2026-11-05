/*
 * SERVER-ONLY zero-cost controlled pilot order creation.
 * NOT a checkout or bank-transfer instruction. No payment is accepted here.
 * Caller MUST have a separately verified pilot token and a private D1 binding.
 */
const SQL_INSERT=[
 'INSERT INTO subscription_orders',
 '(id,user_id,plan_id,amount_rial,currency,state,created_at)',
 "SELECT ?,u.id,'SAHAMBAN_PRO_ANNUAL',?,'IRR','PENDING',?",
 "FROM sahamban_users u WHERE u.auth_subject=? AND u.status='ACTIVE'"
].join(' ');
const SQL_PENDING=[
 'SELECT o.id,o.amount_rial,o.currency,o.created_at',
 'FROM subscription_orders o JOIN sahamban_users u ON u.id=o.user_id',
 "WHERE u.auth_subject=? AND u.status='ACTIVE' AND o.state='PENDING' LIMIT 1"
].join(' ');
function validPrice(value){
 if(typeof value!=='string'||!/^[1-9][0-9]{0,11}$/.test(value))return null;
 const amount=Number(value);
 return Number.isSafeInteger(amount)&&amount>0&&amount<=999999999999?amount:null;
}
const noOrder=(reason,status)=>({reason,status});
async function createPilotPendingOrder(db,{authenticatedSubject,now,configuredPriceRial,enabled,makeOrderId}={}){
 if(enabled!==true)return noOrder('PILOT_ORDERS_DISABLED',503);
 const amount=validPrice(configuredPriceRial);
 if(amount===null)return noOrder('PRICE_NOT_CONFIGURED',503);
 if(typeof authenticatedSubject!=='string'||!authenticatedSubject||authenticatedSubject.length>256)return noOrder('NOT_AUTHENTICATED',401);
 if(typeof now!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now)||
    !Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now)return noOrder('SERVER_TIME_UNAVAILABLE',503);
 if(!db||typeof db.prepare!=='function')return noOrder('DATABASE_UNAVAILABLE',503);
 const orderId=typeof makeOrderId==='function'?makeOrderId():null;
 if(typeof orderId!=='string'||!/^ord_[a-f0-9]{32}$/.test(orderId))return noOrder('ORDER_ID_UNAVAILABLE',503);
 try{
  // A single statement ensures that only an existing, ACTIVE account may
  // create an order; the partial UNIQUE index enforces concurrency safety.
  const result=await db.prepare(SQL_INSERT).bind(orderId,amount,now,authenticatedSubject).run();
  if(result?.success!==true||result?.meta?.changes!==1)
   return noOrder('ACCOUNT_NOT_ELIGIBLE',403);
  return {status:201,reason:'AWAITING_OFFLINE_PAYMENT',orderId,amountRial:amount,
    currency:'IRR',planId:'SAHAMBAN_PRO_ANNUAL',createdAt:now,
    paymentsEnabled:false,proEnabled:false};
 }catch(_){
  // A uniqueness conflict or database outage must never create a second
  // pending order or grant access. Do not disclose SQL exception details.
  return noOrder('ORDER_UNAVAILABLE',503);
 }
}
async function findPilotPendingOrder(db,authenticatedSubject){
 if(!db||typeof db.prepare!=='function')return noOrder('DATABASE_UNAVAILABLE',503);
 try{
  const row=await db.prepare(SQL_PENDING).bind(authenticatedSubject).first();
  if(!row)return {status:200,reason:'NO_PENDING_ORDER',pending:false};
  if(typeof row.id!=='string'||!/^ord_[a-f0-9]{32}$/.test(row.id)||
    !Number.isSafeInteger(row.amount_rial)||row.amount_rial<=0||
    row.currency!=='IRR'||typeof row.created_at!=='string')
   return noOrder('INVALID_ORDER_STATE',503);
  return {status:200,reason:'AWAITING_OFFLINE_PAYMENT',pending:true,
    orderId:row.id,amountRial:row.amount_rial,currency:'IRR',createdAt:row.created_at,
    paymentsEnabled:false,proEnabled:false};
 }catch(_){return noOrder('ORDER_UNAVAILABLE',503);}
}
export {createPilotPendingOrder,findPilotPendingOrder,SQL_INSERT,SQL_PENDING};
