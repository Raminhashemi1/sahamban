'use strict';
/* Verified fund/equity allocation. No network calls, storage writes, or order actions. */
(()=> {
 const panel=document.getElementById('riskAssetAllocationV62');
 if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const digits=s=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
 window.addEventListener('sahamban:verified-portfolio-asset-types-v62',event=>{
  try{
   const rows=[...(document.getElementById('livePortfolioRows')?.querySelectorAll('tr')||[])],incoming=event?.detail?.quotes;
   if(!rows.length||rows.length>100||!Array.isArray(incoming))throw Error('اطلاعات سبد یا طبقه‌بندی دارایی معتبر نیست.');
   const values=new Map(rows.map(tr=>{
    const c=[...tr.querySelectorAll('td')],symbol=String(c[0]?.textContent||'').trim(),value=Number(digits(c[4]?.textContent));
    if(!symbol||!Number.isFinite(value)||value<0)throw Error('ارزش روز یکی از نمادها معتبر نیست.');
    return [symbol,value];
   }));
   const types=new Map(incoming.map(q=>[q?.symbol,q]));
   if(types.size!==values.size||[...values.keys()].some(s=>!types.has(s)))throw Error('پوشش طبقه‌بندی با فهرست سبد یکسان نیست؛ جمع‌بندی ناقص نمایش داده نمی‌شود.');
   const labels={equity:'سهام شرکت',fund_etf:'صندوق قابل معامله',preemptive_right:'حق تقدم',unknown:'نامشخص'};
   const groups=new Map(Object.keys(labels).map(k=>[k,{key:k,label:labels[k],value:0,count:0}]));
   for(const [symbol,value] of values){
    const type=types.get(symbol),key=Object.hasOwn(labels,type?.assetClass)?type.assetClass:'unknown',g=groups.get(key);
    g.value+=value;g.count++;
   }
   const total=[...values.values()].reduce((a,b)=>a+b,0);
   if(!(total>0)||!Number.isFinite(total))throw Error('ارزش کل سبد معتبر نیست.');
   const result=[...groups.values()].filter(g=>g.count).sort((a,b)=>b.value-a.value);
   const classified=result.filter(g=>g.key!=='unknown').reduce((a,g)=>a+g.value,0),coverage=classified/total;
   const hhi=result.filter(g=>g.key!=='unknown').reduce((a,g)=>a+(g.value/total)**2,0);
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='تفکیک صندوق‌ها از سهام و حق‌تقدم';panel.append(title);
   const note=document.createElement('p');note.textContent='تشخیص صندوق فقط با تطبیق شناسه دقیق ابزار در سرویس صندوق TSETMC پذیرفته می‌شود؛ سهام و حق‌تقدم از کد نوع ابزار رسمی خوانده می‌شوند. نام نماد یا شباهت اسمی به‌تنهایی مبنای طبقه‌بندی نیست.';panel.append(note);
   const summary=document.createElement('p');summary.textContent='پوشش طبقه‌بندی قطعی: '+fmt(coverage*100)+'٪ ارزش سبد | شاخص تمرکز طبقه دارایی: '+fmt(hhi*10000)+' از ۱۰٬۰۰۰'+(result.some(g=>g.key==='unknown')?' | بخشی از ارزش سبد هنوز نامشخص است.':'');panel.append(summary);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');['نوع دارایی','تعداد نماد','ارزش روز (ریال)','سهم از کل سبد'].forEach(x=>{const th=document.createElement('th');th.textContent=x;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   result.forEach(g=>{const tr=document.createElement('tr');[g.label,fmt(g.count),fmt(g.value),fmt(g.value/total*100)+'٪'].forEach(x=>{const td=document.createElement('td');td.textContent=x;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});
   panel.append(table);
   if(result.some(g=>g.key==='unknown')){const warning=document.createElement('p');warning.textContent='هشدار: ابزارهای نامشخص در گروه سهام یا صندوق قرار داده نشده‌اند و در محاسبه پوشش قطعی منظور نشده‌اند. برای تکمیل تشخیص، داده هویتی رسمی نماد باید در دسترس باشد.';panel.append(warning);}
  }catch(e){panel.textContent='تفکیک نوع دارایی انجام نشد: '+e.message+' طبقه‌بندی حدسی استفاده نشده است.';}
 });
})();
