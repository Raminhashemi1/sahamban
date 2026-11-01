'use strict';
/* Per-symbol relative turnover index. Descriptive only; not a liquidity score or trade signal. */
(()=>{
 const panel=document.getElementById('portfolioRelativeTurnoverV67');if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const validDate=d=>/^\d{8}$/.test(String(d??''));
 const validValue=n=>Number.isSafeInteger(n)&&n>0;
 const median=values=>{const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  try{
   const quotes=event?.detail?.quotes;
   if(!Array.isArray(quotes)||!quotes.length||quotes.length>100)throw Error('فهرست تاریخچه معتبر نیست.');
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='شاخص ارزش معاملات هر نماد نسبت به سابقه خودش';panel.append(title);
   const note=document.createElement('p');note.textContent='ارزش معاملات آخرین جلسه با میانه ارزش معاملات همان نماد در حداکثر ۲۰ جلسه اخیر مقایسه می‌شود. حداقل ۱۵ مشاهده مثبت و معتبر لازم است. عدد ۱۰۰٪ یعنی برابر میانه سابقه همان نماد؛ این شاخص مقایسه نقدشوندگی بین نمادها یا سیگنال معاملاتی نیست.';panel.append(note);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const trh=document.createElement('tr');['نماد','آخرین ارزش معاملات (ریال)','میانه تا ۲۰ جلسه (ریال)','نسبت به سابقه','جلسات معتبر','وضعیت'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';trh.append(th)});table.append(trh);
   quotes.forEach(q=>{
    const rows=(Array.isArray(q?.history)?q.history:[]).filter(x=>validDate(x?.date)).sort((a,b)=>a.date.localeCompare(b.date));
    const unique=[...new Map(rows.map(x=>[x.date,x])).values()].slice(-20);
    const values=unique.map(x=>x.tradedValue).filter(validValue);
    const latest=unique.length?unique[unique.length-1]:null;
    const last=latest&&validValue(latest.tradedValue)?latest.tradedValue:null;
    const med=values.length>=15?median(values):null;
    const ratio=last!==null&&med>0?last/med*100:null;
    const cells=[String(q?.symbol||'نامشخص'),last===null?'نامشخص':fmt(last),med===null?'نامشخص':fmt(med),ratio===null?'نامشخص':fmt(ratio)+'٪',fmt(values.length)+'/۲۰',ratio===null?'داده ناکافی':ratio>150?'بالاتر از میانه':ratio<50?'پایین‌تر از میانه':'نزدیک به میانه'];
    const tr=document.createElement('tr');cells.forEach(v=>{const td=document.createElement('td');td.textContent=String(v);td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr);
   });
   panel.append(table);
   const foot=document.createElement('p');foot.textContent='تفسیر: افزایش ارزش معاملات نسبت به سابقه خود نماد فقط افزایش فعالیت اسمی را نشان می‌دهد؛ برای ارزیابی نقدشوندگی باید اسپرد، عمق سفارش، تداوم معاملات و اندازه صندوق نیز بررسی شود. روزهای بدون داده به‌عنوان صفر ثبت نمی‌شوند.';panel.append(foot);
  }catch(e){panel.textContent='شاخص نسبی ارزش معاملات آماده نشد: '+e.message+'؛ داده تخمینی نمایش داده نشد.';}
 });
})();
