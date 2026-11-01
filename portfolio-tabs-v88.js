'use strict';
/* v88 presentation-only dashboard for the live portfolio module.
 * Moves existing live DOM elements; no data fetch, portfolio writes, or calculations.
 */
(()=>{
 const root=document.getElementById('livePortfolioSection');
 if(!root||!document.getElementById('livePortfolioRefresh'))return;
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
 const header=root.querySelector(':scope > .row');
 const lead=make('div','sb88-intro');
 lead.append(make('h3','', 'سبد من، در یک نگاه'),make('p','','ابتدا قیمت‌ها را دریافت کنید؛ سپس خلاصه و جزئیات را به انتخاب خود ببینید.'));
 if(header)header.after(lead);else root.prepend(lead);
 const tabs=make('div','sb88-tabs');
 tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','بخش‌های سبد من');
 const panels=make('div','sb88-panels');
 const definitions=[
  ['overview','نمای کلی','ارزش کل، NAV و تمرکز'],
  ['prices','دارایی‌ها و قیمت‌ها','جدول کامل و جزئیات'],
  ['help','راهنمای ساده','آموزش و معنی ارقام']
 ];
 const nodes={};
 for(const [key,label,subtitle] of definitions){
  const btn=make('button','sb88-tab',label);
  btn.type='button';btn.id='sb88-tab-'+key;btn.setAttribute('role','tab');
  btn.setAttribute('aria-controls','sb88-panel-'+key);
  const panel=make('div','sb88-panel');panel.id='sb88-panel-'+key;
  panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',btn.id);
  const head=make('h3','sb88-panel-heading',subtitle);panel.append(head);
  tabs.append(btn);panels.append(panel);nodes[key]={btn,panel};
 }
 lead.after(tabs,panels);
 const overview=nodes.overview.panel,prices=nodes.prices.panel,help=nodes.help.panel;
 function move(id,dest){const el=document.getElementById(id);if(el&&el.parentElement===root)dest.append(el);else if(el&&id==='livePortfolioTable')dest.append(el);return el;}
 const buttonRow=document.getElementById('livePortfolioRefresh')?.closest('.row');
 if(buttonRow&&buttonRow.parentElement===root)overview.append(buttonRow);
 // Original live nodes remain intact; modules still receive the same events and element IDs.
 move('portfolioDailySummaryV83',overview);
 move('portfolioQuickOverviewV82',overview);
 move('livePortfolioStatus',overview);
 const sourceTitle=make('h3','sb88-panel-heading','منبع و کیفیت قیمت‌ها');
 prices.append(sourceTitle);
 move('livePortfolioTable',prices);
 move('livePortfolioNetworkStatus',prices);
 const guide=make('ol','sb88-steps');
 for(const line of [
  'اگر سبد وارد شده است، در «نمای کلی» دکمه «دریافت قیمت همه نمادها و محاسبه» را بزنید.',
  'اگر دریافت موفق بود، ارزش کل و تاریخ بازار را در نمای کلی بررسی کنید؛ این قیمت‌ها الزاماً لحظه‌ای نیستند.',
  'برای مشاهده تعداد سهم، بهای خرید، سود و زیان و منبع قیمت، به تب «دارایی‌ها و قیمت‌ها» بروید.'
 ]){const li=make('li','',line);guide.append(li);}
 help.append(guide);
 const glossary=make('div','sb88-glossary');
 for(const [term,definition] of [
  ['ارزش روز','تعداد دارایی ضرب‌در قیمت معتبر دریافت‌شده.'],
  ['NAV صندوق','ارزش خالص دارایی هر واحد صندوق؛ زمان انتشار آن ممکن است با قیمت بازار یکسان نباشد.'],
  ['وزن سبد','سهم ارزش هر دارایی از مجموع ارزش سبد؛ تمرکز بالا الزاماً دستور فروش نیست.'],
  ['نامشخص','یعنی داده کافی یا معتبر دریافت نشده است؛ به معنی صفر نیست.']
 ]){const item=make('p');const strong=make('strong','',term+' — ');item.append(strong,document.createTextNode(definition));glossary.append(item);}
 help.append(glossary);
 const risk=make('a','sb88-related','رفتن به ماژول مستقل مدیریت ریسک');
 risk.href='#portfolioSection';help.append(risk);
 // Move only existing explanatory paragraphs to help; preserve all existing controls.
 for(const p of [...root.children]){
  if(p.tagName==='P'&&!p.id)help.append(p);
 }
 let current='overview';
 const activate=(key,focus=false)=>{
  if(!nodes[key])key='overview';
  current=key;
  for(const [name,{btn,panel}] of Object.entries(nodes)){
   const selected=name===key;
   btn.setAttribute('aria-selected',String(selected));
   btn.tabIndex=selected?0:-1;panel.hidden=!selected;
  }
  if(focus)nodes[key].btn.focus();
 };
 for(const [key,{btn}] of Object.entries(nodes)){
  btn.addEventListener('click',()=>activate(key));
  btn.addEventListener('keydown',e=>{
   if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
   e.preventDefault();const keys=definitions.map(d=>d[0]),direction=e.key==='ArrowLeft'?1:-1;
   activate(keys[(keys.indexOf(current)+direction+keys.length)%keys.length],true);
  });
 }
 window.addEventListener('hashchange',()=>{
  const hash=decodeURIComponent(location.hash.slice(1));
  if(hash==='livePortfolioTable'||hash==='livePortfolioRows'||hash==='livePortfolioSummary')activate('prices');
  else if(hash==='livePortfolioSection')activate('overview');
 });
 activate(location.hash==='#livePortfolioTable'?'prices':'overview');
})();
