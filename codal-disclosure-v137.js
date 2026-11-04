'use strict';
/* v137: Read-only CODAL disclosure discovery. Listing metadata is NOT financial evidence. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document){root.SahambanCodalV137=api;api.mount(root);}
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 function norm(v){return String(v??'').replace(/[\s\u200c\u200e\u200f\ufeff]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();}
 function ascii(v){return String(v??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));}
 function dateValid(value){
  const m=ascii(value).trim().match(/^(13\d\d|14\d\d)[/-](\d\d?)[/-](\d\d?)(?:\s+\d\d?:\d\d(?::\d\d)?)?$/);
  if(!m)return false;
  const mon=Number(m[2]),day=Number(m[3]);
  return mon>=1&&mon<=12&&day>=1&&day<=(mon<=6?31:30);
 }
 function reportUrl(raw){
  if(typeof raw!=='string'||raw.length>2048||!raw.trim()||raw.startsWith('//')||/[\s\\\u0000-\u001f\u007f]/.test(raw)||(!raw.startsWith('/')&&!/^https:\/\//i.test(raw)))return null;
  try{const u=new URL(raw,'https://www.codal.ir');
   if(u.protocol!=='https:'||!['codal.ir','www.codal.ir'].includes(u.hostname.toLowerCase())||u.username||u.password||u.port||!u.searchParams.size)return null;
   if(!/^\/Reports\//i.test(u.pathname)&&!/^\/DownloadFile\.aspx$/i.test(u.pathname))return null;
   return u.href;
  }catch{return null;}
 }
 function review(body,target){
  if(!norm(target)||norm(target).length>20||!body||typeof body!=='object'||!Array.isArray(body.Letters)||body.Letters.length>100
   ||!Number.isSafeInteger(Number(body.Total))||Number(body.Total)<0||body.Letters.length>Number(body.Total)
   ||!Number.isSafeInteger(Number(body.Page??1))||Number(body.Page??1)<1)
   return {status:'UNVERIFIED_SEARCH_SCHEMA',items:[],rejected:0,financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};
  const items=[],seen=new Set();let rejected=0;
  for(const x of body.Letters){
   const symbol=norm(x?.Symbol),title=String(x?.Title??'').trim(),tracing=ascii(x?.TracingNo).trim(),pub=String(x?.PublishDateTime||x?.SentDateTime||'');
   if(symbol!==norm(target)||!title||title.length>500||!/^[0-9]{1,20}$/.test(tracing)||BigInt(tracing)<=0n||!dateValid(pub)||seen.has(tracing)){rejected++;continue;}
   seen.add(tracing);
   items.push({symbol,title,tracingNo:tracing,published:pub,originalUrl:reportUrl(x?.Url)});
  }
  return {status:items.length?'SEARCH_METADATA_VALIDATED':body.Letters.length?'UNVERIFIED_NO_VALID_LETTERS':'UNVERIFIED_EMPTY_SEARCH',
   items,rejected,financialEvidence:'INSUFFICIENT_EVIDENCE',tradingSignalsEnabled:false};
 }
 async function search(symbol,{fetchImpl=fetch,timeoutMs=15000}={}){
  if(!norm(symbol)||String(symbol).trim().length>20)throw new Error('INVALID_SYMBOL');
  const endpoint=new URL('https://search.codal.ir/api/search/v2/q');
  endpoint.search=new URLSearchParams({Symbol:String(symbol).trim(),PageNumber:'1',LetterType:'-1',Category:'-1',TracingNo:'-1',search:'true'}).toString();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(endpoint.toString(),{method:'GET',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
   if(response.status===429)throw new Error('RATE_LIMIT_429');
   if(!response.ok)throw new Error('HTTP_'+response.status);
   const type=response.headers?.get?.('content-type')||'';
   if(!/json/i.test(type))throw new Error('UNVERIFIED_CONTENT_TYPE');
   const body=await response.json();
   return review(body,symbol);
  }finally{clearTimeout(timer);}
 }
 function mount(win){
  const doc=win.document,root=doc.getElementById('codalEvidenceV137');if(!root)return;
  const input=doc.getElementById('codalEvidenceSymbolV137'),button=doc.getElementById('codalEvidenceRunV137');
  const status=doc.getElementById('codalEvidenceStatusV137'),results=doc.getElementById('codalEvidenceResultsV137');
  if(!input||!button||!status||!results)return;
  button.addEventListener('click',async()=>{
   results.replaceChildren();const symbol=input.value.trim();
   if(!symbol||symbol.length>20){status.textContent='نماد معتبر وارد کنید.';return;}
   button.disabled=true;status.textContent='در حال جست‌وجوی فقط‌خواندنی؛ نتیجه هنوز تأیید نشده است.';
   try{
    const response=await search(symbol);
    if(response.status!=='SEARCH_METADATA_VALIDATED'){status.textContent='اطلاعیه قابل بررسی تأیید نشد: '+response.status+'. این وضعیت به معنی نبود اطلاعیه نیست. تحلیل بنیادی: اطلاعات ناکافی.';return;}
    status.textContent='مشخصات '+response.items.length+' اطلاعیه با نماد تطبیق یافت؛ اصل اسناد دریافت یا تأیید نشده است. تحلیل بنیادی: اطلاعات ناکافی. هیچ سیگنال مالی صادر نمی‌شود.';
    for(const item of response.items.slice(0,5)){
     const p=doc.createElement('p'),title=doc.createElement('strong'),meta=doc.createElement('small');
     title.textContent=item.title;meta.textContent=' | نماد: '+item.symbol+' | تاریخ انتشار: '+item.published+' | رهگیری: '+item.tracingNo;
     p.append(title,meta);
     if(item.originalUrl){const a=doc.createElement('a');a.href=item.originalUrl;a.target='_blank';a.rel='noopener noreferrer nofollow';a.textContent=' مشاهده اصل اطلاعیه در کدال';p.append(a);}
     if(item.originalUrl&&win.SahambanCodalIntakeV138?.select){
      const choose=doc.createElement('button');choose.type='button';choose.className='secondary';
      choose.textContent='انتخاب برای اثرانگشت سند اصلی (بدون تأیید محتوا)';
      choose.addEventListener('click',()=>{if(win.SahambanCodalIntakeV138.select(item))win.location.hash='codalOriginalV138';});
      p.append(choose);
     }
     results.append(p);
    }
   }catch(error){
    const code=String(error?.message||error);
    status.textContent='اتصال یا اعتبار پاسخ کدال تأیید نشد ('+(error?.name==='AbortError'?'TIMEOUT':code)+'). این خطا به معنی نبود اطلاعیه نیست. هیچ عدد مالی تولید نشد.';
   }finally{button.disabled=false;}
  });
 }
 return Object.freeze({norm,ascii,dateValid,reportUrl,review,search,mount});
});
