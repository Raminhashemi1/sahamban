'use strict';
/* v139: User-entered financial row references, strictly LOCAL and UNVERIFIED. No parsers, ratios or trades. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document){root.SahambanCodalRowsV139=api;api.mount(root);}
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const UNITS=new Set(['IRR','THOUSAND_IRR','MILLION_IRR']);
 const AUDITS=new Set(['AUDITED','UNAUDITED','UNKNOWN']);
 const BASES=new Set(['STANDALONE','CONSOLIDATED','UNKNOWN']);
 const METRICS=new Set(['revenue','operating_profit','net_income','net_income_attributable_to_parent','total_assets','total_liabilities','equity','operating_cash_flow','shares_outstanding','weighted_average_shares','cash_dividend_approved_total','dividend_eligible_shares']);
 const SHARE_METRICS=new Set(['shares_outstanding','weighted_average_shares','dividend_eligible_shares']);
 const ascii=value=>String(value??'').replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-1776)).replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-1632));
 function date(value){
  const match=ascii(value).trim().match(/^(13\d\d|14\d\d)[/-](\d\d?)[/-](\d\d?)$/);
  if(!match)return null;
  const m=Number(match[2]),d=Number(match[3]);
  if(m<1||m>12||d<1||d>(m<=6?31:30))return null;
  if(m===12&&d===30){
   // Esfand 30 exists only in Persian leap years; fail closed if calendar data is unavailable.
   try{
    const formatter=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
    let leap=false;
    for(let day=18;day<=22;day++){
     const parts=Object.fromEntries(formatter.formatToParts(new Date(Date.UTC(Number(match[1])+622,2,day))).map(p=>[p.type,p.value]));
     if(parts.year===String(Number(match[1]))&&parts.month==='12'&&parts.day==='30'){leap=true;break;}
    }
    if(!leap)return null;
   }catch{return null;}
  }
  return match[1]+'/'+String(m).padStart(2,'0')+'/'+String(d).padStart(2,'0');
 }
 function parseAmount(value){
  const raw=ascii(value).trim();
  if(!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?$/.test(raw)||raw.length>24)return null;
  const n=Number(raw);return Number.isFinite(n)&&Number.isSafeInteger(Math.trunc(n))?n:null;
 }
 function review({fingerprint,periodEnd,unit,auditStatus,statementBasis,rows}={}){
  const errors=[];
  if(!fingerprint||fingerprint.status!=='LOCAL_FILE_FINGERPRINT_ONLY'||
     !/^[a-f0-9]{64}$/.test(String(fingerprint.sha256??''))||
     !fingerprint.filing||fingerprint.originVerified!==false||fingerprint.originalDocumentRead!==false)
    errors.push('FILE_FINGERPRINT_REQUIRED');
  const end=date(periodEnd),published=date(ascii(fingerprint?.filing?.published||'').slice(0,10));
  if(!end||!published||end>published)errors.push('INVALID_PERIOD');
  if(!UNITS.has(unit))errors.push('INVALID_UNIT');
  if(!AUDITS.has(auditStatus))errors.push('INVALID_AUDIT_STATUS');
  if(!BASES.has(statementBasis))errors.push('INVALID_STATEMENT_BASIS');
  if(!Array.isArray(rows)||rows.length===0||rows.length>20)errors.push('INVALID_ROWS_COUNT');
  const fields=[],seen=new Set();
  if(Array.isArray(rows))for(const r of rows.slice(0,21)){
   const name=String(r?.metric||''),amount=parseAmount(r?.amount),page=Number(ascii(r?.page).trim()),
    label=String(r?.sourceRow||'').trim();
   if(!METRICS.has(name)||seen.has(name)||amount===null||!Number.isSafeInteger(page)||page<1||page>99999||
      !label||label.length>160||/[\u0000-\u001f\u007f]/.test(label)){
    errors.push('INVALID_OR_DUPLICATE_ROW');continue;
   }
   seen.add(name);fields.push({metric:name,amount,sourcePage:page,sourceRow:label,unit:SHARE_METRICS.has(name)?'SHARES':unit});
  }
  if(errors.length)return {status:'INSUFFICIENT_EVIDENCE',errors:[...new Set(errors)],fields:[],tradingSignalsEnabled:false};
  const filing=fingerprint.filing;
  return {status:'LOCAL_ROW_REFERENCES_UNVERIFIED',errors:[],tradingSignalsEnabled:false,
   evidence:{symbol:filing.symbol,tracingNo:filing.tracingNo,reportUrl:filing.reportUrl,
    publicationDate:published,periodEnd:end,unit,auditStatus,statementBasis,
    documentSha256:fingerprint.sha256,format:fingerprint.format,fileSizeBytes:fingerprint.fileSizeBytes,
    source:'USER_ENTERED_NOT_AUTOMATICALLY_EXTRACTED',originVerified:false,originalDocumentRead:false,fields},
   warning:'Values were manually entered and have not been independently checked against original CODAL content. This packet remains unverified and cannot independently authorize ratios or trade signals.'};
 }
 function auditPacket(data){
  const checked=review(data);
  if(checked.status!=='LOCAL_ROW_REFERENCES_UNVERIFIED')return {status:'INSUFFICIENT_EVIDENCE',errors:checked.errors||[],packet:null};
  const e=checked.evidence;
  // Explicit allowlist: never include raw file bytes, portfolio state, session values, or unknown input fields.
  const packet={schema:'sahamban.codal.row-audit.v1',status:'LOCAL_ROW_REFERENCES_UNVERIFIED',
   financialEvidence:'INSUFFICIENT_EVIDENCE',verifiedMarketPrice:false,tradingSignalsEnabled:false,
   document:{symbol:e.symbol,tracingNo:e.tracingNo,reportUrl:e.reportUrl,publicationDate:e.publicationDate,
    periodEnd:e.periodEnd,unit:e.unit,auditStatus:e.auditStatus,statementBasis:e.statementBasis,
    sha256:e.documentSha256,format:e.format,fileSizeBytes:e.fileSizeBytes,
    originVerified:false,originalDocumentRead:false},
   source:'USER_ENTERED_NOT_AUTOMATICALLY_EXTRACTED',
   fields:e.fields.map(row=>({metric:row.metric,amount:row.amount,unit:row.unit,
    sourcePage:row.sourcePage,sourceRow:row.sourceRow})),
   warning:'UNVERIFIED USER-ENTERED FIGURES. Compare against the original CODAL filing independently. This packet alone does not authenticate figures or authorize financial analysis.'};
  return {status:'LOCAL_ROW_REFERENCES_UNVERIFIED',errors:[],packet};
 }
 function mount(win){
  const doc=win.document,root=doc.getElementById('codalRowsV139');if(!root)return;
  const input=id=>doc.getElementById(id);
  const controls={end:input('codalRowsPeriodV139'),unit:input('codalRowsUnitV139'),
   audit:input('codalRowsAuditV139'),basis:input('codalRowsBasisV139'),
   metric:input('codalRowsMetricV139'),amount:input('codalRowsAmountV139'),
   page:input('codalRowsPageV139'),label:input('codalRowsLabelV139'),
   add:input('codalRowsAddV139'),run:input('codalRowsCheckV139'),export:input('codalRowsExportV139'),
   summary:input('codalRowsSummaryV139'),rows:input('codalRowsListV139')};
  if(Object.values(controls).some(v=>!v))return;
  let fingerprint=null,rows=[];
  function render(){
   controls.rows.replaceChildren();
   rows.forEach((r,i)=>{const li=doc.createElement('li');
    li.textContent=r.metric+' | '+r.amount+' | صفحه '+r.page+' | ردیف: '+r.sourceRow+' ';
    const del=doc.createElement('button');del.type='button';del.textContent='حذف';
    del.addEventListener('click',()=>{rows.splice(i,1);render();});li.append(del);controls.rows.append(li);});
   controls.add.disabled=!fingerprint;controls.run.disabled=!fingerprint||!rows.length;
   controls.export.disabled=!fingerprint||!rows.length;
  }
  function reset(){
   fingerprint=null;rows=[];controls.summary.textContent='برای ثبت ردیف، ابتدا فایل اطلاعیه را در بخش قبل اثرانگشت‌گذاری کنید.';
   render();
  }
  function accept(result){
   reset();
   if(result?.status!=='LOCAL_FILE_FINGERPRINT_ONLY')return false;
   fingerprint=result;controls.summary.textContent='هش محلی فایل دریافت شد. ارقام را فقط با مشاهده مستقیم گزارش در کدال وارد کنید؛ هنوز هیچ عددی تأیید نشده است.';
   render();return true;
  }
  controls.add.addEventListener('click',()=>{
   if(!fingerprint||rows.length>=20){controls.summary.textContent='ابتدا فایل معتبر انتخاب کنید یا سقف ۲۰ ردیف رعایت شود.';return;}
   const candidate={metric:controls.metric.value,amount:controls.amount.value,page:controls.page.value,sourceRow:controls.label.value};
   const current=[...rows,candidate];
   const r=review({fingerprint,periodEnd:controls.end.value,unit:controls.unit.value,auditStatus:controls.audit.value,statementBasis:controls.basis.value,rows:current});
   if(r.errors.includes('INVALID_OR_DUPLICATE_ROW')||r.errors.includes('INVALID_ROWS_COUNT')){
    controls.summary.textContent='ردیف تکراری یا نامعتبر است. مقدار عددی بدون جداکننده، شماره صفحه و عنوان دقیق ردیف لازم است.';return;
   }
   rows=current;controls.amount.value='';controls.page.value='';controls.label.value='';controls.summary.textContent='ردیف به پیش‌نویس محلی اضافه شد؛ تأیید بنیادی انجام نشده است.';render();
  });
  controls.run.addEventListener('click',()=>{
   const result=review({fingerprint,periodEnd:controls.end.value,unit:controls.unit.value,
    auditStatus:controls.audit.value,statementBasis:controls.basis.value,rows});
   if(result.status!=='LOCAL_ROW_REFERENCES_UNVERIFIED'){
    controls.summary.textContent='اطلاعات ناکافی یا نامعتبر: '+result.errors.join('، ')+'. هیچ سیگنال یا نسبت مالی صادر نشد.';return;
   }
   controls.summary.textContent='پیش‌نویس ارجاع ردیف‌ها ایجاد شد: '+result.evidence.fields.length+
    ' ردیف. وضعیت: بررسی‌نشده و نیازمند تطبیق مستقل با اصل گزارش. هیچ سود، EPS، NAV یا سیگنالی محاسبه نشده است.';
  });
  controls.export.addEventListener('click',()=>{
   const result=auditPacket({fingerprint,periodEnd:controls.end.value,unit:controls.unit.value,
    auditStatus:controls.audit.value,statementBasis:controls.basis.value,rows});
   if(!result.packet){
    controls.summary.textContent='خروجی ساخته نشد: '+result.errors.join('، ')+'. ابتدا اطلاعات را اصلاح کنید.';
    return;
   }
   if(!win.Blob||!win.URL?.createObjectURL||!win.URL?.revokeObjectURL){
    controls.summary.textContent='مرورگر امکان دانلود محلی امن را فراهم نکرد. هیچ داده‌ای ارسال نشد.';return;
   }
   const packet=result.packet,blob=new win.Blob([JSON.stringify(packet,null,2)],{type:'application/json;charset=utf-8'});
   const url=win.URL.createObjectURL(blob);
   try{
    const link=doc.createElement('a');
    link.href=url;link.download='sahamban-codal-unverified-'+packet.document.tracingNo+'.json';
    link.hidden=true;root.append(link);link.click();link.remove();
    controls.summary.textContent='فایل JSON پیش‌نویس تأییدنشده برای بررسی مستقل آماده شد؛ هیچ اطلاعاتی به شبکه ارسال نشد.';
   }finally{win.setTimeout(()=>win.URL.revokeObjectURL(url),0);}
  });
  reset();
  win.SahambanCodalRowsV139.accept=accept;win.SahambanCodalRowsV139.reset=reset;
 }
 return {parseAmount,date,review,auditPacket,mount};
});
