'use strict';
/* v94: home module finder; presentation-only, without portfolio reads,
 * market calls, storage, analytics, or changes to financial computations. */
(()=>{
 const home=document.getElementById('sahambanHubV87');
 const grid=document.getElementById('sahambanModulesV87');
 if(!home||!grid)return;
 const cards=Array.from(grid.querySelectorAll('.sahamban-module-v87'));
 if(!cards.length)return;
 const normalize=value=>String(value||'').toLocaleLowerCase('fa')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200d]/g,' ')
  .replace(/\s+/g,' ').trim();
 const aliases={
  'سبد من':'ارزش قیمت صندوق nav موجودی',
  'ورود دارایی‌ها':'کارگزاری فایل اکسل excel csv بارگذاری',
  'ریسک سبد':'ضرر زیان افت تمرکز خطر',
  'تحلیل تکنیکال':'نمودار روند شاخص تاریخچه',
  'اطلاعات بورس':'نماد بازار جستجو شناسه',
  'حجم معامله':'تعداد سهم سرمایه حد ضرر بودجه',
  'هشدار چند نماد':'فهرست پیگیری قیمت آلارم',
  'هشدار قیمت':'حد سود هدف آلارم دستی',
  'کنترل ریسک پیشرفته':'اعتبار داده پوشش تمرکز',
  'تاریخچه بازار':'روند گذشته نمودار سابقه'
 };
 const finder=document.createElement('section');
 finder.className='sb94-finder';
 finder.setAttribute('aria-label','پیدا کردن ابزار سهام‌بان');
 const label=document.createElement('label');
 label.htmlFor='sb94ModuleSearch';
 label.textContent='کدام ابزار را لازم دارید؟';
 const controls=document.createElement('div');controls.className='sb94-finder-controls';
 const input=document.createElement('input');
 input.id='sb94ModuleSearch';input.type='search';input.autocomplete='off';
 input.placeholder='مثلاً NAV، فایل کارگزاری یا حد ضرر';
 input.setAttribute('aria-controls','sahambanModulesV87');
 input.setAttribute('aria-describedby','sb94ModuleSearchStatus');
 const clear=document.createElement('button');clear.type='button';
 clear.className='secondary sb94-clear';clear.textContent='پاک کردن';
 clear.hidden=true;
 const status=document.createElement('p');status.id='sb94ModuleSearchStatus';
 status.className='sb94-finder-status';status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 controls.append(input,clear);finder.append(label,controls,status);
 grid.insertAdjacentElement('beforebegin',finder);
 const haystacks=cards.map(card=>{
  const link=card.querySelector('.sahamban-module-link-v87');
  const name=link?.querySelector('strong')?.textContent||'';
  const description=link?.querySelector('small')?.textContent||'';
  return normalize([name,description,aliases[name]||''].join(' '));
 });
 function filter(){
  const query=normalize(input.value);
  const words=query.split(' ').filter(Boolean);
  let count=0;
  cards.forEach((card,index)=>{
   const match=words.every(word=>haystacks[index].includes(word));
   card.hidden=!match;if(match)count++;
  });
  clear.hidden=!query;
  status.textContent=query?(count?count+' ابزار پیدا شد.':'ابزاری پیدا نشد؛ واژه دیگری امتحان کنید.'):'هر ۱۰ ابزار نمایش داده می‌شوند.';
 }
 input.addEventListener('input',filter);
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&input.value){input.value='';filter();event.preventDefault();}
 });
 clear.addEventListener('click',()=>{input.value='';filter();input.focus();});
 filter();
})();