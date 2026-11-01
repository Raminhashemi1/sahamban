'use strict';
/* Historical traded value is a coverage-aware descriptive statistic, not a liquidity score. */
(()=>{
 const panel=document.getElementById('portfolioLiquidityHistoryV65');if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:0}).format(n);
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  try{
   const quotes=event?.detail?.quotes;
   if(!Array.isArray(quotes)||!quotes.length||quotes.length>100)throw Error('فهرست تاریخچه معتبر نیست.');
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='ارزش معاملات تاریخی و پوشش داده';panel.append(title);
   const note=document.createElement('p');note.textContent='میانگین ارزش معاملات از qTotCap در آخرین ۲۰ جلسه معتبر هر نماد محاسبه می‌شود. روزهای فاقد مقدار معتبر در مخرج میانگین وارد نمی‌شوند؛ تعداد روزهای دارای داده کنار میانگین نمایش داده می‌شود. این شاخص توصیفی است و به‌تنهایی رتبه نقدشوندگی یا توصیه معاملاتی نیست.';panel.append(note);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');['نماد','جلسات بررسی‌شده','جلسات دارای ارزش معتبر','میانگین ارزش معاملات (ریال)','آخرین تاریخ تاریخچه'].forEach(x=>{const th=document.createElement('th');th.textContent=x;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   quotes.forEach(q=>{
    const history=Array.isArray(q?.history)?q.history:[];
    const unique=new Map();
    history.filter(x=>/^\d{8}$/.test(String(x?.date||''))).sort((a,b)=>a.date.localeCompare(b.date)).slice(-20).forEach(x=>unique.set(x.date,x));
    const rows=[...unique.values()],valid=rows.map(x=>x.tradedValue).filter(x=>Number.isSafeInteger(x)&&x>=0);
    const avg=valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;
    const tr=document.createElement('tr');
    [String(q?.symbol||'نامشخص'),fmt(rows.length),fmt(valid.length),avg===null?'نامشخص':fmt(avg),rows.length?rows[rows.length-1].date:'نامشخص'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});
    table.append(tr);
   });
   panel.append(table);
   const foot=document.createElement('p');foot.textContent='توجه: نبود داده ارزش معاملات به معنی صفر بودن معاملات نیست. برای مقایسه منصفانه، تعداد جلسات دارای داده را بررسی کنید؛ مقایسه ارزش اسمی بین دوره‌های متفاوت نیز اثر تورم و تغییر سطح قیمت‌ها را در نظر نمی‌گیرد.';panel.append(foot);
  }catch(e){panel.textContent='گزارش ارزش معاملات تاریخی آماده نشد: '+e.message+'؛ داده تخمینی نمایش داده نشد.';}
 });
})();
