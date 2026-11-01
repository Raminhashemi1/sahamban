'use strict';
/* Read-only concentration analysis from a complete, identity-verified quote snapshot.
 * No stored holdings access, trade recommendation or asset-class inference.
 */
(()=>{
 const panel=document.getElementById('portfolioConcentrationV68');
 if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const cell=(tr,value)=>{const td=document.createElement('td');td.textContent=String(value);td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td);};
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',event=>{
  try{
   const rows=event?.detail?.positions;
   if(!Array.isArray(rows)||!rows.length||rows.length>100)throw Error('پوشش کامل و معتبر سبد موجود نیست.');
   const symbols=new Set();
   let total=0;
   const positions=rows.map(p=>{
    const symbol=String(p?.symbol??'').trim(),quantity=p?.quantity,price=p?.price;
    if(!symbol||symbols.has(symbol)||!Number.isSafeInteger(quantity)||quantity<=0||!Number.isSafeInteger(price)||price<=0)throw Error('تعداد، قیمت یا شناسه یکی از دارایی‌ها معتبر نیست.');
    symbols.add(symbol);
    const marketValue=quantity*price;
    if(!Number.isSafeInteger(marketValue)||marketValue<=0)throw Error('ارزش یکی از دارایی‌ها در محدوده مطمئن نیست.');
    total+=marketValue;
    if(!Number.isSafeInteger(total))throw Error('جمع سبد از محدوده عددی مطمئن خارج است.');
    return {symbol,quantity,price,marketValue,assetClass:p.assetClass,marketDate:String(p.marketDate||'')};
   });
   if(total<=0)throw Error('ارزش کل سبد معتبر نیست.');
   positions.sort((a,b)=>b.marketValue-a.marketValue);
   const top=positions[0],weight=p=>p.marketValue/total;
   const hhi=positions.reduce((sum,p)=>sum+weight(p)**2,0)*10000;
   const top3=positions.slice(0,3).reduce((sum,p)=>sum+p.marketValue,0)/total*100;
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='بررسی تمرکز سبد و سناریوی افت دارایی';panel.append(title);
   const summary=document.createElement('p');summary.textContent='ارزش کل تأییدشده: '+fmt(total)+' ریال | بزرگ‌ترین دارایی: '+top.symbol+' با وزن '+fmt(weight(top)*100)+'٪ | سه دارایی بزرگ: '+fmt(top3)+'٪ | HHI: '+fmt(hhi)+' از ۱۰٬۰۰۰';panel.append(summary);
   const concentration=document.createElement('p');concentration.textContent=weight(top)>0.3?'هشدار تمرکز: وزن بزرگ‌ترین نماد از آستانه اطلاع‌رسانی ۳۰٪ بیشتر است. این آستانه صرفاً معیار نمایش هشدار است، نه دستور فروش.':'وزن بزرگ‌ترین نماد حداکثر ۳۰٪ است؛ این موضوع به‌تنهایی ایمنی سبد را ثابت نمی‌کند.';panel.append(concentration);
   const specific=positions.find(p=>p.symbol==='عیار');
   if(specific){
    const paragraph=document.createElement('p');paragraph.textContent='عیار: '+fmt(specific.quantity)+' واحد/سهم | قیمت مبنا: '+fmt(specific.price)+' ریال | ارزش روز: '+fmt(specific.marketValue)+' ریال | وزن سبد: '+fmt(weight(specific)*100)+'٪ | نوع دارایی: '+(specific.assetClass==='fund_etf'?'صندوق ETF تأییدشده':specific.assetClass==='equity'?'سهام تأییدشده':'هنوز قطعی نیست');panel.append(paragraph);
   }
   const note=document.createElement('p');note.textContent='سناریوها فرضی‌اند: با ثابت‌ماندن قیمت سایر دارایی‌ها، کاهش قیمت یک دارایی چه اثری بر ارزش کل سبد می‌گذارد. نوع صندوق طلا یا میزان مواجهه با طلا از نام عیار حدس زده نمی‌شود؛ برای آن داده ترکیب دارایی صندوق لازم است.';panel.append(note);
   const targets=specific&&specific.symbol!==top.symbol?[top,specific]:[top];
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');['نماد','وزن سبد','افت فرضی نماد','کاهش ارزش کل سبد (ریال)','افت کل سبد'].forEach(x=>{const th=document.createElement('th');th.textContent=x;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   targets.forEach(p=>[5,10,20].forEach(shock=>{
    const tr=document.createElement('tr'),loss=p.marketValue*shock/100;
    [p.symbol,fmt(weight(p)*100)+'٪',fmt(shock)+'٪',fmt(loss),fmt(loss/total*100)+'٪'].forEach(v=>cell(tr,v));table.append(tr);
   }));
   panel.append(table);
   const dates=new Set(positions.map(p=>p.marketDate).filter(Boolean));
   if(dates.size>1){const warning=document.createElement('p');warning.textContent='هشدار هم‌زمانی: تاریخ قیمت نمادهای سبد یکسان نیست و سناریوها از آخرین قیمت تأییدشده هر نماد استفاده می‌کنند.';panel.append(warning);}
  }catch(e){panel.textContent='بررسی تمرکز سبد انجام نشد: '+e.message+' هیچ مقدار تخمینی نمایش داده نشد.';}
 });
})();
