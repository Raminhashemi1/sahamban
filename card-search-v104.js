'use strict';
/* v104: UI-only search within previously rendered asset cards.
 * Never reads source holdings, values, prices, storage or network.
 */
(()=>{
 const root=document.getElementById('livePortfolioTable');
 const list=root?.querySelector('.sb99-cards');
 if(!root||!list)return;
 list.id='sb104CardList';
 const form=document.createElement('div');
 form.className='sb104-card-filter';
 form.setAttribute('role','search');
 form.setAttribute('aria-label','جست‌وجوی نماد در کارت‌های سبد');
 const label=document.createElement('label');
 label.htmlFor='sb104CardSearch';
 label.textContent='پیدا کردن نماد در کارت‌ها';
 const row=document.createElement('div');
 row.className='sb104-filter-row';
 const input=document.createElement('input');
 input.id='sb104CardSearch';input.type='search';input.autocomplete='off';
 input.placeholder='نام نماد را بنویسید';
 input.setAttribute('aria-controls',list.id);
 input.setAttribute('aria-describedby','sb104CardSearchStatus');
 const clear=document.createElement('button');
 clear.type='button';clear.className='secondary';
 clear.textContent='نمایش همه';
 clear.hidden=true;
 const status=document.createElement('p');
 status.id='sb104CardSearchStatus';
 status.className='sb104-filter-status';
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 row.append(input,clear);form.append(label,row,status);
 list.insertAdjacentElement('beforebegin',form);
 const normalize=value=>String(value||'').toLocaleLowerCase('fa')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200d]/g,' ')
  .replace(/[۰-۹]/g,ch=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
  .replace(/[٠-٩]/g,ch=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)))
  .replace(/\s+/g,' ').trim();
 function filter(){
  const query=normalize(input.value);
  const cards=Array.from(list.querySelectorAll('.sb99-card'));
  let shown=0;
  for(const card of cards){
   const symbol=card.querySelector('h4')?.textContent||'';
   const match=!query||normalize(symbol).includes(query);
   card.hidden=!match;
   if(match)shown++;
  }
  clear.hidden=!query;
  status.textContent=!cards.length?'هنوز کارتی برای جست‌وجو وجود ندارد.'
   :query?(shown?shown+' نماد از '+cards.length+' نماد نمایش داده می‌شود.':'نمادی پیدا نشد؛ نام دیگری امتحان کنید.')
   :'همه '+cards.length+' نماد نمایش داده می‌شوند.';
 }
 input.addEventListener('input',filter);
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&input.value){
   event.preventDefault();input.value='';filter();
  }
 });
 clear.addEventListener('click',()=>{input.value='';filter();input.focus();});
 const observer=typeof MutationObserver==='function'?new MutationObserver(filter):null;
 if(observer)observer.observe(list,{childList:true});
 filter();
})();
