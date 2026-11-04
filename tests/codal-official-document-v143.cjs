'use strict';
// One read-only official CODAL Excel-service document probe: no proxy, no bypass, no portfolio.
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const SOURCE='https://excel.codal.ir/service/Excel/GetAll/OaYShM5Ay42fUq4E5eef5A%3D%3D/0';
const MAX_BYTES=15*1024*1024;
const fail=(status,fields={})=>({status,source:SOURCE,financialEvidence:'INSUFFICIENT_EVIDENCE',
 originalReportVerified:false,figuresVerified:false,tradingSignalsEnabled:false,...fields});
function detect(bytes,contentType=''){
 const b=Buffer.from(bytes);
 const type=String(contentType).toLowerCase();
 if(b.length>=4&&b.subarray(0,4).equals(Buffer.from([80,75,3,4])))return 'XLSX_OR_ZIP_UNINSPECTED';
 if(b.length>=8&&b.subarray(0,8).equals(Buffer.from([208,207,17,224,161,177,26,225])))return 'XLS_OLE_UNINSPECTED';
 if(b.length>=5&&b.subarray(0,5).toString('ascii')==='%PDF-')return 'PDF_UNINSPECTED';
 const prefix=b.subarray(0,2048).toString('utf8').replace(/^\uFEFF/,'').trimStart();
 if(/^(?:<!doctype\s+html|<html\b|<table\b|<\?xml\b)/i.test(prefix)||/text\/html/.test(type))
  return 'HTML_OR_XML_UNINSPECTED';
 return 'UNKNOWN';
}
async function probe({fetchImpl=globalThis.fetch,url=SOURCE,timeoutMs=14000}={}){
 // This diagnostic must never accept arbitrary URLs or send requests to user-provided hosts.
 if(url!==SOURCE)return fail('INVALID_OFFICIAL_SOURCE');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const res=await fetchImpl(SOURCE,{method:'GET',redirect:'error',cache:'no-store',
   signal:controller.signal,headers:{Accept:'application/octet-stream,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/html;q=0.5'}});
  const contentType=(res.headers?.get('content-type')||'').slice(0,160);
  const length=res.headers?.get('content-length');
  if(res.status===429)return fail('UNVERIFIED_RATE_LIMIT',{httpStatus:429});
  if(!res.ok)return fail('UNVERIFIED_HTTP',{httpStatus:res.status,contentType});
  if(length!==null&&(/^\d+$/.test(length)===false||Number(length)>MAX_BYTES))return fail('UNVERIFIED_RESPONSE_SIZE',{httpStatus:res.status});
  if(!res.body||typeof res.body.getReader!=='function')return fail('UNVERIFIED_NO_RESPONSE_STREAM',{httpStatus:res.status});
  const reader=res.body.getReader(),hash=createHash('sha256'),prefix=[],prefixSize=2048;
  let total=0;
  try{
   while(true){
    const next=await reader.read();
    if(next.done)break;
    if(!(next.value instanceof Uint8Array))return fail('UNVERIFIED_RESPONSE_CHUNK');
    total+=next.value.byteLength;
    if(total>MAX_BYTES)return fail('UNVERIFIED_RESPONSE_SIZE',{httpStatus:res.status});
    hash.update(next.value);
    if(prefixSize>prefix.reduce((sum,b)=>sum+b.byteLength,0))
     prefix.push(next.value.slice(0,prefixSize-prefix.reduce((sum,b)=>sum+b.byteLength,0)));
   }
  }finally{try{await reader.cancel();}catch{}reader.releaseLock();}
  if(total<8)return fail('UNVERIFIED_EMPTY_OR_SHORT',{httpStatus:res.status});
  const format=detect(Buffer.concat(prefix.map(x=>Buffer.from(x))),contentType);
  if(format==='UNKNOWN')return fail('UNVERIFIED_UNKNOWN_FORMAT',{httpStatus:res.status,contentType,bytes:total});
  // An HTTP 200 page (even an HTML table) may be a block/redirect/login/error page.
  // Never equate an arbitrary HTML/XML response with an original financial document.
  if(format==='HTML_OR_XML_UNINSPECTED')return fail('UNVERIFIED_HTML_OR_XML_RESPONSE',{
   httpStatus:res.status,contentType,bytes:total,contentFormat:format});
  if(/(?:text\/html|application\/json|application\/xml|text\/xml)/i.test(contentType))
   return fail('UNVERIFIED_CONTENT_TYPE_MISMATCH',{httpStatus:res.status,contentType,bytes:total,contentFormat:format});
  // Hashing bytes from the official URL is transport evidence only. ZIP is not proof of XLSX.
  return fail('OFFICIAL_URL_RESPONSE_HASHED_UNVERIFIED',{httpStatus:res.status,contentType,bytes:total,
   contentFormat:format,sha256:hash.digest('hex'),
   note:'Exact bytes received from configured HTTPS endpoint; file container, publication identity and financial figures are not verified.'});
 }catch(e){
  return fail(e?.name==='AbortError'?'UNVERIFIED_TIMEOUT':'UNVERIFIED_NETWORK',{errorCategory:e?.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR'});
 }finally{clearTimeout(timeout);}
}
async function main(){
 const report={checkedAt:new Date().toISOString(),...(await probe())};
 fs.mkdirSync('test-artifacts',{recursive:true});
 fs.writeFileSync('test-artifacts/codal-official-document-v143.json',JSON.stringify(report,null,2)+'\n');
 process.stdout.write('CODAL_DOCUMENT_STATUS: '+report.status+'\n');
}
if(require.main===module)main().catch(e=>{console.error('probe failed safely',e?.name);process.exitCode=1;});
module.exports={SOURCE,MAX_BYTES,detect,probe};
