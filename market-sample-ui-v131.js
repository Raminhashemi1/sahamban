'use strict';
/* v131: opt-in sample UI; independent from real holdings storage. */
(()=>{
 const $=id=>document.getElementById(id),button=$('marketSampleRunV131'),status=$('marketSampleStatusV131'),results=$('marketSampleResultsV131');
 if(!button||!status||!results)return;
 const fmt=x=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(x);
 const today=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return parts.year+parts.month.padStart(2,'0')+parts.day.padStart(2,'0');};
 let running=false;
 button.addEventListener('click',async()=>{
  if(running)return;
  running=true;button.disabled=true;results.replaceChildren();status.textContent='در حال دریافت فهرست پربازدیدها؛ این نمونه کل بازار نیست...';
  try{
   const out=await window.SahambanMarketSampleV131.sample({today:today(),limit:6,onProgress:(done,total)=>{status.textContent='اعتبارسنجی '+fmt(done)+' از '+fmt(total)+' نماد منتخب فهرست پربازدیدها...';}});
   const good=out.results.filter(x=>x.ok).sort((a,b)=>b.report.score-a.report.score),bad=out.results.filter(x=>!x.ok);
   const lead=document.createElement('p');lead.textContent='منبع: فهرست پربازدیدهای بازار؛ ردیف‌های بازگشتی: '+fmt(out.poolSize)+'؛ نمونه بررسی‌شده: '+fmt(out.sampled)+'؛ قابل تحلیل: '+fmt(good.length)+'. این فهرست رتبه‌بندی کل بازار یا فهرست بهترین سهم‌ها نیست.';results.append(lead);
   for(const x of good){
    const r=x.report,h=x.historical,d=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent=r.symbol+' — '+r.action+' — امتیاز شروط: '+fmt(r.score)+' از ۱۰۰';d.append(summary);
    const p=document.createElement('p');p.textContent='تاریخ داده: '+r.marketDate+' | قیمت پایانی: '+fmt(r.last)+' ریال. '+r.reason;d.append(p);
    const factors=document.createElement('ul');for(const [name,ok] of r.reasons){const li=document.createElement('li');li.textContent=(ok?'✓ ':'✗ ')+name;factors.append(li);}d.append(factors);
    const audit=document.createElement('p');
    if(h&&h.error){audit.textContent='آزمون گذشته قابل محاسبه نیست: '+h.error;}
    else if(h){audit.textContent='بررسی گذشته‌نگر ۱۰جلسه‌ای: '+fmt(h.count)+' رویداد غیرهمپوشان از '+fmt(h.testedSignals)+' روز قابل ارزیابی؛ '+(h.count?'میانگین ناخالص: '+fmt(h.meanGrossReturnPct)+'٪؛ میانگین خالص با هزینه فرضی رفت‌وبرگشت ۱٪: '+fmt(h.meanNetReturnPct)+'٪؛ رویداد مثبت پس از هزینه: '+fmt(h.netWinRatePct)+'٪؛ افت سرمایه متوالی: '+fmt(h.netMaxDrawdownPct)+'٪؛ سناریوی هزینه ۲٪: میانگین '+fmt(h.stressMeanNetReturnPct)+'٪ و رویداد مثبت '+fmt(h.stressNetWinRatePct)+'٪.':'هیچ نامزد ورود قابل ارزیابی مشاهده نشد.')+(h.adequateSample?'':' نمونه کمتر از ۱۰ رویداد است و برای نتیجه‌گیری آماری کافی نیست.');}
    else{audit.textContent='آزمون تاریخی انجام نشد.';}
    d.append(audit);
    const warning=document.createElement('p');warning.className='muted';warning.textContent='آزمون گذشته‌نگر فقط از قیمت‌های پایانی استفاده می‌کند: سیگنال در پایان روز، ورود فرضی در قیمت پایانی جلسه بعد و خروج فرضی پس از ۱۰ جلسه دیگر؛ هزینه رفت‌وبرگشت ۱٪ و سناریوی تنش ۲٪ صرفاً فرض‌های قابل‌تغییر برای حساسیت‌سنجی‌اند، نه تعرفه رسمی کارگزاری. صف، لغزش واقعی، توقف نماد، تعدیل افزایش سرمایه و تضمین اجرا شبیه‌سازی نشده‌اند. عملکرد گذشته قابل تعمیم به آینده نیست.';d.append(warning);results.append(d);
   }
   for(const x of bad){const p=document.createElement('p');p.className='notice';p.textContent=x.symbol+': داده معتبر نبود — '+x.error;results.append(p);}
   status.textContent='بررسی نمونه پربازدیدها پایان یافت. '+fmt(good.length)+' نماد با داده قابل قبول؛ هیچ دارایی ذخیره یا تغییر نکرد.';
  }catch(e){status.textContent='دریافت فهرست یا تاریخچه ممکن نشد: '+e.message+'. اطلاعات دارایی‌ها تغییری نکرد.';}
  finally{running=false;button.disabled=false;}
 });
})();
