'use strict';
/* Read-only stress scenario on three largest verified positions; no asset-class assumptions. */
(()=>{
 const panel=document.getElementById('portfolioTopThreeStressV69');
 if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const addCell=(row,value,heading=false)=>{
  const node=document.createElement(heading?'th':'td');
  node.textContent=String(value);
  node.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';
  row.append(node);
 };
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',event=>{
  try{
   const input=event?.detail?.positions;
   if(!Array.isArray(input)||!input.length||input.length>100)throw Error('فهرست کامل سبد معتبر نیست.');
   const seen=new Set();
   let total=0;
   const positions=input.map(p=>{
    const symbol=String(p?.symbol??'').trim();
    const quantity=p?.quantity,price=p?.price;
    if(!symbol||seen.has(symbol)||!Number.isSafeInteger(quantity)||quantity<=0||!Number.isSafeInteger(price)||price<=0)throw Error('شناسه یا قیمت و تعداد یکی از نمادها معتبر نیست.');
    seen.add(symbol);
    const value=quantity*price;
    if(!Number.isSafeInteger(value)||value<=0)throw Error('محاسبه ارزش یک دارایی امن نیست.');
    total+=value;
    if(!Number.isSafeInteger(total))throw Error('جمع سبد از محدوده محاسبه مطمئن خارج است.');
    return {symbol,value,date:String(p.marketDate??'')};
   });
   const ranked=positions.sort((a,b)=>b.value-a.value);
   const top=ranked.slice(0,3),topValue=top.reduce((sum,p)=>sum+p.value,0);
   if(!Number.isSafeInteger(topValue)||total<=0)throw Error('ارزش سه دارایی بزرگ معتبر نیست.');
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='آزمون تنش هم‌زمان سه دارایی بزرگ سبد';panel.append(title);
   const summary=document.createElement('p');summary.textContent='تعداد دارایی‌های بررسی‌شده: '+fmt(positions.length)+' | نمادهای مشمول: '+top.map(p=>p.symbol).join('، ')+' | وزن تجمعی: '+fmt(topValue/total*100)+'٪ از ارزش سبد.';panel.append(summary);
   const description=document.createElement('p');description.textContent='در هر سناریو فرض می‌شود قیمت همه دارایی‌های فهرست‌شده به یک اندازه کاهش یابد و سایر دارایی‌ها ثابت بمانند. در سبدهای کمتر از سه نماد، همه دارایی‌های موجود لحاظ می‌شوند. این سناریو پیش‌بینی، احتمال وقوع یا توصیه معامله نیست.';panel.append(description);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');
   ['افت هم‌زمان نمادهای منتخب','کاهش ارزش کل (ریال)','افت کل سبد','ارزش باقی‌مانده (ریال)'].forEach(x=>addCell(head,x,true));table.append(head);
   [5,10,20].forEach(shock=>{
    const loss=topValue*shock/100;
    const row=document.createElement('tr');
    [fmt(shock)+'٪',fmt(loss),fmt(loss/total*100)+'٪',fmt(total-loss)].forEach(v=>addCell(row,v));table.append(row);
   });
   panel.append(table);
   const dates=new Set(ranked.map(p=>p.date).filter(Boolean));
   if(dates.size>1||ranked.some(p=>!/^\d{8}$/.test(p.date))){
    const warning=document.createElement('p');warning.textContent='هشدار تاریخ: تاریخ قیمت همه نمادها یکسان یا کامل نیست؛ این مقایسه براساس قیمت‌های تأییدشده با زمان‌های متفاوت است.';panel.append(warning);
   }
  }catch(e){panel.textContent='محاسبه تنش هم‌زمان انجام نشد: '+e.message+'؛ هیچ عدد تخمینی جایگزین نشد.';}
 });
})();
