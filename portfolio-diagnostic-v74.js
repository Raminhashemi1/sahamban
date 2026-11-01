'use strict';
/* Opt-in categorical diagnostics. No holdings storage, network or identifier export.
 * "dashboard verified" requires the same symbol/price/date snapshot for both events.
 */
(()=>{
 const panel=document.getElementById('portfolioDiagnosticV74');
 if(!panel)return;
 const report=document.createElement('pre'),status=document.createElement('p'),copy=document.createElement('button');
 const state={probe:'not-run',refresh:'not-run',quotes:'not-run',nav:'not-run',navProbe:'not-run',dashboard:'not-run'};
 let navQuotes=null,positions=null;
 const text=()=>[
  'Sahamban technical status v77',
  'public_network_probe='+state.probe,
  'market_refresh='+state.refresh,
  'quote_validation='+state.quotes,
  'nav_validation='+state.nav,
  'etf_probe='+state.navProbe,
  'dashboard_validation='+state.dashboard,
  'scope=categorical-only;no-symbols;no-quantities;no-prices;no-holdings;no-identifiers',
  'note=public-probe-is-not-proof-of-portfolio-refresh-or-etf-nav'
 ].join('\n');
 const render=()=>{report.textContent=text();};
 const validList=xs=>Array.isArray(xs)&&xs.length>0&&xs.length<=100;
 const validPos=p=>p&&typeof p.symbol==='string'&&p.symbol.trim()&&Number.isSafeInteger(p.quantity)&&p.quantity>0&&Number.isSafeInteger(p.price)&&p.price>0&&Number.isSafeInteger(p.quantity*p.price);
 function validPositions(xs){
  if(!validList(xs)||!xs.every(validPos))return false;
  const symbols=new Set(xs.map(x=>x.symbol.trim()));
  return symbols.size===xs.length;
 }
 function assessDashboard(){
  if(!positions){state.dashboard='not-run';return;}
  if(!validPositions(positions)){state.dashboard='inconsistent';return;}
  if(!navQuotes){state.dashboard='not-run';return;}
  if(!validList(navQuotes)||navQuotes.length!==positions.length){state.dashboard='inconsistent';return;}
  const bySymbol=new Map(positions.map(p=>[p.symbol.trim(),p]));
  const seen=new Set();
  for(const q of navQuotes){
   const symbol=typeof q?.symbol==='string'?q.symbol.trim():'';
   const p=bySymbol.get(symbol);
   if(!symbol||seen.has(symbol)||!p||typeof q.price!=='number'||q.price!==p.price||String(q.marketDate??'')!==String(p.marketDate??'')){state.dashboard='inconsistent';return;}
   seen.add(symbol);
  }
  state.dashboard='verified';
 }
 function assessNav(quotes){
  if(!validList(quotes)){state.nav='incomplete';return;}
  const funds=quotes.filter(q=>q?.fundNavChecked===true||q?.assetClass==='fund_etf');
  if(!funds.length){state.nav='unavailable';return;}
  let verified=0;
  for(const q of funds){
   if(q.assetClass==='fund_etf'&&typeof q.fundNav==='number'&&Number.isFinite(q.fundNav)&&q.fundNav>0&&typeof q.price==='number'&&Number.isFinite(q.price)&&q.price>0&&/^\d{8}$/.test(String(q.marketDate??''))&&q.marketDate===q.fundNavDate)verified++;
  }
  state.nav=verified===funds.length?'verified':verified>0?'incomplete':'unavailable';
 }
 copy.type='button';copy.textContent='کپی گزارش فنی بدون اطلاعات سبد';
 status.textContent='گزارش فقط وضعیت‌های کلی را نشان می‌دهد. کپی و ارسال کاملاً اختیاری است؛ هیچ داده‌ای خودکار ارسال یا ذخیره نمی‌شود.';
 panel.append(copy,report,status);
 window.addEventListener('sahamban:public-network-probe-v77',event=>{
  const status=event?.detail?.status;
  if(status==='started')state.probe='in-progress';
  else if(status==='verified'&&state.probe==='in-progress')state.probe='verified';
  else if(status==='failed'&&state.probe==='in-progress')state.probe='failed';
  render();
 });
 window.addEventListener('sahamban:portfolio-refresh-status-v76',event=>{
  const stage=event?.detail?.status;
  const reason=event?.detail?.reason;
  if(stage==='started'){
   navQuotes=null;positions=null;
   state.refresh='in-progress';state.quotes='not-run';state.nav='not-run';state.navProbe='not-run';state.dashboard='not-run';
  }else if(stage==='failed'&&(reason==='partial'||reason==='exception')){
   navQuotes=null;positions=null;
   state.refresh='failed';state.quotes='incomplete';state.nav='not-run';state.navProbe='not-run';state.dashboard='not-run';
  }else if(stage==='completed'&&state.refresh==='in-progress'&&state.dashboard==='verified'){
   state.refresh='completed';
  }
  render();
 });
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',event=>{
  navQuotes=event?.detail?.quotes??null;
  positions=null;
  state.quotes='not-run';
  assessNav(navQuotes);
  // Export only a coarse categorical status, never individual positions or prices.
  const checked=Array.isArray(navQuotes)?navQuotes.filter(q=>q?.fundNavChecked===true):[];
  const outcomes=new Set(['nav-verified','etf-verified-nav-missing','nav-date-invalid','identity-mismatch','request-failed']);
  if(!checked.length)state.navProbe='not-run';
  else if(checked.some(q=>!outcomes.has(q?.fundNavProbeStatus)))state.navProbe='incomplete';
  else if(checked.every(q=>q.fundNavProbeStatus==='nav-verified'))state.navProbe='verified';
  else if(checked.some(q=>q.fundNavProbeStatus==='nav-verified'))state.navProbe='mixed';
  else if(checked.every(q=>q.fundNavProbeStatus==='request-failed'))state.navProbe='request-failed';
  else if(checked.every(q=>q.fundNavProbeStatus==='identity-mismatch'))state.navProbe='identity-mismatch';
  else state.navProbe='unavailable';
  assessDashboard();
  render();
 });
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',event=>{
  positions=event?.detail?.positions??null;
  state.quotes=validPositions(positions)?'verified':'incomplete';
  assessDashboard();
  render();
 });
 copy.addEventListener('click',async()=>{
  try{
   if(!navigator.clipboard||typeof navigator.clipboard.writeText!=='function')throw Error('clipboard');
   await navigator.clipboard.writeText(text());
   status.textContent='گزارش فنی کپی شد. تنها در صورت تمایل آن را ارسال کنید.';
  }catch(_){status.textContent='کپی خودکار ممکن نشد؛ متن گزارش را می‌توانید دستی انتخاب و کپی کنید.';}
 });
 render();
})();
