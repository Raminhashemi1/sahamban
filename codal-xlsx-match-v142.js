'use strict';
/* v142: compare manually claimed label/amount to exact XLSX cells, without source authenticity. */
(function(root,factory){
 const parser=typeof module==='object'&&module.exports?require('./codal-xlsx-preview-v141.js'):root?.SahambanCodalXlsxV141;
 const api=factory(parser);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document){root.SahambanCodalXlsxMatchV142=api;api.mount(root);}
})(typeof globalThis!=='undefined'?globalThis:null,function(parser){
 const fail=reason=>({status:'LOCAL_CELL_MATCH_UNVERIFIED_FAILED',reason,financialEvidence:'INSUFFICIENT_EVIDENCE',originVerified:false,figuresVerified:false,tradingSignalsEnabled:false});
 const digits=s=>String(s??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 const norm=s=>parser.normalize(s);
 function compare(preview,claim){
  if(preview?.status!=='LOCAL_XLSX_CONTENT_PREVIEW_UNVERIFIED'||!Array.isArray(preview.sheets))
   return fail('NO_EXTRACTED_XLSX');
  const sheet=Number(claim?.sheetIndex),labelRef=String(claim?.labelCell||'').trim().toUpperCase(),
   valueRef=String(claim?.valueCell||'').trim().toUpperCase();
  if(!Number.isSafeInteger(sheet)||sheet<1||sheet>preview.sheets.length||
   !/^[A-Z]{1,3}[1-9][0-9]{0,6}$/.test(labelRef)||!/^[A-Z]{1,3}[1-9][0-9]{0,6}$/.test(valueRef)||
   labelRef===valueRef)return fail('INVALID_CELL_REFERENCE');
  const cells=preview.sheets[sheet-1].cells;
  const label=cells.find(x=>x.cell===labelRef),value=cells.find(x=>x.cell===valueRef);
  if(!label||!value)return fail('CELL_MISSING_OR_PREVIEW_LIMIT');
  const target=String(claim?.expectedLabel||'').trim();
  if(!target||target.length>160||!norm(label.text)||norm(label.text)!==norm(target))return fail('LABEL_MISMATCH');
  const amount=digits(claim?.expectedAmount).trim(),source=digits(value.text).trim();
  const numeric=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?$/;
  if(!numeric.test(amount)||!numeric.test(source)||
     !Number.isSafeInteger(Math.trunc(Number(amount)))||!Number.isSafeInteger(Math.trunc(Number(source)))||
     Number(amount)!==Number(source))return fail('AMOUNT_MISMATCH_OR_UNSUPPORTED_NUMBER_FORMAT');
  return {status:'LOCAL_XLSX_CELL_MATCH_UNVERIFIED',sheet:preview.sheets[sheet-1].name,
   labelCell:labelRef,valueCell:valueRef,rawAmount:source,
   originVerified:false,figuresVerified:false,tradingSignalsEnabled:false,financialEvidence:'INSUFFICIENT_EVIDENCE'};
 }
 function mount(win){
  const doc=win.document;
  const source=doc.getElementById('codalXlsxFileV141'),button=doc.getElementById('codalXlsxCompareV142'),
   status=doc.getElementById('codalXlsxCompareStatusV142');
  const inp=name=>doc.getElementById('codalXlsx'+name+'V142');
  const sheet=inp('Sheet'),labelCell=inp('LabelCell'),valueCell=inp('ValueCell'),
   expectedLabel=inp('ExpectedLabel'),expectedAmount=inp('ExpectedAmount');
  if(!source||!button||!status||!sheet||!labelCell||!valueCell||!expectedLabel||!expectedAmount)return;
  let seq=0;
  source.addEventListener('change',()=>{seq++;status.textContent='فایل تغییر کرد؛ هر مقایسه قبلی باطل است.';});
  button.addEventListener('click',async()=>{
   const stamp=++seq;
   button.disabled=true;status.textContent='در حال استخراج و مقایسه دقیق سلول‌های فایل روی همین دستگاه.';
   try{
    const preview=await parser.extract(source.files?.[0]);
    if(stamp!==seq)return;
    const r=compare(preview,{sheetIndex:sheet.value,labelCell:labelCell.value,valueCell:valueCell.value,
      expectedLabel:expectedLabel.value,expectedAmount:expectedAmount.value});
    status.textContent=r.status==='LOCAL_XLSX_CELL_MATCH_UNVERIFIED'?
     'عنوان و مقدار خام سلول‌های انتخاب‌شده با ارقام واردشده تطبیق دارند؛ اما اصالت کدال، دوره، واحدهای مالی و درستی گزارش تأیید نشده‌اند.':
     'تطبیق ناموفق: '+r.reason+'. هیچ عددی برای سیگنال یا محاسبه بنیادی پذیرفته نشد.';
   }catch(e){if(stamp===seq)status.textContent='فایل XLSX قابل بررسی نبود: '+String(e?.message||'UNKNOWN')+'. هیچ داده‌ای تأیید نشد.';}
   finally{if(stamp===seq)button.disabled=false;}
  });
 }
 return {compare,mount};
});
