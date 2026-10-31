'use strict';
/* ETF premium/discount versus TSETMC redemption NAV (pRedTran).
 * Comparisons are published only when quote and NAV dates match exactly.
 */
(()=> {
 const panel=document.getElementById('riskFundNavPremiumV63');
 if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',event=>{
  try{
   const quotes=event?.detail?.quotes;
   if(!Array.isArray(quotes)||!quotes.length||quotes.length>100)throw Error('فهرست نمادهای سبد معتبر نیست.');
   const funds=quotes.filter(q=>q?.assetClass==='fund_etf');
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='حباب صندوق‌ها نسبت به NAV بازخرید';panel.append(title);
   const note=document.createElement('p');note.textContent='فرمول: (قیمت بازار ÷ NAV بازخرید − ۱) × ۱۰۰. حباب مثبت یعنی معامله بالاتر از NAV و حباب منفی یعنی معامله پایین‌تر از NAV. فقط NAV بازخرید رسمی pRedTran و قیمت بازار با تاریخ یکسان مقایسه می‌شوند؛ NAV پذیره‌نویسی جایگزین نمی‌شود.';panel.append(note);
   if(!funds.length){const empty=document.createElement('p');empty.textContent='در سبد، صندوق ETF با شناسه رسمی تأییدشده پیدا نشد.';panel.append(empty);return;}
   const comparable=[],stale=[];
   for(const q of funds){
    const price=Number(q.price),nav=Number(q.fundNav);
    if(!Number.isFinite(price)||price<=0||!Number.isFinite(nav)||nav<=0||!/^\d{8}$/.test(String(q.marketDate||''))||!/^\d{8}$/.test(String(q.fundNavDate||''))){stale.push({q,reason:'قیمت یا NAV معتبر/دارای تاریخ نیست'});continue;}
    if(q.marketDate!==q.fundNavDate){stale.push({q,reason:'تاریخ قیمت بازار و NAV یکسان نیست'});continue;}
    const premium=(price/nav-1)*100;
    if(!Number.isFinite(premium)){stale.push({q,reason:'محاسبه حباب معتبر نیست'});continue;}
    comparable.push({symbol:String(q.symbol),price,nav,difference:price-nav,premium,priceKind:String(q.priceKind||'قیمت بازار'),date:q.marketDate});
   }
   comparable.sort((a,b)=>b.premium-a.premium);
   const summary=document.createElement('p');summary.textContent='صندوق‌های تأییدشده: '+fmt(funds.length)+' | قابل مقایسه با تاریخ یکسان: '+fmt(comparable.length)+' | خارج از رتبه‌بندی به‌دلیل داده ناقص/ناهم‌تاریخ: '+fmt(stale.length);panel.append(summary);
   if(comparable.length){
    const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
    const head=document.createElement('tr');['نماد','نوع قیمت','قیمت بازار (ریال)','NAV بازخرید (ریال)','اختلاف (ریال)','حباب','تاریخ'].forEach(x=>{const th=document.createElement('th');th.textContent=x;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
    comparable.forEach(x=>{const tr=document.createElement('tr');const premiumLabel=x.premium>0?'حباب مثبت':x.premium<0?'حباب منفی':'برابر NAV';[x.symbol,x.priceKind,fmt(x.price),fmt(x.nav),fmt(x.difference),fmt(Math.abs(x.premium))+'٪ '+premiumLabel,x.date].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});panel.append(table);
   }else{const empty=document.createElement('p');empty.textContent='فعلاً هیچ صندوقی با قیمت و NAV هم‌تاریخ برای محاسبه معتبر وجود ندارد.';panel.append(empty);}
   if(stale.length){const warning=document.createElement('p');warning.textContent='موارد خارج از رتبه‌بندی: '+stale.map(x=>x.q.symbol+' ('+x.reason+')').join('؛ ')+'. داده ناهم‌تاریخ به‌عنوان حباب معتبر نمایش داده نشده است.';panel.append(warning);}
  }catch(e){panel.textContent='محاسبه حباب صندوق انجام نشد: '+e.message+'؛ هیچ مقدار تخمینی نمایش داده نشده است.';}
 });
})();
