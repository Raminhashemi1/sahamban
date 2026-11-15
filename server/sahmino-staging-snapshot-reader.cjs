'use strict';
// Synthetic-only read adapter for the DISPOSABLE PostgreSQL staging schema.
// DB query is injected: this module never opens connections or grants access.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SQL= 'SELECT expiry_at, revision FROM sahmino_billing_staging.entitlement_snapshot WHERE account_id=$1::uuid LIMIT 1';
const failure=reason=>Object.freeze({simulationOnly:true,realEntitlement:false,reason,syntheticActive:false});
function createStagingSnapshotReader({query}={}){
 if(typeof query!=='function')throw new TypeError('DATABASE_QUERY_REQUIRED');
 return Object.freeze({
  async read(principal){
   // This object MUST be obtained from an independent session verifier.
   if(!principal||principal.authenticated!==true||typeof principal.accountId!=='string'||
      !UUID.test(principal.accountId))return failure('AUTHENTICATED_ACCOUNT_REQUIRED');
   let result;
   try{result=await query(SQL,[principal.accountId]);}
   catch{return failure('STAGING_DATABASE_UNAVAILABLE');}
   if(!result||!Array.isArray(result.rows)||result.rows.length>1)
    return failure('STAGING_DATABASE_INVALID_RESULT');
   if(result.rows.length===0)return failure('NO_SYNTHETIC_SNAPSHOT');
   const row=result.rows[0];
   if(!row||typeof row!=='object'||!Number.isSafeInteger(Number(row.revision))||
      Number(row.revision)<0)
    return failure('STAGING_DATABASE_INVALID_RESULT');
   const expiry=row.expiry_at;
   const ms=expiry instanceof Date?expiry.getTime():
    (typeof expiry==='string'?Date.parse(expiry):NaN);
   if(expiry!==null&&!Number.isFinite(ms))
    return failure('STAGING_DATABASE_INVALID_RESULT');
   const expiresAtUtc=expiry===null?null:new Date(ms).toISOString();
   return Object.freeze({simulationOnly:true,realEntitlement:false,reason:'STAGING_READ_ONLY',
    syntheticActive:expiresAtUtc!==null&&ms>Date.now(),
    expiresAtUtc,revision:Number(row.revision)});
  }
 });
}
module.exports=Object.freeze({createStagingSnapshotReader,STAGING_READ_SQL:SQL});
