'use strict';
/* v92: compact, keyboard-friendly module overview and optional first-use tour.
 * No portfolio reads, network traffic, analytics or persistent onboarding state.
 */
(()=>{
 const home=document.getElementById('sahambanHubV87');
 const grid=document.getElementById('sahambanModulesV87');
 const intro=home?.querySelector('.sahamban-hub-intro-v87');
 if(!home||!grid||!intro)return;
 home.classList.add('sb92-home');
 grid.setAttribute('aria-label','ده ماژول سهام‌بان؛ انتخاب برای ورود');
 intro.querySelector('h2').textContent='همه ابزارها، یک‌جا';
 const subtitle=intro.querySelector('p');
 if(subtitle)subtitle.textContent='ماژول موردنظر را انتخاب کنید. «؟ آموزش» راهنمای کوتاه همان ابزار را نشان می‌دهد.';
 const cards=Array.from(grid.querySelectorAll('.sahamban-module-v87'));
 for(const card of cards){
  const link=card.querySelector('.sahamban-module-link-v87');
  const help=card.querySelector('.sahamban-module-help-v87');
  if(link)link.setAttribute('aria-label','باز کردن '+(link.querySelector('strong')?.textContent||'ماژول'));
  if(help)help.textContent='راهنما';
 }
 const tourSteps=[
  {title:'از سبدتان شروع کنید',body:'اگر اطلاعات سبد را ندارید، می‌توانید از فایل CSV یا Excel کارگزاری استفاده کنید. قبل از اعمال داده، نمادها، تعداد و بهای خرید را بررسی کنید.',name:'ورود دارایی‌ها',id:'brokerImportSection'},
  {title:'قیمت‌ها را خودتان دریافت کنید',body:'در «سبد من» درخواست دریافت قیمت را اجرا کنید. تاریخ بازار هر نماد را بررسی کنید؛ این قیمت‌ها الزاماً لحظه‌ای نیستند.',name:'سبد من',id:'livePortfolioSection'},
  {title:'اعداد را درست بخوانید',body:'در «سبد من» ارزش کل، وزن دارایی و وضعیت NAV را ببینید. نبود NAV معتبر به معنی صفر بودن آن نیست.',name:'نمای کلی سبد',id:'livePortfolioSection'},
  {title:'ریسک را با احتیاط بررسی کنید',body:'در «ریسک سبد» سود و زیان و افت فرضی را مشاهده کنید. این خروجی پیش‌بینی بازار یا دستور خرید و فروش نیست.',name:'ریسک سبد',id:'portfolioSection'}
 ];
 const quick=document.createElement('div');
 quick.className='sb92-quick';
 const line=document.createElement('p');
 line.className='sb92-quick-path';
 line.textContent='مسیر پیشنهادی: ورود دارایی‌ها ← دریافت قیمت ← بررسی ریسک';
 const open=document.createElement('button');open.type='button';open.className='secondary sb92-tour-start';
 open.textContent='آموزش اولین استفاده (۴ قدم)';
 open.setAttribute('aria-expanded','false');
 open.setAttribute('aria-controls','sb92Tour');
 quick.append(line,open);
 intro.insertAdjacentElement('afterend',quick);
 const panel=document.createElement('section');
 panel.className='sb92-tour';
 panel.id='sb92Tour';
 panel.hidden=true;
 panel.setAttribute('aria-labelledby','sb92TourTitle');
 panel.setAttribute('aria-live','polite');
 const top=document.createElement('div');top.className='sb92-tour-top';
 const count=document.createElement('span');count.className='sb92-tour-count';
 const close=document.createElement('button');close.type='button';close.className='secondary sb92-tour-close';close.textContent='بستن راهنما';
 top.append(count,close);
 const title=document.createElement('h3');title.id='sb92TourTitle';title.tabIndex=-1;
 const desc=document.createElement('p');desc.className='sb92-tour-desc';
 const actions=document.createElement('div');actions.className='sb92-tour-actions';
 const prev=document.createElement('button');prev.type='button';prev.className='secondary';prev.textContent='قبلی';
 const next=document.createElement('button');next.type='button';next.className='secondary';
 const go=document.createElement('a');go.className='sb92-tour-go';
 actions.append(prev,next,go);
 panel.append(top,title,desc,actions);
 quick.insertAdjacentElement('afterend',panel);
 let current=0;
 function render(){
  const step=tourSteps[current];
  count.textContent='گام '+(current+1)+' از '+tourSteps.length;
  title.textContent=step.title;
  desc.textContent=step.body;
  go.href='#'+step.id;
  go.textContent='رفتن به '+step.name;
  prev.disabled=current===0;
  next.textContent=current===tourSteps.length-1?'شروع دوباره':'گام بعد';
 }
 function reveal(){
  panel.hidden=false;open.setAttribute('aria-expanded','true');
  render();title.focus();
 }
 function hide(){
  panel.hidden=true;open.setAttribute('aria-expanded','false');open.focus();
 }
 open.addEventListener('click',()=>{if(panel.hidden){current=0;reveal();}else hide();});
 close.addEventListener('click',hide);
 prev.addEventListener('click',()=>{if(current>0){current--;render();title.focus();}});
 next.addEventListener('click',()=>{current=(current+1)%tourSteps.length;render();title.focus();});
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();hide();}});
 window.addEventListener('hashchange',()=>{if(location.hash&&location.hash!=='#home'){panel.hidden=true;open.setAttribute('aria-expanded','false');}});
})();
