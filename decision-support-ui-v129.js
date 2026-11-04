'use strict';
/* v129 read-only decision assistant. Consumes only the separately verified history event. */
(()=>{const $=id=>document.getElementById(id);const root=$('decisionSupportV129');if(!root)return;
 const status=$('decisionStatusV129'),summary=$('decisionSummaryV129'),table=$('decisionTableV129'),detail=$('decisionDetailV129'),select=$('decisionSymbolV129');
 let quotes=[],reports=[];const exportButton=$('decisionExportV129');
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const dateTehran=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return p.year+p.month+p.day;};
 const pretty=d=>String(d||'').replace(/(\d{4})(\d{2})(\d{2})/,'$1/$2/$3').replace(/[0-9]/g,n=>'۰۱۲۳۴۵۶۷۸۹'[Number(n)]);
 const badge=r=>r.code==='ENTRY_CANDIDATE'?'decision-entry':r.code==='RISK_EXIT'||r.code==='EXIT_REVIEW'?'decision-exit':r.code==='AVOID'?'decision-avoid':'decision-wait';
 function renderRows(){table.replaceChildren();const t=document.createElement('table'),head=document.createElement('tr');['نماد','امتیاز شروط','وضعیت','آخرین قیمت (ریال)','تاریخ داده'].forEach(x=>{const th=document.createElement('th');th.textContent=x;head.append(th);});const thead=document.createElement('thead');thead.append(head);const body=document.createElement('tbody');for(const r of [...reports].sort((a,b)=>b.score-a.score)){const tr=document.createElement('tr');[r.symbol,fmt(r.score)+' از ۱۰۰',r.action,fmt(r.last),pretty(r.marketDate)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});tr.className=badge(r);tr.tabIndex=0;tr.setAttribute('role','button');tr.setAttribute('aria-label','جزئیات '+r.symbol+'؛ '+r.action);const open=()=>{select.value=r.symbol;showDetail();};tr.addEventListener('click',open);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});body.append(tr);}t.append(thead,body);table.append(t);}
 function showDetail(){const r=reports.find(x=>x.symbol===select.value);detail.replaceChildren();if(!r)return;const h=document.createElement('h3');h.textContent=r.symbol+' — '+r.action;detail.append(h);const p=document.createElement('p');p.textContent=r.reason+' امتیاز شروط: '+fmt(r.score)+' از ۱۰۰ (احتمال موفقیت نیست). آخرین تاریخ: '+pretty(r.marketDate)+'.';detail.append(p);const list=document.createElement('ul');for(const x of r.reasons){const li=document.createElement('li');li.textContent=(x[1]?'✓ ':'✗ ')+x[0];list.append(li);}detail.append(list);const metrics=document.createElement('p');metrics.textContent='قیمت پایانی: '+fmt(r.last)+' ریال | SMA20: '+fmt(r.sma20)+' | SMA50: '+fmt(r.sma50)+' | RSI14: '+fmt(r.rsi)+' | MACD histogram: '+fmt(r.hist)+' | بازده ۲۰ جلسه: '+fmt(r.momentum)+'٪';detail.append(metrics);
 const evidence=document.createElement('p');
 const quote=quotes.find(x=>x.symbol===r.symbol);
 let holdout;
 try{
  if(!window.SahambanHoldoutV134?.evaluate)throw Error('ماژول ارزیابی خارج از نمونه در دسترس نیست.');
  holdout=window.SahambanHoldoutV134.evaluate(quote);
  const n=holdout?.holdout?.count??0;
  if(!holdout.holdout.adequateSample){
   evidence.textContent='اعتبار مستقل پیشنهاد: اثبات‌نشده؛ دوره خارج از نمونه فقط '+fmt(n)+' رویداد قابل ارزیابی دارد (حداقل آزمایشی ۱۰ رویداد). امتیاز بالا مجوز خرید نیست.';
  }else{
   evidence.textContent='بررسی خارج از نمونه: '+fmt(n)+' رویداد؛ میانگین بازده خالص با هزینه فرضی '+fmt(holdout.costPct)+'٪: '+fmt(holdout.holdout.meanNetReturnPct)+'٪؛ سهم نتایج مثبت: '+fmt(holdout.holdout.netPositivePct)+'٪؛ سناریوی هزینه بیشتر ('+fmt(holdout.holdout.stressCostPct)+'٪): میانگین خالص '+fmt(holdout.holdout.stressMeanNetReturnPct)+'٪. '+(holdout.holdout.evidenceStatus==='FRAGILE_TO_COSTS'?'نتیجه به هزینه معاملات حساس است. ':holdout.holdout.evidenceStatus==='NONPOSITIVE_NET_RETURN'?'میانگین خالص آزمون مثبت نیست. ':'')+'این آزمون تشخیصی با قیمت‌های پایانی است و به‌تنهایی توان پیش‌بینی یا قابلیت اجرای معامله را اثبات نمی‌کند.';
  }
 }catch(e){
  evidence.textContent='اعتبار مستقل پیشنهاد: تأیید نشده. '+e.message+' نمایش نامزد ورود/خروج صرفاً بر مبنای قواعد تکنیکال و برای بررسی است.';
 }
 detail.append(evidence);
 const comparison=document.createElement('p');
 try{
  if(!holdout?.passiveComparison)throw Error('گزارش مقایسه موجود نیست.');
  const base=holdout.passiveComparison;
  const fmtPct=v=>v===null?'ناموجود':fmt(v)+'٪';
  comparison.textContent='مقایسه تشخیصی همان نماد: '+fmt(base.count)+' پنجره ثابت ۱۰جلسه‌ای مستقل از انتخاب سیگنال؛ میانگین خالص نگهداری فرضی '+fmtPct(base.meanNetReturnPct)+'؛ اختلاف میانگین رویدادهای نامزد ورود با آن '+fmtPct(base.excessMeanNetReturnPct)+'. این دو نمونه از نظر زمان حضور در بازار هم‌ارز نیستند؛ مقایسه با شاخص کل بازار یا اثبات برتری راهبرد نیست.';
 }catch(e){comparison.textContent='مقایسه مستقل بازده در دسترس نیست: '+e.message;}
 detail.append(comparison);
 const conditional=document.createElement('p');
 try{
  const plan=window.SahambanDecisionV129.decisionPlan(r);
  conditional.textContent='برنامه مشروط تا تاریخ '+pretty(plan.asOf)+': '+plan.when+' | شرط ابطال یا محدودیت: '+plan.invalidation+' | '+plan.dataStatus+' '+plan.evidence;
 }catch(e){conditional.textContent='برنامه اجرایی تأیید نشده: '+e.message;}
 detail.append(conditional);
 if(r.stop!==null){const plan=document.createElement('p');plan.textContent='سطح ساختاری زیر نظر: '+fmt(r.stop)+' ریال (کمترین قیمت پایانی ۲۰ جلسه قبل) | هدف آموزشی با نسبت ۲ به ۱: '+fmt(r.target)+' ریال. این سطوح تضمین اجرا یا قیمت قابل معامله نیستند.';detail.append(plan);}else{const plan=document.createElement('p');plan.textContent='سطح حد ضرر ساختاری قابل اتکا از این داده استخراج نشد؛ اندازه موقعیت محاسبه نمی‌شود.';detail.append(plan);}}
 function run(){if(!quotes.length){status.textContent='هنوز تاریخچه تأییدشده‌ای دریافت نشده است. به بخش «تحلیل تکنیکال تاریخی» بروید و «دریافت تاریخچه تأییدشده همه نمادها» را اجرا کنید؛ سپس به این ماژول برگردید.';return;}reports=[];if(exportButton)exportButton.disabled=true;const errors=[];for(const q of quotes){try{reports.push(window.SahambanDecisionV129.analyze(q,{today:dateTehran(),maxAgeDays:7}));}catch(e){errors.push(q.symbol+': '+e.message);}}reports.sort((a,b)=>b.score-a.score);select.replaceChildren();for(const r of reports){const o=document.createElement('option');o.value=r.symbol;o.textContent=r.symbol+' — '+r.action;select.append(o);}renderRows();if(exportButton)exportButton.disabled=reports.length===0;if(reports.length){select.value=reports[0].symbol;showDetail();}summary.textContent='نمادهای دارای تاریخچه کافی و تازه: '+fmt(reports.length)+' از '+fmt(quotes.length)+'. نمادهای کنارگذاشته‌شده: '+fmt(errors.length)+'. '+(errors.length?'علت‌ها: '+errors.join(' | '):'همه نمادهای بررسی‌شده داده معتبر داشتند.');status.textContent='تحلیل انجام شد؛ فقط داده تاریخی تأییدشده همین نشست استفاده شد. هیچ سفارشی ارسال و هیچ دارایی ذخیره یا تغییر داده نشد.';}
 if(exportButton)exportButton.addEventListener('click',()=>{
  if(!reports.length){status.textContent='برای دریافت گزارش، ابتدا تحلیل نمادها را اجرا کنید.';return;}
  try{
   const audit=window.SahambanDecisionV129.exportAudit(reports,{generatedAt:new Date().toISOString()});
   const blob=new Blob([JSON.stringify(audit,null,2)],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   try{
    const link=document.createElement('a');
    link.href=url;link.download='sahamban-decision-audit-'+audit.generatedAt.slice(0,10)+'.json';
    document.body.append(link);link.click();link.remove();
    status.textContent='گزارش تحلیل همین نشست روی دستگاه برای دانلود آماده شد؛ ارسال به سرور انجام نشد. این گزارش توصیه قطعی معامله یا اثبات بازده نیست.';
   }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(e){status.textContent='تهیه گزارش مستند انجام نشد: '+e.message;}
 });
 $('decisionRunV129').addEventListener('click',run);select.addEventListener('change',showDetail);$('decisionSizeV129').addEventListener('click',()=>{const r=reports.find(x=>x.symbol===select.value),out=$('decisionSizeResultV129');if(!r||r.code!=='ENTRY_CANDIDATE'||r.stop===null){out.textContent='محاسبه حجم فقط برای نامزد ورود با حد ضرر معتبر فعال است؛ ابتدا شروط ورود را بررسی کنید.';return;}try{const capital=Number($('decisionCapitalV129').value),riskPercent=Number($('decisionRiskV129').value),x=window.SahambanDecisionV129.sizePosition({capital,riskPercent,entry:r.last,stop:r.stop});out.textContent='بودجه ریسک: '+fmt(x.riskBudget)+' ریال | حداکثر تعداد قابل تأمین از سرمایه و بودجه ریسک: '+fmt(x.quantity)+' سهم | ارزش خرید نظری: '+fmt(x.estimatedCost)+' ریال | زیان نظری تا حد ضرر: '+fmt(x.maxLoss)+' ریال | محدودکننده: '+(x.limitedBy==='BOTH_LIMITS'?'سرمایه و بودجه ریسک به‌طور هم‌زمان':x.limitedBy==='AVAILABLE_CASH'?'سرمایه در دسترس':'بودجه ریسک')+'. این محاسبه پیش از کارمزد است و لغزش، صف و محدودیت نقدشوندگی لحاظ نشده‌اند؛ خرید خودکار انجام نمی‌شود.';}catch(e){out.textContent=e.message;}});
 window.addEventListener('sahamban:verified-historical-quotes-v50',e=>{const a=e?.detail?.quotes;if(Array.isArray(a)){quotes=a;reports=[];table.replaceChildren();detail.replaceChildren();select.replaceChildren();summary.textContent='گزارش‌های قبلی با دریافت داده جدید پاک شدند؛ تحلیل مجدد لازم است.';if(exportButton)exportButton.disabled=true;status.textContent='تاریخچه تأییدشده جدید دریافت شد. گزارش قبلی معتبر نیست؛ «تحلیل همه نمادها» را دوباره بزنید.';}});
})();
