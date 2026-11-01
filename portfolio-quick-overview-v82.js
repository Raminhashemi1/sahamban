'use strict';
/* v82: read-only NAV/concentration summary from complete verified snapshots.
 * Nothing stored, fetched, exported, or calculated from cached browser holdings.
 */
(()=>{
 const panel=document.getElementById('portfolioQuickOverviewV82');
 if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const make=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;panel.append(n);return n};
 const dateEpoch=value=>{
  const s=String(value??'');
  if(!/^\d{8}$/.test(s))return null;
  const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8),v=Date.UTC(y,m-1,d),x=new Date(v);
  return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d?v:null;
 };
 const tehranToday=()=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  return Date.UTC(parts.year,parts.month-1,parts.day);
 };
 let quotes=null,positions=null,failed=false;
 function render(){
  panel.replaceChildren();
  make('strong','خلاصه سریع NAV و تمرکز سبد');
  if(failed){make('p','دریافت کامل قیمت‌ها ناموفق بود؛ خلاصه قبلی برای جلوگیری از نمایش داده قدیمی پاک شد.');return;}
  if(!quotes||!positions){make('p','پس از دریافت و تأیید قیمت تمام نمادها، خلاصه NAV و تمرکز اینجا نمایش داده می‌شود.');return;}
  try{
   if(!Array.isArray(quotes)||!Array.isArray(positions)||!positions.length||positions.length>100||quotes.length!==positions.length)throw Error('پوشش سبد کامل نیست');
   const index=new Map(),seen=new Set();
   let total=0;
   for(const p of positions){
    const symbol=typeof p?.symbol==='string'?p.symbol.trim():'';
    if(!symbol||index.has(symbol)||!Number.isSafeInteger(p.quantity)||p.quantity<=0||!Number.isSafeInteger(p.price)||p.price<=0)throw Error('اطلاعات دارایی معتبر نیست');
    const value=p.quantity*p.price;
    if(!Number.isSafeInteger(value)||value<=0||!Number.isSafeInteger(total+value))throw Error('مقدار ارزش‌گذاری خارج از محدوده معتبر است');
    index.set(symbol,{price:p.price,date:String(p.marketDate??''),value});
    total+=value;
   }
   for(const q of quotes){
    const symbol=typeof q?.symbol==='string'?q.symbol.trim():'',p=index.get(symbol);
    if(!p||seen.has(symbol)||q.price!==p.price||String(q.marketDate??'')!==p.date)throw Error('گزارش NAV و قیمت‌های سبد منطبق نیست');
    seen.add(symbol);
   }
   if(seen.size!==index.size)throw Error('پوشش سبد ناقص است');
   const largest=[...index].sort((a,b)=>b[1].value-a[1].value)[0],weight=largest[1].value/total*100;
   make('p','بزرگ‌ترین دارایی: '+largest[0]+' · '+fmt(weight)+'٪ از ارزش سبد.');
   if(weight>30)make('p','هشدار تمرکز: وزن بزرگ‌ترین دارایی از آستانه اطلاع‌رسانی ۳۰٪ بیشتر است. این هشدار توصیه خرید یا فروش نیست.');
   else make('p','تمرکز بزرگ‌ترین دارایی از ۳۰٪ بیشتر نیست؛ این موضوع به‌تنهایی ایمنی سبد را تضمین نمی‌کند.');
   const ayar=quotes.find(q=>String(q.symbol).trim()==='عیار');
   if(!ayar){make('p','NAV عیار: نماد عیار در سبد فعلی وجود ندارد.');return;}
   const p=index.get('عیار'),md=dateEpoch(p.date),nd=dateEpoch(ayar.fundNavDate),today=tehranToday();
   const age=md===null?null:Math.floor((today-md)/86400000);
   const valid=ayar.assetClass==='fund_etf'&&ayar.fundNavProbeStatus==='nav-verified'&&typeof ayar.fundNav==='number'&&Number.isFinite(ayar.fundNav)&&ayar.fundNav>0&&md!==null&&md===nd&&age!==null&&age>=0&&age<=7;
   if(!valid){make('p','NAV عیار هنوز برای مقایسه معتبر نیست؛ مقدار حباب نمایش داده نمی‌شود.');return;}
   const premium=(p.price/ayar.fundNav-1)*100;
   if(!Number.isFinite(premium))throw Error('مقایسه NAV معتبر نیست');
   make('p','عیار · قیمت بازار: '+fmt(p.price)+' ریال · NAV بازخرید: '+fmt(ayar.fundNav)+' ریال · اختلاف: '+fmt(p.price-ayar.fundNav)+' ریال · '+(premium>0?'حباب مثبت ':premium<0?'حباب منفی ':'برابر با NAV ')+fmt(Math.abs(premium))+'٪.');
   make('p','تاریخ قیمت و NAV: '+p.date+'؛ هم‌تاریخ بودن، هم‌زمانی لحظه‌ای را تضمین نمی‌کند. مقایسه صرفاً توصیفی است.');
  }catch(e){panel.replaceChildren();make('strong','خلاصه سریع NAV و تمرکز سبد');make('p','داده معتبر یا منطبق برای خلاصه موجود نیست؛ هیچ عدد تخمینی نمایش داده نشده است.');}
 }
 window.addEventListener('sahamban:portfolio-refresh-status-v76',e=>{
  const status=e?.detail?.status;
  if(status==='started'){quotes=null;positions=null;failed=false;render();}
  if(status==='failed'){quotes=null;positions=null;failed=true;render();}
 });
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',e=>{quotes=e?.detail?.quotes??null;positions=null;failed=false;render()});
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',e=>{positions=e?.detail?.positions??null;render()});
 render();
})();