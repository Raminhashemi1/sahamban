'use strict';
// Read-only probe of the already-deployed CODAL Worker proxy.
// Uses one public issuer symbol; no user holdings, report downloads or private data.
const fs=require('node:fs');
const {verifySearchMetadata}=require('./codal-search-quality.cjs');
const ROOT='https://sahamban-pro-pilot.rhashemi284.workers.dev';
const ORIGIN='https://raminhashemi1.github.io';
const SYMBOL='ونوین';
const endpoint=ROOT+'/api/v1/public/codal-search?symbol='+encodeURIComponent(SYMBOL);
const report={checkedAt:new Date().toISOString(),source:endpoint,symbol:SYMBOL,scope:'Read-only request to the deployed Worker proxy with exact PWA Origin; no filing downloads.',status:'RUNNING'};
function decodeXml(value){return String(value||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function parsePayload(raw,contentType){
 const source=String(raw||'').replace(/^\uFEFF/,'').trim();
 if(!source)throw Error('EMPTY_UPSTREAM_BODY');
 if(/json/i.test(contentType)||source.startsWith('{'))return JSON.parse(source);
 if(!source.startsWith('<'))throw Error('UNSUPPORTED_UPSTREAM_FORMAT');
 const tag=(chunk,name)=>{const m=chunk.match(new RegExp('<(?:[\\w.-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?'+name+'\\s*>','i'));return m?decodeXml(m[1].replace(/<[^>]+>/g,'').trim()):'';};
 const matches=[...source.matchAll(/<(?:[\\w.-]+:)?CodalLetterHeaderDto(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?CodalLetterHeaderDto\\s*>/gi)];
 if(!/<(?:[\\w.-]+:)?SearchReportListDto(?:\\s|>)/i.test(source)&&!matches.length)throw Error('UNRECOGNIZED_CODAL_XML');
 const letters=matches.map(m=>({Symbol:tag(m[1],'Symbol'),Title:tag(m[1],'Title'),TracingNo:tag(m[1],'TracingNo'),PublishDateTime:tag(m[1],'PublishDateTime'),SentDateTime:tag(m[1],'SentDateTime'),HasExcel:/^true$/i.test(tag(m[1],'HasExcel')),HasPdf:/^true$/i.test(tag(m[1],'HasPdf'))}));
 const total=tag(source,'Total');
 return {Total:total===''?letters.length:Number(total),Page:Number(tag(source,'Page')||1),Letters:letters};
}
function finish(status,extra={}) {
 report.status=status;Object.assign(report,extra);
 fs.mkdirSync('test-artifacts',{recursive:true});
 fs.writeFileSync('test-artifacts/codal-worker-live-v149.json',JSON.stringify(report,null,2)+'\n');
 console.log('CODAL_WORKER_STATUS: '+status);
}
async function main(){
 try{
  const preflight=await fetch(endpoint,{method:'OPTIONS',headers:{
   Origin:ORIGIN,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'accept'
  },signal:AbortSignal.timeout(15000)});
  if(preflight.status!==204||preflight.headers.get('access-control-allow-origin')!==ORIGIN){
   finish('UNVERIFIED_PREFLIGHT',{preflightStatus:preflight.status,allowOrigin:preflight.headers.get('access-control-allow-origin')});
   return;
  }
  const denied=await fetch(endpoint,{headers:{Origin:'https://untrusted.invalid',Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(denied.status!==403){
   finish('SECURITY_CHECK_FAILED',{wrongOriginStatus:denied.status});
   process.exitCode=1;
   return;
  }
  const response=await fetch(endpoint,{headers:{Origin:ORIGIN,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const contentType=response.headers.get('content-type')||'';
  if(response.headers.get('access-control-allow-origin')!==ORIGIN){
   finish('UNVERIFIED_CORS_HEADER',{httpStatus:response.status,contentType,allowOrigin:response.headers.get('access-control-allow-origin')});
   return;
  }
  if(!response.ok){
   finish(response.status===429?'UNVERIFIED_RATE_LIMIT':'UNVERIFIED_WORKER_OR_UPSTREAM_HTTP',{httpStatus:response.status,contentType});
   return;
  }
  const payload=await response.json();
  if(typeof payload.raw!=='string'||typeof payload.contentType!=='string'){
   finish('UNVERIFIED_WORKER_SCHEMA',{httpStatus:response.status,keys:Object.keys(payload||{})});
   return;
  }
  const body=parsePayload(payload.raw,payload.contentType);
  const quality=verifySearchMetadata(body,SYMBOL);
  finish(quality.status,{
   httpStatus:response.status,upstreamContentType:payload.contentType,
   totalResults:quality.total??Number(body.Total),returnedLetters:body.Letters?.length??0,
   acceptedLetters:quality.accepted?.length??0,rejectedReasons:quality.rejected?.map(x=>x.reason)??[],
   sample:quality.accepted?.slice(0,3).map(x=>({symbol:x.symbol,tracingNo:x.tracing_no,publishedAt:x.publicationDate}))??[]
  });
 }catch(error){
  const code=error?.cause?.code||error?.code||error?.name||'UNKNOWN';
  finish(error?.name==='AbortError'?'UNVERIFIED_TIMEOUT':'UNVERIFIED_NETWORK',{networkErrorCode:String(code),message:String(error?.message||error).slice(0,200)});
 }
}
main().catch(error=>{finish('UNVERIFIED_DIAGNOSTIC_ERROR',{message:String(error?.message||error).slice(0,200)});});
