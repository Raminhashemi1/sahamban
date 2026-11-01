'use strict';
/* v98: A presentation-only column visibility switch for the existing holdings table.
 * Never reads holdings, prices, NAV, values, market data, or persistent state.
 */
(()=>{
 const root=document.getElementById('livePortfolioTable');
 const scroll=root?.querySelector('.portfolio-v61-scroll');
 const table=scroll?.querySelector('.portfolio-v61-table');
 if(!root||!scroll||!table)return;
 const controls=document.createElement('div');
 controls.className='sb98-view-controls';
 controls.setAttribute('role','group');
 controls.setAttribute('aria-label','نحوه نمایش ستون‌های جدول دارایی‌ها');
 const lead=document.createElement('p');
 lead.className='sb98-view-lead';
 lead.textContent='برای مرور سریع، چهار ستون اصلی را ببینید؛ همه ۱۵ ستون در نمای کامل در دسترس‌اند.';
 const simple=document.createElement('button');
 simple.type='button';simple.className='sb98-view-button';
 simple.textContent='نمای ساده';
 const full=document.createElement('button');
 full.type='button';full.className='sb98-view-button';
 full.textContent='نمای کامل';
 const hint=document.createElement('p');
 hint.className='sb98-view-hint';
 hint.id='sb98ViewHint';hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');
 controls.append(lead,simple,full,hint);
 scroll.insertAdjacentElement('beforebegin',controls);
 function setMode(compact){
  root.classList.toggle('sb98-compact',compact);
  simple.setAttribute('aria-pressed',String(compact));
  full.setAttribute('aria-pressed',String(!compact));
  hint.textContent=compact?'نمای ساده: نماد، تعداد، ارزش و تاریخ بازار. برای سایر اطلاعات، «نمای کامل» را بزنید.':'نمای کامل: تمام ۱۵ ستون موجود است؛ جدول را افقی پیمایش کنید.';
  scroll.scrollLeft=0;
 }
 simple.addEventListener('click',()=>setMode(true));
 full.addEventListener('click',()=>setMode(false));
 setMode(typeof matchMedia==='function'&&matchMedia('(max-width: 520px)').matches);
})();
