'use strict';
/* v140: re-check a local UNVERIFIED JSON audit packet against the exact selected file bytes.
   Never authenticate a CODAL publisher or any user-entered financial number. */
(function(root,factory){
 const rows=typeof module==='object'&&module.exports?require('./codal-source-rows-v139.js'):root?.SahambanCodalRowsV139;
 const intake=typeof module==='object'&&module.exports?require('./codal-original-intake-v138.js'):root?.SahambanCodalIntakeV138;
 const api=factory(rows,intake);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document){root.SahambanCodalRecheckV140=api;api.mount(root);}
})(typeof globalThis!=='undefined'?globalThis:null,function(rows,intake){
 const MAX_JSON_BYTES=128*1024;
 const fail=reason=>({status:'UNVERIFIED_RECHECK_FAILED',reason,financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false});
 const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
 const keys=(o,wanted)=>plain(o)&&Object.keys(o).length===wanted.length&&wanted.every(k=>Object.prototype.hasOwnProperty.call(o,k));
 function canonical(v){
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(plain(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  return JSON.stringify(v);
 }
 function validate(packet){
  if(!keys(packet,['schema','status','financialEvidence','verifiedMarketPrice','tradingSignalsEnabled','document','source','fields','warning'])||
   packet.schema!=='sahamban.codal.row-audit.v1'||
   packet.status!=='LOCAL_ROW_REFERENCES_UNVERIFIED'||packet.financialEvidence!=='INSUFFICIENT_EVIDENCE'||
   packet.verifiedMarketPrice!==false||packet.tradingSignalsEnabled!==false||
   packet.source!=='USER_ENTERED_NOT_AUTOMATICALLY_EXTRACTED')return fail('INVALID_PACKET_SCHEMA');
  const doc=packet.document;
  if(!keys(doc,['symbol','tracingNo','reportUrl','publicationDate','periodEnd','unit','auditStatus','statementBasis','sha256','format','fileSizeBytes','originVerified','originalDocumentRead'])||
   doc.originVerified!==false||doc.originalDocumentRead!==false||
   !/^[a-f0-9]{64}$/.test(String(doc.sha256))||!Number.isSafeInteger(doc.fileSizeBytes)||
   doc.fileSizeBytes<1||doc.fileSizeBytes>intake.MAX_BYTES||
   !['PDF','XLSX_ZIP_CONTAINER_UNINSPECTED','XLS_OLE_CONTAINER_UNINSPECTED'].includes(doc.format)||
   !Array.isArray(packet.fields)||packet.fields.length<1||packet.fields.length>20)return fail('INVALID_PACKET_DOCUMENT');
  if(packet.fields.some(f=>!keys(f,['metric','amount','unit','sourcePage','sourceRow'])))return fail('INVALID_PACKET_FIELDS');
  const rebuilt=rows.auditPacket({fingerprint:{
   status:'LOCAL_FILE_FINGERPRINT_ONLY',sha256:doc.sha256,format:doc.format,fileSizeBytes:doc.fileSizeBytes,
   originVerified:false,originalDocumentRead:false,
   filing:{symbol:doc.symbol,tracingNo:doc.tracingNo,published:doc.publicationDate,reportUrl:doc.reportUrl}
  },periodEnd:doc.periodEnd,unit:doc.unit,auditStatus:doc.auditStatus,
   statementBasis:doc.statementBasis,
   rows:packet.fields.map(f=>({metric:f.metric,amount:f.amount,page:f.sourcePage,sourceRow:f.sourceRow}))});
  if(!rebuilt.packet||canonical(rebuilt.packet)!==canonical(packet))return fail('INVALID_OR_MODIFIED_PACKET');
  return {status:'PACKET_STRUCTURE_UNVERIFIED',financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};
 }
 async function recheck(packet,file,{subtle}={}){
  const checked=validate(packet);
  if(checked.status!=='PACKET_STRUCTURE_UNVERIFIED')return checked;
  const d=packet.document;
  if(!file||!Number.isSafeInteger(file.size)||file.size!==d.fileSizeBytes)return fail('FILE_SIZE_MISMATCH');
  const read=await intake.inspect(file,{symbol:d.symbol,tracingNo:d.tracingNo,published:d.publicationDate,reportUrl:d.reportUrl},{subtle});
  if(read.status!=='LOCAL_FILE_FINGERPRINT_ONLY')return fail('SOURCE_FILE_UNREADABLE_'+(read.reason||'UNKNOWN'));
  if(read.sha256!==d.sha256||read.format!==d.format||read.fileSizeBytes!==d.fileSizeBytes)
   return fail('FILE_HASH_OR_FORMAT_MISMATCH');
  return {status:'LOCAL_FILE_BYTES_MATCH',symbol:d.symbol,tracingNo:d.tracingNo,sha256:d.sha256,
   financialEvidence:'INSUFFICIENT_EVIDENCE',originVerified:false,originalDocumentRead:false,
   tradingSignalsEnabled:false,figuresVerified:false,
   note:'Only the same local bytes were matched. CODAL provenance, report authenticity and user-entered figures remain unverified.'};
 }
 async function filePacket(file){
  if(!file||!Number.isSafeInteger(file.size)||file.size<2||file.size>MAX_JSON_BYTES||
    typeof file.text!=='function')return {error:'INVALID_JSON_FILE_SIZE'};
  try{
   const text=await file.text();
   if(new TextEncoder().encode(text).byteLength!==file.size)return {error:'JSON_FILE_SIZE_MISMATCH'};
   return {packet:JSON.parse(text)};
  }catch{return {error:'INVALID_JSON'};}
 }
 function mount(win){
  const doc=win.document,root=doc.getElementById('codalRowsV139');
  const j=doc.getElementById('codalAuditJsonV140'),f=doc.getElementById('codalAuditOriginalV140'),
   button=doc.getElementById('codalAuditRecheckV140'),status=doc.getElementById('codalAuditRecheckStatusV140');
  if(!root||!j||!f||!button||!status)return;
  let version=0;
  for(const input of [j,f])input.addEventListener('change',()=>{version++;status.textContent='فایل تغییر کرده است؛ نتیجه قبلی باطل شد.';});
  button.addEventListener('click',async()=>{
   const stamp=++version;
   button.disabled=true;status.textContent='در حال بررسی محلی؛ هیچ داده‌ای ارسال نمی‌شود.';
   try{
    const a=await filePacket(j.files?.[0]);
    if(stamp!==version)return;
    const out=a.error?fail(a.error):await recheck(a.packet,f.files?.[0],{subtle:win.crypto?.subtle});
    if(stamp!==version)return;
    status.textContent=out.status==='LOCAL_FILE_BYTES_MATCH'?
     'اثر انگشت فایل اصلی با JSON تطبیق دارد ('+out.sha256+'). اما اصالت کدال و ارقام مالی هنوز تأیید نشده‌اند؛ هیچ سیگنالی تولید نمی‌شود.':
     'بازبینی ناموفق: '+out.reason+'. نه اصالت گزارش و نه ارقام مالی تأیید نشدند.';
   }catch{if(stamp===version)status.textContent='بازبینی محلی ممکن نشد. اطلاعات مالی همچنان تأییدنشده‌اند.';}
   finally{if(stamp===version)button.disabled=false;}
  });
 }
 return {MAX_JSON_BYTES,validate,recheck,filePacket,mount};
});
