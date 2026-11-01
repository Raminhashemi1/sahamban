'use strict';
/* Read-only NAV quality review. Equal market and NAV dates do not prove synchronization. */
(()=>{
 const panel=document.getElementById('fundNavQualityV70');if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:0}).format(n);
 const epoch=v=>{
  const s=String(v??'').trim();
  if(!/^\d{8}$/.test(s))return null;
  const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8),dt=Date.UTC(y,m-1,d),x=new Date(dt);
  return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d?dt:null;
 };
 const tehranToday=()=>{
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  return Date.UTC(p.year,p.month-1,p.day);
 };
 const append=(parent,tag,content)=>{const el=document.createElement(tag);el.textContent=String(content);parent.append(el);return el};
 const validPositive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',event=>{
  try{
   const quotes=event?.detail?.quotes;
   if(!Array.isArray(quotes)||quotes.length<1||quotes.length>100)throw Error('فهرست قیمت‌ها نامعتبر است.');
   const funds=quotes.filter(q=>q?.assetClass==='fund_etf');
   panel.replaceChildren();
   append(panel,'strong','پوشش، تاریخ و کیفیت NAV صندوق‌ها');
   append(panel,'p','تطبیق تاریخ قیمت و NAV شرط لازم است؛ با این حال زمان به‌روزرسانی NAV و آخرین معامله ممکن است متفاوت باشد. حباب صرفاً شاخص توصیفی است، نه فرصت آربیتراژ یا توصیه معامله.');
   if(!funds.length){append(panel,'p','هیچ صندوق ETF تأییدشده‌ای در داده دریافتی نیست. ناشناخته‌بودن طبقه‌بندی، اثبات سهام‌بودن عیار نیست.');return;}
   const today=tehranToday();
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');
   ['نماد','تاریخ بازار','تاریخ NAV','قدمت داده','مبنای قیمت','اعتبار مقایسه'].forEach(x=>append(head,'th',x));table.append(head);
   let eligible=0;
   funds.forEach(q=>{
    const md=epoch(q.marketDate),nd=epoch(q.fundNavDate);
    const age=md===null?null:Math.floor((today-md)/86400000);
    const reasons=[];
    if(!validPositive(q.price))reasons.push('قیمت بازار نامعتبر');
    if(!validPositive(q.fundNav))reasons.push('NAV بازخرید معتبر موجود نیست');
    if(md===null||nd===null)reasons.push('تاریخ بازار یا NAV نامعتبر');
    else if(md!==nd)reasons.push('تاریخ NAV و بازار متفاوت است');
    if(age!==null&&(age<0||age>7))reasons.push(age<0?'تاریخ بازار در آینده است':'قیمت بازار بیش از ۷ روز قدیمی است');
    if(md!==null&&nd!==null&&nd>today)reasons.push('تاریخ NAV در آینده است');
    const status=reasons.length?reasons.join('؛ '):'هم‌تاریخ و دارای ارقام معتبر؛ صرفاً توصیفی';
    if(!reasons.length)eligible++;
    const row=document.createElement('tr');
    [String(q.symbol||'نامشخص'),q.marketDate||'نامشخص',q.fundNavDate||'نامشخص',age===null?'نامشخص':age<0?'آینده':fmt(age)+' روز',String(q.priceKind||'نامشخص'),status].forEach(x=>append(row,'td',x));
    table.append(row);
   });
   append(panel,'p','پوشش قابل بررسی: '+fmt(eligible)+' از '+fmt(funds.length)+' صندوق تأییدشده. نبود داده NAV به معنای حباب صفر نیست.');
   panel.append(table);
  }catch(e){panel.textContent='بررسی کیفیت NAV انجام نشد: '+e.message+'؛ هیچ نتیجه تخمینی نمایش داده نشد.';}
 });
})();
