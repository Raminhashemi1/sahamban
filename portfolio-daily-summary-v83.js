'use strict';
/* v86: daily read-only summary and in-memory mobile symbol search. Never persists portfolio data or makes requests. */
(()=>{
 const panel=document.getElementById('portfolioDailySummaryV83');
 if(!panel)return;
 const format=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const add=(parent,tag,value)=>{const node=document.createElement(tag);node.textContent=String(value);parent.append(node);return node};
 let quotes=null,positions=null,completed=false,completedAt=null,failed=false;
 function render(){
  panel.replaceChildren();
  add(panel,'strong','نمای روزانه سبد');
  if(failed){add(panel,'p','دریافت قیمت کامل نشد؛ نتیجه قبلی پاک شده است.');return;}
  if(!completed||!positions||!quotes){add(panel,'p','برای نمایش ارزش کل و فهرست قیمت‌ها، دکمه «دریافت قیمت همه نمادها و محاسبه» را بزنید.');return;}
  try{
   if(!Array.isArray(positions)||!Array.isArray(quotes)||positions.length===0||positions.length>100||quotes.length!==positions.length)throw Error('coverage');
   const bySymbol=new Map(),seen=new Set();
   let total=0;
   for(const p of positions){
    const symbol=typeof p?.symbol==='string'?p.symbol.trim():'';
    if(!symbol||bySymbol.has(symbol)||!Number.isSafeInteger(p.quantity)||p.quantity<=0||!Number.isSafeInteger(p.price)||p.price<=0||!/^\d{8}$/.test(String(p.marketDate??'')))throw Error('holdings');
    const value=p.quantity*p.price;
    if(!Number.isSafeInteger(value)||value<=0||!Number.isSafeInteger(total+value))throw Error('overflow');
    bySymbol.set(symbol,{value,price:p.price,marketDate:String(p.marketDate)});
    total+=value;
   }
   for(const q of quotes){
    const symbol=typeof q?.symbol==='string'?q.symbol.trim():'',p=bySymbol.get(symbol);
    if(!p||seen.has(symbol)||!Number.isSafeInteger(q.price)||q.price!==p.price||String(q.marketDate??'')!==p.marketDate)throw Error('quotes');
    seen.add(symbol);
   }
   if(seen.size!==bySymbol.size)throw Error('count');
   add(panel,'p','ارزش کل سبد بر مبنای قیمت‌های دریافت‌شده: '+format(total)+' ریال · تعداد نمادها: '+format(seen.size)+'.');
   add(panel,'p','پایان دریافت موفق: '+(completedAt||'نامشخص')+' (ساعت دستگاه). این ساعت، زمان معامله یا زمان انتشار NAV نیست.');
   const dates=new Set([...bySymbol.values()].map(p=>p.marketDate));
   add(panel,'p',dates.size===1?'تاریخ بازار نمادها: '+[...dates][0]+'؛ قیمت‌ها الزاماً لحظه‌ای نیستند.':'هشدار: تاریخ بازار نمادها متفاوت است؛ هر ردیف باید جداگانه بررسی شود.');
   const jump=document.createElement('a');jump.href='#livePortfolioTable';jump.textContent='رفتن به جدول کامل قیمت‌ها';panel.append(jump);
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='نمایش فهرست سریع '+format(seen.size)+' نماد و قیمت مبنا';details.append(summary);
   const searchLabel=document.createElement('label');searchLabel.textContent='جست‌وجوی نماد در فهرست (فقط همین گوشی)';
   searchLabel.htmlFor='portfolioQuickSearchV84';details.append(searchLabel);
   const search=document.createElement('input');search.id='portfolioQuickSearchV84';search.type='search';
   search.autocomplete='off';search.placeholder='مثلاً عیار یا فولاد';details.append(search);
   const help=document.createElement('p');help.textContent='مرتب‌شده بر اساس ارزش روز هر دارایی، از بیشتر به کمتر. '+format(bySymbol.size)+' نماد نمایش داده می‌شود.';details.append(help);
   const list=document.createElement('ul'),items=[];
   const ordered=[...bySymbol.entries()].sort((a,b)=>b[1].value-a[1].value);
   for(const [symbol,p] of ordered){
    const li=document.createElement('li');li.className='portfolio-mobile-quote-v85';
    const primary=document.createElement('span');primary.className='portfolio-mobile-quote-primary-v85';primary.textContent=symbol+' — '+format(p.price)+' ریال';li.append(primary);
    const secondary=document.createElement('span');secondary.className='portfolio-mobile-quote-secondary-v85';secondary.textContent='ارزش دارایی: '+format(p.value)+' ریال · وزن سبد: '+format(p.value/total*100)+'٪';li.append(secondary);
    const marketDate=document.createElement('span');marketDate.className='portfolio-mobile-quote-date-v85';marketDate.textContent='تاریخ بازار: '+p.marketDate;li.append(marketDate);
    list.append(li);items.push({symbol,li});
   }
   // v86: avoid a nested scrolling list on small screens. Start with five
   // cards; expand on demand or search the complete in-memory symbol set.
   let expanded=false;
   const showMore=document.createElement('button');showMore.type='button';
   showMore.className='portfolio-quote-toggle-v86';
   const updateVisible=()=>{
    const term=String(search.value??'').trim().toLocaleLowerCase('fa-IR');
    const matches=items.filter(row=>row.symbol.toLocaleLowerCase('fa-IR').includes(term));
    let visible=0;
    for(const row of items){
     const rank=matches.indexOf(row);
     const show=rank!==-1&&(term!==''||expanded||rank<5);
     row.li.hidden=!show;
     if(show)visible++;
    }
    help.textContent=matches.length
     ?format(visible)+' نماد از '+format(items.length)+' نماد نمایش داده می‌شود'+(term?' (نتیجه جست‌وجو)':'؛ مرتب‌شده بر اساس ارزش دارایی')+'.'
     :'نمادی با این نام در فهرست فعلی پیدا نشد.';
    showMore.hidden=term!==''||items.length<=5;
    showMore.textContent=expanded?'نمایش فقط ۵ نماد اول':'نمایش همه '+format(items.length)+' نماد';
    showMore.setAttribute('aria-expanded',expanded?'true':'false');
   };
   search.addEventListener('input',updateVisible);
   showMore.addEventListener('click',()=>{expanded=!expanded;updateVisible()});
   details.append(list);details.append(showMore);panel.append(details);
   updateVisible();
   add(panel,'p','مبنای قیمت: آخرین معامله در صورت وجود، وگرنه قیمت پایانی؛ ارزش‌گذاری توصیفی و بدون کارمزد و مالیات.');
  }catch(_){
   panel.replaceChildren();
   add(panel,'strong','نمای روزانه سبد');
   add(panel,'p','تطبیق کامل داده‌ها تأیید نشد؛ ارزش کل یا قیمت‌های ناقص نمایش داده نمی‌شوند.');
  }
 }
 window.addEventListener('sahamban:portfolio-refresh-status-v76',event=>{
  const status=event?.detail?.status;
  if(status==='started'){quotes=null;positions=null;completed=false;completedAt=null;failed=false;}
  if(status==='failed'){quotes=null;positions=null;completed=false;completedAt=null;failed=true;}
  if(status==='completed'&&!failed&&quotes&&positions){completed=true;completedAt=new Date().toLocaleString('fa-IR');}
  render();
 });
 window.addEventListener('sahamban:verified-fund-nav-premium-v63',event=>{if(failed)return;quotes=event?.detail?.quotes??null;positions=null;completed=false;completedAt=null;render()});
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',event=>{if(failed)return;positions=event?.detail?.positions??null;render()});
 render();
})();
