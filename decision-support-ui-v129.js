'use strict';
/* v129 read-only decision assistant. Consumes only the separately verified history event. */
(()=>{const $=id=>document.getElementById(id);const root=$('decisionSupportV129');if(!root)return;
 const status=$('decisionStatusV129'),summary=$('decisionSummaryV129'),table=$('decisionTableV129'),detail=$('decisionDetailV129'),select=$('decisionSymbolV129');
 let quotes=[],reports=[],fundamentalReviews=new Map();const exportButton=$('decisionExportV129');
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
   evidence.textContent='بررسی خارج از نمونه: '+fmt(n)+' رویداد؛ میانگین بازده خالص با هزینه فرضی '+fmt(holdout.costPct)+'٪: '+fmt(holdout.holdout.meanNetReturnPct)+'٪؛ سهم نتایج مثبت: '+fmt(holdout.holdout.netPositivePct)+'٪؛ بازه توصیفی عدم‌قطعیت نرخ نتیجه مثبت (Wilson ۹۵٪؛ بدون فرض استقلال معتبر): '+fmt(holdout.holdout.positiveRateUncertainty.lowerPct)+' تا '+fmt(holdout.holdout.positiveRateUncertainty.upperPct)+'٪؛ سناریوی هزینه بیشتر ('+fmt(holdout.holdout.stressCostPct)+'٪): میانگین خالص '+fmt(holdout.holdout.stressMeanNetReturnPct)+'٪. '+(holdout.holdout.evidenceStatus==='FRAGILE_TO_COSTS'?'نتیجه به هزینه معاملات حساس است. ':holdout.holdout.evidenceStatus==='NONPOSITIVE_NET_RETURN'?'میانگین خالص آزمون مثبت نیست. ':'')+'نمونه‌های یک نماد از نظر آماری مستقل نیستند؛ بازه Wilson صرفاً توصیفی است، نه احتمال موفقیت آینده. این آزمون تشخیصی با قیمت‌های پایانی است و به‌تنهایی توان پیش‌بینی یا قابلیت اجرای معامله را اثبات نمی‌کند.';
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
 const fundamental=fundamentalReviews.get(window.SahambanFundamentalEvidenceV150?.normalizeSymbol(r.symbol));
 if(fundamental){
  const fline=document.createElement('p');
  fline.textContent='دروازه بنیادی: '+(fundamental.status==='FUNDAMENTAL_REVIEW_READY'?'حداقل شروط شواهد بنیادی عبور کرده است؛ این نتیجه ارزندگی یا توصیه خرید نیست.':'مسدود؛ '+(fundamental.reasons||[]).join('، '));
  detail.append(fline);
  if(fundamental.financialRatios){
   const ratios=fundamental.financialRatios.ratios||{},valuation=fundamental.financialRatios.valuation||{};
   const ratioLine=document.createElement('p');
   ratioLine.textContent='حاشیه عملیاتی: '+(ratios.operatingMarginPct==null?'ناموجود':fmt(ratios.operatingMarginPct)+'٪')+
    ' | حاشیه خالص: '+(ratios.netMarginPct==null?'ناموجود':fmt(ratios.netMarginPct)+'٪')+
    ' | ROE: '+(ratios.roePct==null?'ناموجود':fmt(ratios.roePct)+'٪')+
    ' | ROA: '+(ratios.roaPct==null?'ناموجود':fmt(ratios.roaPct)+'٪')+
    ' | تبدیل جریان نقد: '+(ratios.operatingCashFlowToNetIncome==null?'ناموجود':fmt(ratios.operatingCashFlowToNetIncome));
   detail.append(ratioLine);
   const valLine=document.createElement('p');
   valLine.textContent='P/E: '+(valuation.pe==null?'ناموجود':fmt(valuation.pe))+
    ' | P/B: '+(valuation.pb==null?'ناموجود':fmt(valuation.pb))+
    ' | P/S: '+(valuation.ps==null?'ناموجود':fmt(valuation.ps))+
    ' | پرچم‌های بررسی: '+(fundamental.financialRatios.flags||[]).join('، ');
   detail.append(valLine);
  }
 }else{
  const fline=document.createElement('p');fline.textContent='دروازه بنیادی هنوز برای این نماد اجرا نشده است؛ نامزد تکنیکال به‌تنهایی مجوز بررسی ورود نیست.';detail.append(fline);
 }
 const conditional=document.createElement('p');
 try{
  const plan=window.SahambanDecisionV129.decisionPlan(r,{fundamentalReview:fundamental});
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
 const fundamentalFile=$('fundamentalEvidenceFileV150');
 const fundamentalStatus=$('fundamentalReviewStatusV150');
 const fundamentalDetail=$('fundamentalReviewDetailV150');
 const attestation=$('fundamentalOriginalAttestationV150');
 function clearFundamentalReview(){
  fundamentalReviews.clear();
  if(fundamentalFile)fundamentalFile.value='';
  if(attestation)attestation.checked=false;
  if(fundamentalStatus)fundamentalStatus.textContent='بررسی بنیادی این نشست پاک شد؛ هیچ داده‌ای ذخیره یا ارسال نشده است.';
  if(fundamentalDetail)fundamentalDetail.textContent='';
  if(reports.length)showDetail();
 }
 async function runFundamentalReview(){
  if(!fundamentalFile?.files?.length){fundamentalStatus.textContent='ابتدا فایل JSON شواهد مالی را انتخاب کنید.';return;}
  if(!attestation?.checked){fundamentalStatus.textContent='برای ادامه، تطبیق شخصی اصل گزارش، ردیف‌ها و واحدها را تأیید کنید.';return;}
  const file=fundamentalFile.files[0];
  if(file.size<=0||file.size>128*1024){fundamentalStatus.textContent='حجم فایل JSON باید بین ۱ بایت تا ۱۲۸ کیلوبایت باشد.';return;}
  try{
   const payload=JSON.parse(await file.text());
   let data=payload?.financialEvidence&&typeof payload.financialEvidence==='object'?payload.financialEvidence:payload;
   if(payload?.schema==='sahamban.codal.row-audit.v1'){
    const doc=payload.document,rows=payload.fields;
    if(!doc||!Array.isArray(rows)||!rows.length)throw Error('ساختار بسته ردیف‌های کدال ناقص است.');
    const fields={};
    for(const row of rows){
     if(!row||typeof row.metric!=='string'||Object.prototype.hasOwnProperty.call(fields,row.metric))throw Error('ردیف مالی تکراری یا نامعتبر است.');
     fields[row.metric]={amount:row.amount,unit:row.unit,source_row:row.sourceRow,source_page:row.sourcePage};
    }
    data={symbol:doc.symbol,tracing_no:doc.tracingNo,report_url:doc.reportUrl,
     publication_date:doc.publicationDate,period_end:doc.periodEnd,unit:doc.unit,
     audit_status:doc.auditStatus,statement_basis:doc.statementBasis,
     document_sha256:doc.sha256,original_document_read:true,origin_verified:false,
     source:'USER_ENTERED_LOCAL_PACKET_REQUIRES_HUMAN_ATTESTATION',fields,
     ...(payload.dividendEvidence&&typeof payload.dividendEvidence==='object'?{
      dividend_status:payload.dividendEvidence.status,
      dividend_record_date:payload.dividendEvidence.recordDate,
      dividend_approval_source_row:payload.dividendEvidence.approvalSourceRow,
      dividend_approval_source_page:payload.dividendEvidence.approvalSourcePage,
      dividend_record_date_source_row:payload.dividendEvidence.recordDateSourceRow,
      dividend_record_date_source_page:payload.dividendEvidence.recordDateSourcePage
     }:{})};
   }
   const expected=String(data?.symbol??'').trim();
   if(!expected)throw Error('نماد در فایل شواهد مالی مشخص نشده است.');
   if(!window.SahambanFundamentalGateV150?.evaluateFundamentalGate)throw Error('موتور بنیادی در مرورگر بارگذاری نشده است.');
   const norm=window.SahambanFundamentalEvidenceV150.normalizeSymbol(expected);
   const quote=quotes.find(x=>window.SahambanFundamentalEvidenceV150.normalizeSymbol(x.symbol)===norm);
   const last=quote?.history?.at(-1);
   const marketPriceEvidence=last&&Number.isFinite(Number(last.close))&&Number(last.close)>0?
    {status:'VERIFIED_MARKET_CLOSE',symbol:quote.symbol,closeRialPerShare:Number(last.close),marketDate:last.date,source:'VERIFIED_HISTORICAL_QUOTE_EVENT'}:undefined;
   const review=window.SahambanFundamentalGateV150.evaluateFundamentalGate(data,expected,
    marketPriceEvidence?{marketPriceEvidence,asOfDate:last.date}:{});
   fundamentalReviews.set(norm,review);
   fundamentalStatus.textContent=review.status==='FUNDAMENTAL_REVIEW_READY'?
    'بررسی حداقلی بنیادی آماده بازبینی است. EPS: '+fmt(review.epsRialPerShare)+' ریال/سهم | DPS: '+(review.dpsRialPerShare==null?'ارائه نشده':fmt(review.dpsRialPerShare)+' ریال/سهم')+
    ' | وضعیت نسبت‌ها: '+review.ratioStatus+'. عبور از این مرحله به‌تنهایی ارزندگی یا مجوز معامله نیست.':
    'دروازه بنیادی مسدود است: '+(review.reasons||[]).join('، ');
   const parts=[];
   if(review.financialRatios){
    const rr=review.financialRatios.ratios||{},v=review.financialRatios.valuation||{};
    parts.push('حاشیه عملیاتی: '+(rr.operatingMarginPct==null?'ناموجود':fmt(rr.operatingMarginPct)+'٪'));
    parts.push('حاشیه خالص: '+(rr.netMarginPct==null?'ناموجود':fmt(rr.netMarginPct)+'٪'));
    parts.push('ROE: '+(rr.roePct==null?'ناموجود':fmt(rr.roePct)+'٪'));
    parts.push('ROA: '+(rr.roaPct==null?'ناموجود':fmt(rr.roaPct)+'٪'));
    parts.push('بدهی به حقوق مالکانه: '+(rr.liabilitiesToEquity==null?'ناموجود':fmt(rr.liabilitiesToEquity)));
    parts.push('جریان نقد عملیاتی/سود خالص: '+(rr.operatingCashFlowToNetIncome==null?'ناموجود':fmt(rr.operatingCashFlowToNetIncome)));
    parts.push('P/E: '+(v.pe==null?'ناموجود':fmt(v.pe))+' | P/B: '+(v.pb==null?'ناموجود':fmt(v.pb))+' | P/S: '+(v.ps==null?'ناموجود':fmt(v.ps)));
    if(review.financialRatios.flags?.length)parts.push('پرچم‌های بررسی: '+review.financialRatios.flags.join('، '));
   }
   fundamentalDetail.textContent='نماد: '+review.symbol+' | دوره: '+(review.periodEnd||'نامشخص')+' | مبنا: '+(review.statementBasis||'نامشخص')+
    ' | حسابرسی: '+(review.auditStatus||'نامشخص')+' | EPS: '+(review.epsRialPerShare==null?'ناموجود':fmt(review.epsRialPerShare)+' ریال')+
    (parts.length?'\n'+parts.join('\n'):'')+'\nتوجه: این نتایج از داده‌های کاربر و ردیف‌های ادعاشده محاسبه شده‌اند و اصالت سند/صحت رقم را مستقل اثبات نمی‌کنند.';
   if(reports.length&&select.value&&window.SahambanFundamentalEvidenceV150.normalizeSymbol(select.value)===norm)showDetail();
  }catch(e){fundamentalStatus.textContent='بررسی انجام نشد: '+e.message;fundamentalDetail.textContent='هیچ سیگنال یا داده‌ای تغییر نکرد.';}
 }
 $('fundamentalReviewRunV150')?.addEventListener('click',runFundamentalReview);
 $('fundamentalReviewClearV150')?.addEventListener('click',clearFundamentalReview);
 $('decisionRunV129').addEventListener('click',run);select.addEventListener('change',showDetail);$('decisionSizeV129').addEventListener('click',()=>{const r=reports.find(x=>x.symbol===select.value),out=$('decisionSizeResultV129');if(!r||r.code!=='ENTRY_CANDIDATE'||r.stop===null){out.textContent='محاسبه حجم فقط برای نامزد ورود با حد ضرر معتبر فعال است؛ ابتدا شروط ورود را بررسی کنید.';return;}try{const capital=Number($('decisionCapitalV129').value),riskPercent=Number($('decisionRiskV129').value),x=window.SahambanDecisionV129.sizePosition({capital,riskPercent,entry:r.last,stop:r.stop});out.textContent='بودجه ریسک: '+fmt(x.riskBudget)+' ریال | حداکثر تعداد قابل تأمین از سرمایه و بودجه ریسک: '+fmt(x.quantity)+' سهم | ارزش خرید نظری: '+fmt(x.estimatedCost)+' ریال | زیان نظری تا حد ضرر: '+fmt(x.maxLoss)+' ریال | محدودکننده: '+(x.limitedBy==='BOTH_LIMITS'?'سرمایه و بودجه ریسک به‌طور هم‌زمان':x.limitedBy==='AVAILABLE_CASH'?'سرمایه در دسترس':'بودجه ریسک')+'. این محاسبه پیش از کارمزد است و لغزش، صف و محدودیت نقدشوندگی لحاظ نشده‌اند؛ خرید خودکار انجام نمی‌شود.';}catch(e){out.textContent=e.message;}});
 window.addEventListener('sahamban:verified-historical-quotes-v50',e=>{const a=e?.detail?.quotes;if(Array.isArray(a)){quotes=a;reports=[];fundamentalReviews.clear();table.replaceChildren();detail.replaceChildren();select.replaceChildren();summary.textContent='گزارش‌های قبلی با دریافت داده جدید پاک شدند؛ تحلیل مجدد لازم است.';if(exportButton)exportButton.disabled=true;status.textContent='تاریخچه تأییدشده جدید دریافت شد. گزارش قبلی معتبر نیست؛ «تحلیل همه نمادها» را دوباره بزنید.';}});
})();
