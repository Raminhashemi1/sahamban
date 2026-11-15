'use strict';
// Sahmino STAGING-ONLY server: localhost, no provider verification, no grants.
// Do NOT expose publicly, deploy, or connect production clients.
const http=require('node:http');
const {CHANNELS,PLAN_DAYS}=require('../billing/staging/sahmino-channel-policy-v1.cjs');
const {createOfflineReceiptBoundary}=require('../billing/staging/sahmino-offline-auth-boundary-v1.cjs');
const MAX_BYTES=8192;
const defaultVerifySession=async()=>null; // Unconfigured authentication always rejects.
function reply(res,status,body){
 res.writeHead(status,{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff'});
 res.end(JSON.stringify({...body,realEntitlement:false}));
}
function createStagingServer({verifySession=defaultVerifySession,buildChannel='WEB_DIRECT'}={}){
 if(typeof verifySession!=='function'||!CHANNELS.includes(buildChannel))
  throw new TypeError('INVALID_STAGING_SERVER_CONFIGURATION');
 const boundary=createOfflineReceiptBoundary({verifySession,buildChannel});
 return http.createServer(async(req,res)=>{
  const path=req.url?.split('?')[0];
  if(req.method==='GET'&&path==='/healthz'){
   return reply(res,200,{status:'ok',service:'sahmino-staging',billingEnabled:false});
  }
  if(req.method==='GET'&&path==='/api/v1/plans'){
   return reply(res,200,{simulationOnly:true,channels:CHANNELS,planDays:PLAN_DAYS,
    checkoutEnabled:false,verificationEnabled:false});
  }
  if(path==='/api/v1/billing/verify'&&req.method==='POST'){
   if(req.headers['content-type']?.split(';')[0]?.trim().toLowerCase()!=='application/json')
    return reply(res,415,{status:'DENIED',reason:'JSON_REQUIRED'});
   const length=Number(req.headers['content-length']);
   if(req.headers['content-length']!==undefined&&
      (!Number.isSafeInteger(length)||length<0||length>MAX_BYTES))
    return reply(res,413,{status:'DENIED',reason:'REQUEST_TOO_LARGE'});
   const chunks=[];let size=0;
   try{
    for await(const chunk of req){
     size+=chunk.length;
     if(size>MAX_BYTES)return reply(res,413,{status:'DENIED',reason:'REQUEST_TOO_LARGE'});
     chunks.push(chunk);
    }
   }catch{return reply(res,400,{status:'DENIED',reason:'BAD_REQUEST'});}
   let payload;
   try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
   catch{return reply(res,400,{status:'DENIED',reason:'INVALID_JSON'});}
   if(!payload||typeof payload!=='object'||Array.isArray(payload))
    return reply(res,400,{status:'DENIED',reason:'INVALID_JSON'});
   const authorization=req.headers.authorization;
   // Never trust an authenticatedPrincipal, buildChannel or accountId in request body.
   const result=await boundary.evaluate({authorization,claim:payload});
   return reply(res,503,{status:'DENIED',reason:result.reason,
    providerVerified:false,billingEnabled:false});
  }
  return reply(res,404,{status:'not_found',billingEnabled:false});
 });
}
if(require.main===module){
 const port=Number(process.env.SAHMINO_STAGING_PORT||8787);
 if(!Number.isInteger(port)||port<1||port>65535)
  throw new Error('INVALID_STAGING_PORT');
 createStagingServer().listen(port,'127.0.0.1',()=>{
  process.stdout.write('Sahmino staging-only loopback server listening; checkout DISABLED\n');
 });
}
module.exports=Object.freeze({createStagingServer});
