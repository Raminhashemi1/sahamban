'use strict';
/* v138: locally hash a manually selected original report file; never authenticate its content. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document){root.SahambanCodalIntakeV138=api;api.mount(root);}
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const MAX_BYTES=15*1024*1024;
 function safeFiling(record){
  if(!record||typeof record!=='object'||typeof record.symbol!=='string'||!record.symbol.trim()||
     !/^[0-9]{1,20}$/.test(String(record.tracingNo||''))||BigInt(record.tracingNo)<=0n||
     typeof record.published!=='string')return null;
  const published=record.published.replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
  const match=published.match(/^(13\d\d|14\d\d)[/-](\d\d?)[/-](\d\d?)(?:\s+\d\d?:\d\d(?::\d\d)?)?$/);
  if(!match||Number(match[2])<1||Number(match[2])>12||Number(match[3])<1||
     Number(match[3])>(Number(match[2])<=6?31:30))return null;
  // The originating v137 metadata gate must already have accepted this URL.
  const url=typeof record.originalUrl==='string'?record.originalUrl:null;
  if(!url||!/^https:\/\/(?:www\.)?codal\.ir\/(?:Reports\/|DownloadFile\.aspx\?)/i.test(url))return null;
  try{
   const u=new URL(url);
   if(u.username||u.password||u.port||!u.searchParams.size)return null;
   return {symbol:record.symbol,tracingNo:String(record.tracingNo),published:record.published,reportUrl:u.href};
  }catch{return null;}
 }
 function fileKind(name,bytes){
  const extension=String(name||'').toLowerCase().split('.').pop();
  const b=new Uint8Array(bytes);
  if(extension==='pdf'&&b.length>=5&&b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45)return 'PDF';
  if(extension==='xlsx'&&b.length>=4&&b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4)return 'XLSX_ZIP_CONTAINER_UNINSPECTED';
  if(extension==='xls'&&b.length>=8&&[208,207,17,224,161,177,26,225].every((x,i)=>b[i]===x))return 'XLS_OLE_CONTAINER_UNINSPECTED';
  return null;
 }
 async function inspect(file,record,{subtle}={}){
  const filing=safeFiling(record);
  if(!filing)return {status:'REJECTED',reason:'UNVERIFIED_FILING_IDENTITY',financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};
  if(!file||!Number.isSafeInteger(file.size)||file.size<=0||file.size>MAX_BYTES||typeof file.arrayBuffer!=='function')
   return {status:'REJECTED',reason:'INVALID_FILE_OR_SIZE',financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};
  let bytes;
  try{bytes=await file.arrayBuffer();}catch{return {status:'REJECTED',reason:'FILE_READ_FAILED',financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};}
  if(bytes.byteLength!==file.size||!fileKind(file.name,bytes))return {status:'REJECTED',reason:'UNRECOGNIZED_DOCUMENT_FORMAT',financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};
  const hash=subtle||globalThis.crypto?.subtle;
  if(!hash||typeof hash.digest!=='function')return {status:'REJECTED',reason:'SHA256_UNAVAILABLE',financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};
  let digest;
  try{digest=await hash.digest('SHA-256',bytes);}catch{return {status:'REJECTED',reason:'SHA256_FAILED',financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};}
  const sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  return {status:'LOCAL_FILE_FINGERPRINT_ONLY',filing,format:fileKind(file.name,bytes),fileSizeBytes:file.size,sha256,
   originalDocumentRead:false,originVerified:false,financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false,
   note:'A local hash does not establish that the file came from CODAL, is authentic, or contains correct financial figures.'};
 }
 function mount(win){
  const doc=win.document,root=doc.getElementById('codalOriginalV138');
  if(!root)return;
  const fileInput=doc.getElementById('codalOriginalFileV138'),button=doc.getElementById('codalOriginalCheckV138'),
   status=doc.getElementById('codalOriginalStatusV138'),selected=doc.getElementById('codalOriginalSelectedV138');
  if(!fileInput||!button||!status||!selected)return;
  let current=null,version=0;
  function select(record){
   version++;win.SahambanCodalRowsV139?.reset?.();current=safeFiling(record);fileInput.value='';status.textContent='فایل اصلی هنوز انتخاب و بررسی نشده است. تحلیل بنیادی: اطلاعات ناکافی.';
   selected.textContent=current?'اطلاعیه منتخب: '+current.symbol+' | شناسه: '+current.tracingNo+' | انتشار: '+current.published:'اطلاعیه با هویت و نشانی معتبر انتخاب نشده است.';
   fileInput.disabled=!current;button.disabled=!current;
   return Boolean(current);
  }
  fileInput.disabled=true;button.disabled=true;
  // Changing the selected file invalidates its previous SHA-256 and every row linked to it.
  // Incrementing version also discards the result of an asynchronous hash already in progress.
  fileInput.addEventListener('change',()=>{
   version++;
   win.SahambanCodalRowsV139?.reset?.();
   button.disabled=!current;
   status.textContent='فایل انتخاب‌شده تغییر کرد. اثر انگشت قبلی و ارجاعات مالی آن باطل شدند؛ دوباره SHA-256 را محاسبه کنید.';
  });
  button.addEventListener('click',async()=>{
   const file=fileInput.files?.[0],stamp=version,record=current;
   button.disabled=true;status.textContent='در حال محاسبه اثرانگشت محلی فایل؛ هیچ فایلی ارسال نمی‌شود.';
   try{
    const result=await inspect(file,record,{subtle:win.crypto?.subtle});
    if(version!==stamp)return;
    if(result.status!=='LOCAL_FILE_FINGERPRINT_ONLY'){
     status.textContent='فایل قابل پذیرش برای اثرانگشت نبود: '+result.reason+'. هیچ تحلیل مالی انجام نشد.';return;
    }
    win.SahambanCodalRowsV139?.accept?.(result);
    status.textContent='اثر انگشت محلی SHA-256: '+result.sha256+' | نوع فایل: '+result.format+' | اندازه: '+result.fileSizeBytes+
      ' بایت. این نتیجه فقط محاسبه هش است؛ اصالت کدال، محتوای سند و ارقام مالی هنوز بررسی نشده‌اند. تحلیل بنیادی: اطلاعات ناکافی.';
   }catch{if(version===stamp)status.textContent='محاسبه اثر انگشت انجام نشد. هیچ تحلیل یا سیگنال صادر نشد.';}
   finally{if(version===stamp)button.disabled=!current;}
  });
  win.SahambanCodalIntakeV138.select=select;
 }
 return {MAX_BYTES,safeFiling,fileKind,inspect,mount};
});
