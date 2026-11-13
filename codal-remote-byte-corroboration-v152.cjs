'use strict';
/* v152: independently fetch exact bytes from a tightly constrained CODAL URL.
   A byte-for-byte match is NOT a verification of financial figures, filing metadata,
   server-side receipt, or authority to trade. Never unlock the entry gate. */
const {createHash,webcrypto}=require('node:crypto');
const intake=require('./codal-original-intake-v138.js');
const MAX_BYTES=15*1024*1024;
function fail(reason){return {status:'REMOTE_CORROBORATION_INSUFFICIENT',reason,
 originVerified:false,figuresVerified:false,entryEligible:false,tradingSignalsEnabled:false};}
function verifiedUrl(filing){
 // The local intake prefers originalUrl when both URL fields are supplied.
 // Refuse contradictory identities instead of silently choosing one source.
 if(filing&&typeof filing==='object'&&
    typeof filing.originalUrl==='string'&&typeof filing.reportUrl==='string'){
  let original,report;
  try{
   original=new URL(filing.originalUrl);
   report=new URL(filing.reportUrl);
  }catch{return null;}
  if(original.href!==report.href)return null;
 }
 const safe=intake.safeFiling(filing);
 if(!safe)return null;
 let u;
 try{u=new URL(safe.reportUrl);}catch{return null;}
 if(u.protocol!=='https:'||!['codal.ir','www.codal.ir'].includes(u.hostname.toLowerCase())||
  u.username||u.password||u.port||u.hash)return null;
 const decision=/^\/Reports\/[A-Za-z0-9._/-]+\.aspx$/i.test(u.pathname);
 const download=/^(?:\/DownloadFile\.aspx|\/Reports\/DownloadFile\.aspx)$/i.test(u.pathname);
 if(!decision&&!download)return null;
 // CODAL's TracingNo is a numeric filing identifier. LetterSerial/hs is a
 // separate opaque document token; never compare these two different fields.
 const token=download?u.searchParams.getAll('hs'):u.searchParams.getAll('LetterSerial');
 const expected=filing&&typeof filing.letterSerial==='string'?filing.letterSerial:null;
 if(!expected||!/^[A-Za-z0-9+/_-]{8,128}={0,2}$/.test(expected)||
  token.length!==1||token[0]!==expected)return null;
 const allowed=download?new Set(['hs','ft','let']):new Set(['LetterSerial','rt','let','ct','ft']);
 if([...u.searchParams.keys()].some(key=>!allowed.has(key)))return null;
 for(const key of allowed)if(u.searchParams.getAll(key).length>1)return null;
 if(download){
  const ft=u.searchParams.get('ft'),letType=u.searchParams.get('let');
  if(ft!==null&&!/^\d{1,4}$/.test(ft))return null;
  if(letType!==null&&!/^\d{1,3}$/.test(letType))return null;
 }else{
  for(const key of ['rt','let','ct','ft']){
   const value=u.searchParams.get(key);
   if(value!==null&&!/^-?\d{1,4}$/.test(value))return null;
  }
 }
 return {url:u.href,filing:safe,letterSerial:expected};
}
async function compareRemoteCodalFile(file,filing,{fetcher=globalThis.fetch,subtle=webcrypto.subtle,timeoutMs=12000}={}){
 let identity,local;
 try{identity=verifiedUrl(filing);}catch{return fail('INVALID_OFFICIAL_REPORT_IDENTITY_OR_URL');}
 if(!identity)return fail('INVALID_OFFICIAL_REPORT_IDENTITY_OR_URL');
 if(typeof fetcher!=='function')return fail('NETWORK_FETCH_UNAVAILABLE');
 // The deadline starts before local inspection: a hostile or stalled File
 // implementation must not bypass the review's bounded-latency contract.
 const deadline=Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=12000?timeoutMs:12000;
 let signal;
 try{
  if(typeof AbortSignal==='undefined'||typeof AbortSignal.timeout!=='function')
   return fail('REMOTE_TIMEOUT_UNAVAILABLE');
  signal=AbortSignal.timeout(deadline);
 }catch{return fail('REMOTE_TIMEOUT_UNAVAILABLE');}
 const expired=new Promise((_,reject)=>{
  const abort=()=>reject(new Error('CODAL_REMOTE_TIMEOUT'));
  if(signal.aborted)abort();
  else signal.addEventListener('abort',abort,{once:true});
 });
 const withinDeadline=p=>Promise.race([p,expired]);
 try{local=await withinDeadline(intake.inspect(file,filing,{subtle}));}
 catch{return fail(signal.aborted?'LOCAL_FILE_INSPECTION_DEADLINE_EXCEEDED':'LOCAL_FILE_INSPECTION_FAILED');}
 if(!local||local.status!=='LOCAL_FILE_FINGERPRINT_ONLY')return fail('LOCAL_FILE_'+(local?.reason||'UNREADABLE'));
 let response;
 try{
  // The caller cannot opt into automatic redirects; any 3xx is rejected.
  response=await withinDeadline(fetcher(identity.url,{method:'GET',redirect:'manual',
   cache:'no-store',credentials:'omit',headers:{Accept:'application/pdf,application/octet-stream,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},
   signal}));
 }catch{return fail(signal.aborted?'REMOTE_DEADLINE_EXCEEDED':'REMOTE_FETCH_FAILED');}
 // Rejected responses must not strand an open connection.
 // Never await cancellation: a broken stream may stall it indefinitely.
 const discard=()=>{
  try{Promise.resolve(response?.body?.cancel?.()).catch(()=>{});}catch{}
 };
 let reader,declared;
 try{
  if(!response||response.status!==200||response.redirected===true||
   !response.body||typeof response.body.getReader!=='function'){
   discard();return fail('REMOTE_HTTP_STATUS_OR_STREAM_UNAVAILABLE');
  }
  if(typeof response.url!=='string'||response.url!==identity.url){
   discard();return fail('REMOTE_RESPONSE_URL_MISMATCH');
  }
  declared=response.headers?.get?.('content-length');
  if(declared!==null&&declared!==undefined&&
   (!/^\d+$/.test(declared)||Number(declared)>Math.min(MAX_BYTES,local.fileSizeBytes))){
   discard();return fail('REMOTE_CONTENT_LENGTH_INVALID');
  }
  reader=response.body.getReader();
 }catch{
  discard();return fail('REMOTE_RESPONSE_METADATA_OR_READER_FAILED');
 }
 const digest=createHash('sha256');
 let size=0,head=Buffer.alloc(0);
 try{
  for(;;){
   const {done,value}=await withinDeadline(reader.read());
   if(done)break;
   if(!(value instanceof Uint8Array)||value.length===0)throw Error('INVALID_STREAM');
   size+=value.length;
   if(size>MAX_BYTES||size>local.fileSizeBytes)throw Error('TOO_LARGE');
   if(head.length<8)head=Buffer.concat([head,Buffer.from(value.subarray(0,8-head.length))]);
   digest.update(value);
  }
 }catch{
  // Cancellation can itself stall on a broken or adversarial stream.
  try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}
  return fail(signal.aborted?'REMOTE_DEADLINE_EXCEEDED':'REMOTE_STREAM_ERROR_OR_TOO_LARGE');
 }
 if(size===0||size!==local.fileSizeBytes)return fail('REMOTE_SIZE_MISMATCH');
 // A matching hash is not sufficient if the file is a forged container or HTML page.
 const signature=local.format==='PDF'?head.subarray(0,5).equals(Buffer.from('%PDF-')):
  local.format==='XLSX_ZIP_CONTAINER_UNINSPECTED'?head.subarray(0,4).equals(Buffer.from([80,75,3,4])):
  local.format==='XLS_OLE_CONTAINER_UNINSPECTED'?head.subarray(0,8).equals(Buffer.from([208,207,17,224,161,177,26,225])):false;
 if(!signature)return fail('REMOTE_FILE_SIGNATURE_MISMATCH');
 const remoteHash=digest.digest('hex');
 if(remoteHash!==local.sha256)return fail('REMOTE_SHA256_MISMATCH');
 return {status:'CODAL_REMOTE_BYTES_MATCH_REVIEW_ONLY',symbol:identity.filing.symbol,
  tracingNo:identity.filing.tracingNo,reportUrl:identity.url,sha256:remoteHash,format:local.format,
  fileSizeBytes:size,originVerified:false,figuresVerified:false,
  entryEligible:false,tradingSignalsEnabled:false,
  note:'The supplied file bytes matched a direct HTTPS response from a CODAL-hosted URL. This does not verify the filing-to-document association, reported figures, accounting interpretation or eligibility for an investment decision.'};
}
module.exports={compareRemoteCodalFile,verifiedUrl,MAX_BYTES};
