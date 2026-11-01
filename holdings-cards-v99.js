'use strict';
/* v99 read-only alternative to the already-rendered portfolio table.
 * Copies displayed cell text only, never touches portfolio logic, NAV, storage or network.
 */
(()=>{
 const root=document.getElementById('livePortfolioTable');
 const table=root?.querySelector('.portfolio-v61-table');
 const rows=document.getElementById('livePortfolioRows');
 const scroll=root?.querySelector('.portfolio-v61-scroll');
 if(!root||!table||!rows||!scroll)return;
 const controls=document.createElement('div');
 controls.className='sb99-controls';
 controls.setAttribute('role','group');
 controls.setAttribute('aria-label','انتخاب نمایش دارایی‌ها');
 const cardsButton=document.createElement('button');
 cardsButton.type='button';cardsButton.className='sb99-mode';
 cardsButton.textContent='کارت‌های دارایی';
 const tableButton=document.createElement('button');
 tableButton.type='button';tableButton.className='sb99-mode';
 tableButton.textContent='جدول';
 const status=document.createElement('p');
 status.className='sb99-status';status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 controls.append(cardsButton,tableButton,status);
 const list=document.createElement('div');
 list.className='sb99-cards';
 list.setAttribute('aria-label','کارت‌های دارایی‌های سبد');
 scroll.insertAdjacentElement('beforebegin',controls);
 scroll.insertAdjacentElement('afterend',list);
 const keyColumns=[0,1,4,9];
 const headings=Array.from(table.querySelectorAll('thead th')).map(el=>el.textContent.trim());
 let mode=typeof matchMedia==='function'&&matchMedia('(max-width: 520px)').matches?'cards':'table';
 function showMode(){
  const cardMode=mode==='cards';
  root.classList.toggle('sb99-card-mode',cardMode);
  cardsButton.setAttribute('aria-pressed',String(cardMode));
  tableButton.setAttribute('aria-pressed',String(!cardMode));
  scroll.hidden=cardMode;
  list.hidden=!cardMode;
  const count=rows.querySelectorAll('tr').length;
  status.textContent=cardMode
   ?(count?'نمای کارت: '+count+' دارایی؛ جزئیات هر کارت را می‌توانید باز کنید.':'پس از دریافت معتبر قیمت‌ها، کارت دارایی‌ها نمایش داده می‌شود.')
   :'نمای جدول: تمام ستون‌های اصلی موجودند.';
 }
 function render(){
  const fragment=document.createDocumentFragment();
  const dataRows=Array.from(rows.querySelectorAll('tr'));
  for(const tr of dataRows){
   const cells=Array.from(tr.querySelectorAll('td'));
   if(cells.length!==headings.length||cells.length!==15)continue;
   const card=document.createElement('article');card.className='sb99-card';
   const title=document.createElement('h4');title.textContent=cells[0].textContent||'نماد نامشخص';
   card.append(title);
   const summary=document.createElement('dl');summary.className='sb99-fields';
   const add=(dest,index)=>{
    const dt=document.createElement('dt');dt.textContent=headings[index];
    const dd=document.createElement('dd');dd.textContent=cells[index].textContent;
    dest.append(dt,dd);
   };
   for(const index of keyColumns)add(summary,index);
   card.append(summary);
   const details=document.createElement('details');details.className='sb99-more';
   const label=document.createElement('summary');label.textContent='نمایش ۱۱ جزئیات دیگر';
   const rest=document.createElement('dl');rest.className='sb99-fields sb99-extra';
   for(let index=0;index<15;index++)if(!keyColumns.includes(index))add(rest,index);
   details.append(label,rest);card.append(details);fragment.append(card);
  }
  list.replaceChildren(fragment);
  showMode();
 }
 // Coalesce bursts of row updates into a single frame. Never alter source rows.
 let queued=false;
 function sync(){
  if(mode==='cards'){
   // Update navigation state synchronously; defer only expensive DOM cloning.
   showMode();
   if(queued)return;
   queued=true;
   const schedule=typeof requestAnimationFrame==='function'?requestAnimationFrame:callback=>callback();
   schedule(()=>{
    queued=false;
    if(mode==='cards')render();
   });
  }else{
   list.replaceChildren();
   showMode();
  }
 }
 cardsButton.addEventListener('click',()=>{mode='cards';sync();});
 tableButton.addEventListener('click',()=>{mode='table';sync();});
 const observer=typeof MutationObserver==='function'?new MutationObserver(sync):null;
 if(observer)observer.observe(rows,{childList:true});
 sync();
})();
