'use strict';
/* Overview only: event-driven, read-only and fail-closed. Never extrapolate from missing NAV. */
(()=>{
 const panel=document.getElementById('portfolioStatusDashboardV73');if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 let fundSnapshot=null,portfolioSnapshot=null;
 const validNumber=n=>Number.isSafeInteger(n)&&n>0;
 const label=(name,value)=>{const line=document.createElement('p');line.textContent=name+': '+value;panel.append(line);};
 function render(){
  panel.replaceChildren();
  const heading=document.createElement('strong');heading.textContent='داشبورد خلاصه وضعیت و اعتبار داده‌های سبد';panel.append(heading);
  if(!portfolioSnapshot){label('وضعیت سبد','در انتظار دریافت و تأیید قیمت تمام دارایی‌ها');return;}
  try{
   const positions=portfolioSnapshot;
   if(!Array.isArray(positions)||!positions.length||positions.length>100)throw Error('اطلاعات همه دارایی‌ها موجود نیست');
   const symbols=new Set();let total=0;
   const rows=positions.map(p=>{
    const symbol=String(p?.symbol??'').trim();
    if(!symbol||symbols.has(symbol)||!validNumber(p.quantity)||!validNumber(p.price))throw Error('شناسه یا مقدار یکی از دارایی‌ها معتبر نیست');
    symbols.add(symbol);
    const value=p.quantity*p.price;total+=value;
    if(!Number.isSafeInteger(value)||!Number.isSafeInteger(total))throw Error('ارزش سبد از محدوده ایمن محاسبه خارج است');
    return {symbol,value,price:p.price,marketDate:String(p.marketDate??'')};
   }).sort((a,b)=>b.value-a.value);
   const largest=rows[0],top=rows.slice(0,3),topSum=top.reduce((a,b)=>a+b.value,0);
   const pct=100*largest.value/total,concentration=100*topSum/total;
   label('وضعیت قیمت سبد','تمام '+fmt(rows.length)+' نماد برای محاسبه این گزارش دریافت شده‌اند');
   label('بزرگ‌ترین دارایی',largest.symbol+' · '+fmt(pct)+'٪ از سبد');
   label('سهم سه دارایی بزرگ',fmt(concentration)+'٪');
   label('افت فرضی هم‌زمان ۱۰٪ سه دارایی بزرگ',fmt(concentration/10)+'٪ افت ارزش کل سبد؛ نه پیش‌بینی بازار');
   label('ریسک تمرکز',pct>30?'وزن بزرگ‌ترین دارایی بالاتر از آستانه اطلاع‌رسانی ۳۰٪ است':'وزن بزرگ‌ترین دارایی از ۳۰٪ بیشتر نیست؛ به‌تنهایی نشان‌دهنده ایمنی نیست');
   if(rows.some(x=>!/^\d{8}$/.test(x.marketDate))||new Set(rows.map(x=>x.marketDate)).size>1)label('تاریخ داده‌ها','ناقص یا ناهم‌تاریخ؛ مقایسه مقطعی با احتیاط');
   else label('تاریخ قیمت‌های سبد',rows[0].marketDate+'؛ قیمت‌ها الزاماً لحظه‌ای نیستند');
   const ayar=rows.find(x=>x.symbol==='عیار');
   if(ayar)label('وزن عیار',fmt(100*ayar.value/total)+'٪؛ نوع دارایی از نام نماد استنباط نمی‌شود');
   if(!fundSnapshot){label('NAV صندوق‌ها','گزارش اعتبار NAV برای این نوبت موجود نیست؛ حباب نامشخص');return;}
   if(!Array.isArray(fundSnapshot)||fundSnapshot.length!==rows.length)throw Error('گزارش NAV با سبد فعلی منطبق نیست');
   const fundSymbols=new Set();const funds=[];
   for(const q of fundSnapshot){
    const symbol=String(q?.symbol??'').trim();
    if(!symbol||fundSymbols.has(symbol)||!symbols.has(symbol))throw Error('شناسه گزارش NAV با سبد فعلی مطابقت ندارد');
    fundSymbols.add(symbol);
    const position=rows.find(x=>x.symbol===symbol);
    if(String(q.marketDate??'')!==position.marketDate)throw Error('تاریخ NAV و سبد فعلی با هم مطابقت ندارند');
    if(typeof q.price!=='number'||q.price!==position.price)throw Error('قیمت NAV و قیمت سبد فعلی با هم مطابقت ندارند');
    if(q.assetClass==='fund_etf'||q.fundNavChecked===true)funds.push(q);
   }
   let valid=0,unknown=0;
   for(const q of funds){
    if(q.assetClass!=='fund_etf'||typeof q.fundNav!=='number'||!Number.isFinite(q.fundNav)||q.fundNav<=0||typeof q.price!=='number'||!Number.isFinite(q.price)||q.price<=0||q.marketDate!==q.fundNavDate)unknown++;
    else valid++;
   }
   label('اعتبار NAV صندوق‌ها',fmt(valid)+' صندوق با NAV و قیمت هم‌تاریخ از '+fmt(funds.length)+' صندوق بررسی‌شده؛ '+fmt(unknown)+' مورد نامعتبر/ناهم‌تاریخ');
   if(ayar){
    const q=funds.find(x=>x.symbol==='عیار');
    label('وضعیت NAV عیار',!q?'نوع صندوق عیار تأیید نشده؛ حباب نامشخص':q.assetClass!=='fund_etf'?'پاسخ رسمی صندوق تأیید نشده؛ حباب نامشخص':q.fundNav>0&&typeof q.fundNav==='number'&&typeof q.price==='number'&&q.price>0&&q.marketDate===q.fundNavDate?'قیمت و NAV بازخرید هم‌تاریخ‌اند؛ هم‌زمانی لحظه‌ای تأیید نشده':'NAV عیار معتبر یا هم‌تاریخ نیست؛ حباب نامشخص');
   }
   label('تفسیر','این خلاصه توصیفی است، نه رتبه‌بندی نقدشوندگی یا توصیه خرید و فروش');
  }catch(e){panel.textContent='داشبورد قابل اتکا نیست: '+e.message+'؛ نتیجه تخمینی نمایش داده نمی‌شود.';}
 }
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',e=>{
  fundSnapshot=e?.detail?.quotes??null;
  portfolioSnapshot=null;render();
 });
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',e=>{
  portfolioSnapshot=e?.detail?.positions??null;render();
 });
 render();
})();
