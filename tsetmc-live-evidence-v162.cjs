'use strict';
/* Bounded, read-only collection of two fixed TSETMC CDN endpoints.
 * A byte-identical capture is evidence of what an HTTP response supplied,
 * NOT source/issuer authentication, adjustment-basis proof, or trade eligibility. */
const {createHash}=require('node:crypto');
const HOST='https://cdn.tsetmc.com';
const MAX_BYTES=1024*1024;
const MAX_TIMEOUT_MS=12000;
const fail=(reason)=>({status:'COLLECTION_INSUFFICIENT',reason,
 sourceAuthenticated:false,priceBasisVerified:false,capitalActionsVerified:false,
 entryEligible:false,tradingSignalsEnabled:false});
const validCode=v=>typeof v==='string'&&/^\d{8,25}$/.test(v)&&!/^[0]+$/.test(v);
const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');
const pathFor=(kind,code)=>kind==='daily'
 ?'/api/ClosingPrice/GetClosingPriceDailyList/'+code+'/0'
 :'/api/ClosingPrice/GetPriceAdjustList/'+code;
const isDate=d=>{
 const s=String(d??'');
 if(!/^(19|20|21)\d{6}$/.test(s))return false;
 const y=+s.slice(0,4),m=+s.slice(4,6),day=+s.slice(6),dt=new Date(Date.UTC(y,m-1,day,12));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===m&&dt.getUTCDate()===day;
};
function hasDuplicateJsonObjectKeys(raw){
 const stack=[];
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(ch==='"'){
   const start=i;let escaped=false;
   for(i++;i<raw.length;i++){
    if(escaped){escaped=false;continue;}
    if(raw[i]==='\\'){escaped=true;continue;}
    if(raw[i]==='"')break;
   }
   if(i>=raw.length)return false;
   let j=i+1;while(j<raw.length&&/\s/.test(raw[j]))j++;
   if(raw[j]===':'&&stack.length&&stack[stack.length-1].type==='object'){
    let key;try{key=JSON.parse(raw.slice(start,i+1));}catch{return false;}
    const object=stack[stack.length-1];
    if(object.keys.has(key))return true;
    object.keys.add(key);
   }
  }else if(ch==='{')stack.push({type:'object',keys:new Set()});
  else if(ch==='[')stack.push({type:'array'});
  else if(ch==='}'||ch===']')stack.pop();
 }
 return false;
}
function validate(kind,data){
 const key=kind==='daily'?'closingPriceDaily':'priceAdjust';
 const rows=data?.[key];
 if(!Array.isArray(rows)||rows.length>10000)return 'INVALID_'+kind.toUpperCase()+'_PAYLOAD';
 const seen=new Set();
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row)||!isDate(row.dEven))
   return 'INVALID_'+kind.toUpperCase()+'_DATE';
  if(kind==='daily'){
   if(typeof row.pClosing!=='number'||!Number.isFinite(row.pClosing)||row.pClosing<=0)
    return 'INVALID_DAILY_CLOSE';
   const day=String(row.dEven);if(seen.has(day))return 'DUPLICATE_DAILY_DATE';seen.add(day);
  }
 }
 return null;
}
async function captureTsetmcEvidence(insCode,{fetcher=globalThis.fetch,timeoutMs=MAX_TIMEOUT_MS,now=()=>new Date()}={}){
 if(!validCode(insCode))return fail('INVALID_INSTRUMENT_CODE');
 if(typeof fetcher!=='function')return fail('FETCH_UNAVAILABLE');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>MAX_TIMEOUT_MS)
  return fail('INVALID_TIMEOUT_POLICY');
 if(typeof AbortController!=='function')return fail('ABORT_CONTROLLER_UNAVAILABLE');
 const controller=new AbortController();
 let timer;
 const expires=new Promise((_,reject)=>{
  timer=setTimeout(()=>{controller.abort();reject(new Error('TIMEOUT'));},timeoutMs);
 });
 const within=p=>Promise.race([p,expires]);
 const responses={};
 try{
  for(const kind of ['daily','adjustments']){
   const path=pathFor(kind,insCode),url=HOST+path;
   const response=await within(Promise.resolve().then(()=>fetcher(url,{
    method:'GET',redirect:'manual',signal:controller.signal,
    headers:{Accept:'application/json'},cache:'no-store',credentials:'omit'
   })));
   if(!response||response.status!==200)return fail(kind.toUpperCase()+'_HTTP_NOT_OK');
   if(response.url!==url)return fail(kind.toUpperCase()+'_RESPONSE_URL_MISMATCH');
   const type=(response.headers?.get?.('content-type')||'').toLowerCase();
   if(!/^application\/json(?:\s*;|$)/.test(type))return fail(kind.toUpperCase()+'_NOT_JSON');
   const declared=Number(response.headers?.get?.('content-length'));
   if(declared>MAX_BYTES)return fail(kind.toUpperCase()+'_TOO_LARGE');
   if(!response.body||typeof response.body.getReader!=='function')
    return fail(kind.toUpperCase()+'_STREAM_UNAVAILABLE');
   const reader=response.body.getReader(),chunks=[];let total=0;
   try{
    while(true){
     const part=await within(reader.read());
     if(part.done)break;
     if(!(part.value instanceof Uint8Array))return fail(kind.toUpperCase()+'_INVALID_STREAM');
     total+=part.value.byteLength;
     if(total>MAX_BYTES){controller.abort();return fail(kind.toUpperCase()+'_TOO_LARGE');}
     chunks.push(Buffer.from(part.value));
    }
   }finally{try{reader.releaseLock();}catch{}}
   if(!total)return fail(kind.toUpperCase()+'_EMPTY_BODY');
   const bytes=Buffer.concat(chunks,total),raw=bytes.toString('utf8');
   if(Buffer.from(raw,'utf8').compare(bytes)!==0)return fail(kind.toUpperCase()+'_INVALID_UTF8');
   if(hasDuplicateJsonObjectKeys(raw))return fail(kind.toUpperCase()+'_DUPLICATE_JSON_KEYS');
   let parsed;
   try{parsed=JSON.parse(raw);}catch{return fail(kind.toUpperCase()+'_MALFORMED_JSON');}
   const problem=validate(kind,parsed);
   if(problem)return fail(problem);
   responses[kind]={url,contentType:type,sizeBytes:total,sha256:sha256(bytes),
    rowCount:parsed[kind==='daily'?'closingPriceDaily':'priceAdjust'].length,
    rawBodyUtf8:raw};
  }
  const collectedAt=now();
  if(!(collectedAt instanceof Date)||!Number.isFinite(collectedAt.getTime()))
   return fail('INVALID_CAPTURE_CLOCK');
  return {status:'CAPTURED_FOR_MANUAL_REVIEW',insCode,collectedAt:collectedAt.toISOString(),
   host:HOST,responses,
   sourceAuthenticated:false,priceBasisVerified:false,capitalActionsVerified:false,
   entryEligible:false,tradingSignalsEnabled:false,
   note:'HTTPS response bytes from fixed URLs are recorded with SHA-256, but source ownership, DNS, issuer, historical adjustment basis and price events have not been independently authenticated. Do not trade or adjust history.'};
 }catch(e){return fail(e?.message==='TIMEOUT'||controller.signal.aborted?'COLLECTION_DEADLINE_EXCEEDED':'NETWORK_OR_STREAM_ERROR');}
 finally{clearTimeout(timer);controller.abort();}
}
module.exports=Object.freeze({captureTsetmcEvidence,MAX_BYTES,HOST});