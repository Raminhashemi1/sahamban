'use strict';
/* v49 risk engine: read-only; never persists, changes or uploads holdings. */
(()=>{
 const $=id=>document.getElementById(id);
 const digits=s=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬،]/g,'').replace(/٫/g,'.');
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 function fail(s){$('riskStatusV49').textContent=s;$('riskSummaryV49').textContent='';$('riskDetailsV49').replaceChildren();}
 function readVerifiedRows(){
  const status=$('livePortfolioStatus')?.textContent||'';
  if(!/دریافت و اعتبارسنجی قیمت پایانی همه ۱۹ نماد موفق بود/.test(status) &&
     !/دریافت و اعتبارسنجی قیمت پایانی همه/.test(status)) throw Error('ابتدا دکمه دریافت قیمت پایانی همه نمادها را اجرا کنید و موفقیت اعتبارسنجی قیمت‌ها را ببینید.');
  const rows=[...($('livePortfolioRows')?.querySelectorAll('tr')||[])];
  if(!rows.length)throw Error('جدول قیمت تأییدشده در صفحه موجود نیست.');
  const result=rows.map(tr=>{
   const c=[...tr.querySelectorAll('td')].map(td=>td.textContent.trim());
   if(c.length<7)throw Error('ساختار جدول قیمت ناقص است.');
   const quantity=Number(digits(c[1])),buy=Number(digits(c[2])),price=Number(digits(c[3]));
   if(!c[0]||![quantity,buy,price].every(Number.isFinite)||quantity<=0||buy<=0||price<=0)throw Error('مقادیر نامعتبر در ردیف '+(c[0]||'نامشخص'));
   return {symbol:c[0],quantity,buy,price,value:quantity*price,cost:quantity*buy,date:c[6]};
  });
  if(result.length>100||result.some(x=>!Number.isSafeInteger(x.quantity)||!Number.isFinite(x.value)||!Number.isFinite(x.cost)||x.value>Number.MAX_SAFE_INTEGER||x.cost>Number.MAX_SAFE_INTEGER))throw Error('مقادیر از محدوده محاسبه امن خارج‌اند.');
  return result;
 }
 $('riskCalculateV49').addEventListener('click',()=>{
  try{
   const budget=Number(digits($('riskBudgetV49').value)),shock=Number($('riskShockV49').value);
   if(!Number.isFinite(budget)||budget<0.1||budget>10)throw Error('بودجه ریسک را بین ۰٫۱ تا ۱۰ درصد وارد کنید.');
   if(![5,10,20,30].includes(shock))throw Error('سناریوی افت نامعتبر است.');
   const rows=readVerifiedRows(),total=rows.reduce((s,r)=>s+r.value,0),cost=rows.reduce((s,r)=>s+r.cost,0);
   if(!Number.isFinite(total)||total<=0||total>Number.MAX_SAFE_INTEGER)throw Error('ارزش کل سبد نامعتبر است.');
   const hhi=rows.reduce((s,r)=>s+(r.value/total)**2,0),top=[...rows].sort((a,b)=>b.value-a.value);
   const budgetRial=total*budget/100,stress=total*shock/100,pnl=total-cost;
   $('riskStatusV49').textContent='محاسبه موفق: '+fmt(rows.length)+' نماد از جدول قیمت پایانی تأییدشده خوانده شد. اطلاعات ذخیره‌شده تغییر نکرد.';
   $('riskSummaryV49').textContent='ارزش مبنای سبد: '+fmt(total)+' ریال | سود/زیان نسبت به بهای خرید: '+fmt(pnl)+' ریال | افت فرضی '+fmt(shock)+'٪: '+fmt(stress)+' ریال زیان بالقوه | بودجه ریسک فرضی '+fmt(budget)+'٪ ارزش سبد: '+fmt(budgetRial)+' ریال | شاخص تمرکز HHI: '+fmt(hhi*10000)+' از ۱۰۰۰۰.';
   const table=document.createElement('table');table.style.width='100%';const head=document.createElement('tr');
   ['نماد','وزن از سبد','ارزش روز (ریال)','افت فرضی '+shock+'٪ (ریال)','سهم از تمرکز'].forEach(x=>{const th=document.createElement('th');th.textContent=x;th.style.padding='8px';head.append(th)});table.append(head);
   top.forEach(r=>{const tr=document.createElement('tr');[r.symbol,fmt(r.value/total*100)+'٪',fmt(r.value),fmt(r.value*shock/100),fmt((r.value/total)**2*10000)].forEach(x=>{const td=document.createElement('td');td.textContent=x;td.style.padding='8px';td.style.borderBottom='1px solid #34546d';tr.append(td)});table.append(tr)});
   $('riskDetailsV49').replaceChildren(table);
  }catch(e){fail('محاسبه انجام نشد: '+e.message);}
 });
})();
