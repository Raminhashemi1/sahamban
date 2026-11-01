'use strict';
/* v93: presentation-only beginner glossary and onboarding progress.
 * Never reads financial inputs, portfolio data, storage, or network.
 */
(()=>{
 const home=document.getElementById('sahambanHubV87');
 const tour=document.getElementById('sb92Tour');
 const quick=home?.querySelector('.sb92-quick');
 if(!home||!tour||!quick)return;
 const heading=document.createElement('h3');
 heading.textContent='واژه‌های پرکاربرد، به زبان ساده';
 heading.className='sb93-glossary-title';
 const glossary=document.createElement('details');
 glossary.className='sb93-glossary';
 const summary=document.createElement('summary');
 summary.textContent='آشنایی با ارزش سبد، وزن دارایی، NAV و ریسک';
 summary.setAttribute('aria-label','باز کردن توضیح چهار اصطلاح مالی');
 const list=document.createElement('dl');
 const definitions=[
  ['ارزش سبد','ارزش برآوردی دارایی‌ها بر اساس قیمت‌های موجود؛ برای تصمیم‌گیری، تاریخ هر قیمت را بررسی کنید.'],
  ['وزن دارایی','سهم نسبی هر دارایی از ارزش کل سبد؛ وزن بیشتر می‌تواند تمرکز ریسک را افزایش دهد.'],
  ['NAV','خالص ارزش دارایی‌های صندوق؛ باید نوع NAV و تاریخ آن مشخص باشد. نبود داده معتبر به معنی صفر نیست.'],
  ['ریسک سبد','نمایش سناریوها و میزان تمرکز؛ پیش‌بینی قطعی یا پیشنهاد خرید و فروش نیست.']
 ];
 for(const [word,definition] of definitions){
  const term=document.createElement('dt');term.textContent=word;
  const description=document.createElement('dd');description.textContent=definition;
  list.append(term,description);
 }
 glossary.append(summary,heading,list);
 tour.insertAdjacentElement('afterend',glossary);
 const steps=document.createElement('div');
 steps.className='sb93-tour-progress';
 steps.setAttribute('aria-label','پیشرفت راهنمای چهارمرحله‌ای');
 const indicators=[];
 for(let index=0;index<4;index++){
  const item=document.createElement('span');
  item.className='sb93-tour-dot';
  item.setAttribute('aria-hidden','true');
  steps.append(item);indicators.push(item);
 }
 const top=tour.querySelector('.sb92-tour-top');
 const count=tour.querySelector('.sb92-tour-count');
 if(top&&count){
  top.insertAdjacentElement('afterend',steps);
  const observer=typeof MutationObserver==='function'?new MutationObserver(update):null;
  function update(){
   const current=Number((count.textContent||'').match(/\d+/)?.[0]||1);
   indicators.forEach((item,index)=>item.classList.toggle('sb93-done',index<current));
   steps.setAttribute('aria-label','گام '+current+' از ۴');
  }
  update();
  if(observer)observer.observe(count,{childList:true,characterData:true,subtree:true});
 }
})();
