'use strict';
/* Voluntary on-device diagnosis. Never access holdings storage or export identifiers/prices.
 * A user may copy only fixed categorical statuses after a direct button click.
 */
(()=>{
 const panel=document.getElementById('portfolioDiagnosticV74');
 if(!panel)return;
 const report=document.createElement('pre'),status=document.createElement('p'),copy=document.createElement('button');
 const state={quotes:'not-run',nav:'not-run',dashboard:'not-run'};
 const safeValues=['not-run','verified','incomplete','unavailable','inconsistent'];
 const text=()=>[
  'Sahamban technical status v74',
  'quote_validation='+state.quotes,
  'nav_validation='+state.nav,
  'dashboard_validation='+state.dashboard,
  'scope=categorical-only;no-symbols;no-quantities;no-prices;no-holdings;no-identifiers',
  'note=not-proof-of-live-network-connectivity'
 ].join('\n');
 const render=()=>{report.textContent=text();};
 copy.type='button';copy.textContent='کپی گزارش فنی بدون اطلاعات سبد';
 status.textContent='هیچ گزارشی به‌طور خودکار ارسال یا ذخیره نمی‌شود. کپی فقط با انتخاب شما انجام می‌شود.';
 panel.append(copy,report,status);
 const update=(key,value)=>{if(!safeValues.includes(value))return;state[key]=value;render();};
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',event=>{
  const quotes=event?.detail?.quotes;
  update('quotes','not-run');update('dashboard','not-run');
  if(!Array.isArray(quotes)||!quotes.length||quotes.length>100){update('nav','incomplete');return;}
  const funds=quotes.filter(q=>q?.fundNavChecked===true||q?.assetClass==='fund_etf');
  if(!funds.length){update('nav','unavailable');return;}
  let valid=0;
  for(const q of funds){
   if(q.assetClass==='fund_etf'&&typeof q.fundNav==='number'&&Number.isFinite(q.fundNav)&&q.fundNav>0&&typeof q.price==='number'&&Number.isFinite(q.price)&&q.price>0&&/^\d{8}$/.test(String(q.marketDate??''))&&q.marketDate===q.fundNavDate)valid++;
  }
  update('nav',valid===funds.length?'verified':valid>0?'incomplete':'unavailable');
 });
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',event=>{
  const positions=event?.detail?.positions;
  const valid=Array.isArray(positions)&&positions.length>0&&positions.length<=100&&positions.every(p=>p&&typeof p.symbol==='string'&&p.symbol.trim()&&Number.isSafeInteger(p.quantity)&&p.quantity>0&&Number.isSafeInteger(p.price)&&p.price>0);
  update('quotes',valid?'verified':'incomplete');
  update('dashboard',valid?'verified':'inconsistent');
 });
 copy.addEventListener('click',async()=>{
  try{
   if(!navigator.clipboard||typeof navigator.clipboard.writeText!=='function')throw Error('clipboard');
   await navigator.clipboard.writeText(text());
   status.textContent='گزارش بدون اطلاعات سبد کپی شد. فقط در صورت تمایل آن را ارسال کنید.';
  }catch(_){status.textContent='کپی خودکار ممکن نشد. متن گزارش فنی را می‌توانید انتخاب و دستی کپی کنید.';}
 });
 render();
})();
