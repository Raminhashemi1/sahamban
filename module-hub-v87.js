'use strict';
/* v87: privacy-preserving module hub and task-first, beginner-friendly guides.
 * Pure navigation: no holdings reads, network calls, or browser storage.
 */
(()=>{
 const home=document.getElementById('sahambanHubV87');
 if(!home)return;
 const host=document.querySelector('main');
 if(!host)return;
 const specs=[
  {id:'livePortfolioSection',icon:'▦',name:'سبد من',desc:'ارزش روز، NAV و تمرکز',guide:['اگر فایل سبدتان قبلاً وارد شده است، دکمه دریافت قیمت همه نمادها را بزنید.','در نمای روزانه، ارزش کل و تاریخ بازار را بررسی کنید.','برای صندوق‌ها، NAV را با قیمت بازار و تاریخ مقایسه کنید؛ ارقام الزاماً لحظه‌ای نیستند.']},
  {id:'brokerImportSection',icon:'⇧',name:'ورود دارایی‌ها',desc:'فایل کارگزاری و بررسی',guide:['فایل خروجی کارگزاری را انتخاب کنید.','نماد، تعداد و بهای خرید را پیش از تأیید کنترل کنید.','فقط پس از بررسی، گزینه اعمال اطلاعات را بزنید. اطلاعات حساس را بارگذاری نکنید.']},
  {id:'portfolioSection',icon:'◫',name:'ریسک سبد',desc:'سود و زیان و آزمون تنش',guide:['ابتدا فایل سبد را بررسی یا وارد کنید.','قیمت‌ها را در بخش «سبد من» دریافت و تأیید کنید.','تمرکز، سود و زیان و افت فرضی را بخوانید؛ این‌ها توصیه معامله نیستند.']},
  {id:'technicalAnalysisV50',icon:'⌁',name:'تحلیل تکنیکال',desc:'روند و شاخص‌های تاریخی',guide:['ابتدا در «سبد من» قیمت‌های جاری نمادها را دریافت کنید.','دکمه «دریافت تاریخچه تأییدشده» را اجرا کنید.','نماد را انتخاب کنید و شاخص‌ها را بخوانید؛ داده ناکافی به معنی نبود تحلیل است.']},
  {id:'marketSection',icon:'◉',name:'اطلاعات بورس',desc:'جست‌وجو و تاریخچه نماد',guide:['نام نماد را جست‌وجو کنید.','شناسه ابزار درست را از نتایج انتخاب کنید.','تاریخ پاسخ را ببینید؛ اتصال به TSETMC ممکن است در برخی شبکه‌ها قطع باشد.']},
  {id:'positionSizeSectionV87',icon:'◈',name:'حجم معامله',desc:'بودجه، حد ضرر و تعداد',guide:['سرمایه و درصد ریسک مجاز را وارد کنید.','قیمت ورود، حد ضرر و سقف بودجه را مشخص کنید.','دکمه محاسبه را بزنید؛ کارمزد و لغزش قیمت در نتیجه لحاظ نشده‌اند.']},
  {id:'watchlistSection',icon:'◎',name:'هشدار چند نماد',desc:'پایش دستی چند سهم',guide:['نمادها و محدوده قیمت موردنظر را اضافه کنید.','داده‌های واردشده و تنظیمات هشدار را بررسی کنید.','هشدار فقط مطابق امکانات فعلی صفحه کار می‌کند؛ پایش خودکار دائمی نیست.']},
  {id:'manualAlertsSectionV87',icon:'♧',name:'هشدار قیمت',desc:'حد ضرر و هدف دستی',guide:['نماد، قیمت بررسی‌شده، حد ضرر و حد سود را وارد کنید.','«بررسی قیمت و اعلام هشدار» را بزنید.','تنظیمات صوت را در صورت نیاز آزمایش کنید؛ اعلان خودکار پس‌زمینه فعال نیست.']},
  {id:'professionalRiskV49',icon:'◇',name:'کنترل ریسک پیشرفته',desc:'شاخص‌ها و اعتبار داده',guide:['ابتدا اطلاعات سبد را وارد کنید و قیمت‌ها را دریافت کنید.','وضعیت اعتبار و پوشش داده‌ها را بررسی کنید.','هشدارهای بازده غیرعادی و تمرکز را با احتیاط تفسیر کنید.']},
  {id:'historicalSectionV87',icon:'◷',name:'تاریخچه بازار',desc:'مقایسه روند قیمت',guide:['ابتدا شناسه درست نماد را انتخاب کنید.','تاریخچه رسمی در صورت دسترسی شبکه دریافت می‌شود.','مقایسه تاریخی فقط با داده کافی و معتبر انجام می‌شود.']}
 ];
 const sections=[...host.querySelectorAll(':scope > section.card')];
 const calc=document.getElementById('calculate')?.closest('section');
 const manual=document.getElementById('check')?.closest('section');
 const historical=sections.find(s=>s.querySelector('h2')?.textContent?.trim()==='تحلیل تاریخچه قیمت');
 if(calc&&!calc.id)calc.id='positionSizeSectionV87';
 if(manual&&!manual.id)manual.id='manualAlertsSectionV87';
 if(historical&&!historical.id)historical.id='historicalSectionV87';
 const guides=document.getElementById('sahambanGuideV87');
 const guideTitle=document.getElementById('sahambanGuideTitleV87');
 const guideSteps=document.getElementById('sahambanGuideStepsV87');
 const guideOpen=document.getElementById('sahambanGuideOpenV87');
 const grid=document.getElementById('sahambanModulesV87');
 const homeControl=document.getElementById('sahambanHomeControlV87');
 const title=document.getElementById('sahambanActiveTitleV87');
 const inactive=sections.filter(s=>!specs.some(x=>x.id===s.id));
 for(const section of inactive)section.hidden=true;
 const linkById=new Map();
 function showGuide(spec){
  guideTitle.textContent='راهنمای شروع: '+spec.name;
  guideSteps.replaceChildren();
  for(const line of spec.guide){const li=document.createElement('li');li.textContent=line;guideSteps.append(li);}
  guideOpen.href='#'+spec.id;
  guideOpen.textContent='ورود به '+spec.name;
  guides.hidden=false;guides.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 for(const spec of specs){
  const card=document.createElement('div');card.className='sahamban-module-v87';
  const link=document.createElement('a');link.href='#'+spec.id;link.className='sahamban-module-link-v87';
  const ico=document.createElement('span');ico.className='sahamban-module-icon-v87';ico.setAttribute('aria-hidden','true');ico.textContent=spec.icon;
  const heading=document.createElement('strong');heading.textContent=spec.name;
  const small=document.createElement('small');small.textContent=spec.desc;
  link.append(ico,heading,small);
  const help=document.createElement('button');help.type='button';help.className='sahamban-module-help-v87';
  help.textContent='؟ آموزش';help.setAttribute('aria-label','آموزش '+spec.name);
  help.addEventListener('click',()=>showGuide(spec));
  card.append(link,help);grid.append(card);linkById.set(spec.id,spec);
 }
 function activate(){
  const hash=decodeURIComponent(location.hash.slice(1));
  let target=document.getElementById(hash);
  let chosen=target?.closest?.('section.card')||null;
  if(chosen&&!linkById.has(chosen.id))chosen=null;
  const spec=chosen?linkById.get(chosen.id):null;
  home.hidden=!!spec;guides.hidden=true;
  for(const section of sections)section.hidden=section!==chosen;
  homeControl.hidden=!spec;title.textContent=spec?'ماژول: '+spec.name:'';
  if(spec){requestAnimationFrame(()=>{if(target&&target!==chosen)target.scrollIntoView({block:'start'});else chosen.scrollIntoView({block:'start'});});}
  else if(!hash||hash==='home')requestAnimationFrame(()=>home.scrollIntoView({block:'start'}));
 }
 window.addEventListener('hashchange',activate);
 homeControl.addEventListener('click',()=>{location.hash='home';});
 // For existing deep links into sub-panels, show parent section if it exists.
 activate();
})();
