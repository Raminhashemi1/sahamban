'use strict';
/* ETF NAV source audit: no requests, storage or price inference.
 * The CDN endpoint is documented by multiple open-source clients, but availability
 * must be established independently in the user's browser.
 */
(()=>{
 const panel=document.getElementById('fundNavSourceAuditV71');if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:0}).format(n);
 const append=(parent,tag,v)=>{const node=document.createElement(tag);node.textContent=String(v);parent.append(node);return node};
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',e=>{
  try{
   const quotes=e?.detail?.quotes;
   if(!Array.isArray(quotes)||!quotes.length||quotes.length>100)throw Error('داده قیمت‌های تأییدشده در دسترس نیست.');
   const funds=quotes.filter(q=>q?.fundNavChecked===true||q?.assetClass==='fund_etf');
   panel.replaceChildren();
   append(panel,'strong','گزارش منبع و اعتبار داده NAV صندوق‌ها');
   append(panel,'p','منبع بررسی: TSETMC CDN /Fund/GetETFByInsCode/{insCode}؛ پاسخ etf، شناسه insCode، ارزش بازخرید pRedTran، تاریخ deven و در صورت وجود ساعت hEven. معتبر بودن ساختار پاسخ به معنای تأیید دسترسی شبکه در همه دستگاه‌ها نیست.');
   if(!funds.length){
    append(panel,'p','برای این نوبت، هیچ صندوقی با شناسه و جریان بازار مورد انتظار برای دریافت NAV شناسایی نشده است؛ درباره حباب عیار نتیجه‌ای نمی‌گیریم.');
    return;
   }
   let valid=0;
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');
   ['نماد','وضعیت شناسایی صندوق','NAV بازخرید (ریال)','تاریخ NAV','زمان NAV','گزارش اعتبار'].forEach(x=>append(head,'th',x));table.append(head);
   for(const q of funds){
    const verified=q.assetClass==='fund_etf';
    const nav=typeof q.fundNav==='number'&&Number.isFinite(q.fundNav)&&q.fundNav>0?q.fundNav:null;
    if(verified&&nav!==null&&/^\d{8}$/.test(String(q.fundNavDate||'')))valid++;
    const tr=document.createElement('tr');
    [String(q.symbol||'نامشخص'),verified?'شناسه ETF تطبیق یافت':'پاسخ ETF تأیید نشد',nav===null?'ناموجود':fmt(nav),q.fundNavDate||'نامشخص',q.fundNavTime||'نامشخص',String(q.fundNavStatus||'دلیل عدم تأیید مشخص نیست')].forEach(x=>append(tr,'td',x));
    table.append(tr);
   }
   append(panel,'p','پوشش NAV بازخرید معتبر: '+fmt(valid)+' از '+fmt(funds.length)+' تلاشِ مربوط به صندوق. اگر داده موجود نباشد، حباب صفر محسوب نمی‌شود.');
   panel.append(table);
   append(panel,'p','توجه: این گزارش اتصال به سرویس TSETMC را از طرف شما شبیه‌سازی نمی‌کند. تا پیش از مشاهده پاسخ معتبر روی مرورگر و تاریخ برابر با قیمت بازار، هیچ حبابی نباید مبنای معامله قرار گیرد.');
  }catch(error){panel.textContent='گزارش منبع NAV آماده نشد: '+error.message+'؛ نتیجه تخمینی نمایش داده نمی‌شود.';}
 });
})();
