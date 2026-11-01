'use strict';
/* v100: task-first navigation and wayfinding only.
 * No portfolio data, financial calculation, storage, or network access.
 */
(()=>{
 const home=document.getElementById('sahambanHubV87');
 const modules=document.getElementById('sahambanModulesV87');
 const finder=home?.querySelector('.sb94-finder');
 if(!home||!modules||!finder)return;
 const section=document.createElement('nav');
 section.className='sb100-path';
 section.setAttribute('aria-label','مسیر سه‌مرحله‌ای برای شروع');
 const heading=document.createElement('h3');
 heading.textContent='از کجا شروع کنم؟';
 const description=document.createElement('p');
 description.textContent='برای دیدن نتیجه، این سه مرحله را به ترتیب انجام دهید. هر مرحله ابزار خودش را باز می‌کند.';
 const list=document.createElement('ol');
 const steps=[
  {id:'brokerImportSection',title:'۱. ورود دارایی‌ها',detail:'فایل کارگزاری را بررسی و تأیید کنید'},
  {id:'livePortfolioSection',title:'۲. مشاهده سبد',detail:'قیمت‌ها و تاریخ داده را بررسی کنید'},
  {id:'portfolioSection',title:'۳. بررسی ریسک',detail:'خروجی‌ها را به‌عنوان سناریو بخوانید'}
 ];
 for(const step of steps){
  if(!document.getElementById(step.id))continue;
  const item=document.createElement('li');
  const link=document.createElement('a');
  link.href='#'+step.id;
  const title=document.createElement('strong');title.textContent=step.title;
  const detail=document.createElement('span');detail.textContent=step.detail;
  link.append(title,detail);item.append(link);list.append(item);
 }
 if(!list.children.length)return;
 section.append(heading,description,list);
 finder.insertAdjacentElement('beforebegin',section);
 const v98= document.querySelector('#livePortfolioTable .sb98-view-controls');
 const v99= document.querySelector('#livePortfolioTable .sb99-controls');
 // Both controls remain functional. The card/table switch is the outer mode;
 // simple/full columns are applicable only while the original table is shown.
 if(v98&&v99){
  const root=document.getElementById('livePortfolioTable');
  const update=()=>{v98.hidden=root.classList.contains('sb99-card-mode');};
  v99.addEventListener('click',update);
  update();
 }
})();
