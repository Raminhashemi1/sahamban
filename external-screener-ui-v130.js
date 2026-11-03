'use strict';
/* v130: explicit user-requested external symbol screening; no storage reads/writes. */
(()=>{
 const root=document.getElementById('externalScreenerV130');if(!root)return;
 const $=id=>document.getElementById(id),status=$('externalStatusV130'),results=$('externalResultsV130'),button=$('externalRunV130'),input=$('externalNamesV130');
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const dateTehran=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return String(p.year)+String(p.month).padStart(2,'0')+String(p.day).padStart(2,'0');};
 let busy=false;
 button.addEventListener('click',async()=>{
  if(busy)return;
  results.replaceChildren();
  let names;
  try{names=window.SahambanDiscoveryV130.parseNames(input.value);}
  catch(e){status.textContent=e.message;return;}
  busy=true;button.disabled=true;
  try{
   const observations=await window.SahambanDiscoveryV130.screen(input.value,{today:dateTehran(),onProgress:(done,total)=>{status.textContent='بررسی نمادهای خارج از سبد: '+fmt(done)+' از '+fmt(total)+' انجام شد.';}});
   const valid=observations.filter(x=>x.ok).sort((a,b)=>b.report.score-a.report.score),invalid=observations.filter(x=>!x.ok);
   const intro=document.createElement('p');intro.textContent='نتایج دارای تاریخچه معتبر: '+fmt(valid.length)+' از '+fmt(observations.length)+'. امتیاز فقط انطباق با قواعد است و احتمال سود یا سفارش خرید نیست.';results.append(intro);
   for(const item of valid){
    const r=item.report,d=document.createElement('details'),heading=document.createElement('summary');heading.textContent=r.symbol+' — '+r.action+' — امتیاز '+fmt(r.score)+' از ۱۰۰';d.append(heading);
    const p=document.createElement('p');p.textContent='آخرین روز داده: '+r.marketDate+' | قیمت پایانی: '+fmt(r.last)+' ریال. '+r.reason;d.append(p);
    const ul=document.createElement('ul');for(const [label,passed] of r.reasons){const li=document.createElement('li');li.textContent=(passed?'✓ ':'✗ ')+label;ul.append(li);}d.append(ul);
    const note=document.createElement('p');note.textContent='سطح ساختاری زیر نظر: '+(r.stop===null?'نامشخص':fmt(r.stop)+' ریال')+'. کارمزد، صف فروش، نقدشوندگی و عوامل بنیادی در این مدل لحاظ نشده‌اند.';d.append(note);
    results.append(d);
   }
   for(const item of invalid){const p=document.createElement('p');p.className='notice';p.textContent=item.symbol+': تحلیل نشد — '+item.error;results.append(p);}
   status.textContent='غربال محدود به پایان رسید. '+fmt(valid.length)+' نماد با داده کافی تحلیل شد؛ دارایی‌های شما تغییری نکرد.';
  }catch(e){status.textContent='غربال انجام نشد: '+e.message;}
  finally{busy=false;button.disabled=false;}
 });
})();
