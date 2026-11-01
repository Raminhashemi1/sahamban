'use strict';
/* v105: keyboard skip navigation; no contact with portfolio or market data. */
(()=>{
 const main=document.querySelector('body > main');
 if(!main)return;
 main.id=main.id||'sb105MainContent';
 main.tabIndex=-1;
 const skip=document.createElement('a');
 skip.className='sb105-skip-link';
 skip.href='#'+main.id;
 skip.textContent='رفتن به محتوای اصلی';
 skip.addEventListener('click',event=>{
  event.preventDefault();
  main.focus({preventScroll:true});
  main.scrollIntoView({block:'start',behavior:'instant'});
 });
 document.body.insertBefore(skip,main);
})();
