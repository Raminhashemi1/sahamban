'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
const src=fs.readFileSync('portfolio-pilot-v48.js','utf8');
const html=fs.readFileSync('portfolio-pilot.html','utf8');
assert.doesNotMatch(src,/localStorage\.setItem\s*\((?!MAPPINGS_KEY\s*,)/);
assert.doesNotMatch(src,/localStorage\.removeItem\s*\(/);
assert.doesNotMatch(src,/localStorage\.clear\s*\(/);
assert.match(src,/localStorage\.setItem\(MAPPINGS_KEY/);
assert.match(src,/شناسه ذخیره‌شده نامعتبر/);
assert.match(src,/const MAPPINGS_KEY='sahamban-instrument-mappings-v1'/);
assert.match(src,/const HOLDINGS_KEY='sahamban-broker-holdings-v1'/);
assert.doesNotMatch(html,/<script[^>]*persian-ui/);
assert.match(html,/تعداد، میانگین خرید و سایر اطلاعات سبد هرگز تغییر نمی‌کنند/);
const server=http.createServer((req,res)=>{
 const file=new URL(req.url,'http://localhost').pathname.split('/').at(-1);
 if(!['portfolio-pilot.html','portfolio-pilot-v48.js'].includes(file)){res.writeHead(404);res.end();return;}
 const content=fs.readFileSync(file);
 res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':'text/html'});
 res.end(content);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 try{
  const holdings=Array.from({length:19},(_,i)=>({symbol:'سهم'+(i+1),quantity:i+1,buy:1000+i,current:1200+i}));
  const saved=JSON.stringify({version:2,created:new Date().toISOString(),holdings});
  await page.addInitScript(v=>localStorage.setItem('sahamban-broker-holdings-v1',v),saved);
  await page.goto('http://127.0.0.1:'+server.address().port+'/portfolio-pilot.html');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),saved);
  await page.locator('#livePortfolioImported').click();
  const summary=await page.locator('#livePortfolioSummary').innerText();
  assert.match(summary,/ارزش بر اساس قیمت فایل/);
  assert.match(await page.locator('#livePortfolioMeta').innerText(),/قیمت روز یا به‌روزرسانی خودکار نیست/);
  assert.equal(await page.locator('#livePortfolioRows tr').count(),19);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),saved);
  assert.equal(await page.evaluate(()=>localStorage.length),1);
  const date=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const parts=Object.fromEntries(date.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const today=Number(parts.year+parts.month+parts.day);
  let broken=false,changed=false;
  await page.route('https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/**',async route=>{
   const symbol=decodeURIComponent(route.request().url().split('/').at(-1));
   const i=Number(symbol.replace('سهم',''));
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({instrumentSearch:i>=1&&i<=19?[{insCode:String(20000000000+i),lVal18AFC:symbol}]:[]})});
  });
  await page.route('https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceInfo/**',async route=>{
   const i=Number(route.request().url().split('/').at(-1))-20000000000;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({closingPriceInfo:{pClosing:2000+i,dEven:today}})});
  });
  await page.route('https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/**',async route=>{
   const i=Number(route.request().url().split('/').at(-2))-20000000000;
   if(changed&&i===1)await page.evaluate(()=>{
    const h=JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1'));
    h.holdings[0].quantity++;
    localStorage.setItem('sahamban-broker-holdings-v1',JSON.stringify(h));
   });
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({closingPriceDaily:[{pClosing:broken&&i===1?9999:2000+i,dEven:today}]})});
  });
  await page.locator('#livePortfolioRefresh').click();
  await page.getByText('دریافت و اعتبارسنجی قیمت پایانی همه ۱۹ نماد موفق بود',{exact:false}).waitFor({timeout:40000});
  assert.match(await page.locator('#livePortfolioSummary').innerText(),/ارزش طبق قیمت پایانی بازار/);
  assert.match(await page.locator('#livePortfolioStatus').innerText(),/هیچ داده‌ای در حافظه مرورگر ذخیره یا تغییر نکرد/);
  assert.equal(await page.locator('#livePortfolioRows tr').count(),19);
  assert.equal(await page.evaluate(()=>localStorage.length),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),saved);
  broken=true;
  await page.locator('#livePortfolioRefresh').click();
  await page.getByText('به‌روزرسانی کامل نشد',{exact:false}).waitFor({timeout:40000});
  assert.equal(await page.locator('#livePortfolioTable').isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),saved);
  broken=false;changed=true;
  await page.locator('#livePortfolioRefresh').click();
  await page.getByText('دارایی‌ها هنگام دریافت قیمت تغییر کرده‌اند',{exact:false}).waitFor({timeout:40000});
  assert.equal(await page.locator('#livePortfolioTable').isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.length),1);
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1')))).holdings[0].quantity,2);

  // Stale saved mappings are cleared only after fresh validation. A unique valid
  // alternative is accepted; multiple valid alternatives remain explicitly ambiguous.
  const holdingsBeforeHistory=await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1'));
  await page.evaluate(()=>localStorage.setItem('sahamban-instrument-mappings-v1',JSON.stringify({'سهم1':'99999999991','سهم2':'99999999992','سهم4':'30000000008'})));
  await page.route('https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/**',async route=>{
   const symbol=decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1));
   const i=Number(symbol.replace('سهم',''));
   const candidates=i===1
    ?[{insCode:'30000000001',lVal18AFC:symbol},{insCode:'30000000002',lVal18AFC:symbol}]
    :i===2
     ?[{insCode:'30000000003',lVal18AFC:symbol},{insCode:'30000000004',lVal18AFC:symbol}]
     :i===3
      ?[{insCode:'30000000005',lVal18AFC:symbol},{insCode:'30000000006',lVal18AFC:symbol}]
      :i===4
       ?[{insCode:'30000000007',lVal18AFC:symbol},{insCode:'30000000008',lVal18AFC:symbol}]
      :[{insCode:String(30000000000+i+10),lVal18AFC:symbol}];
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({instrumentSearch:candidates})});
  });
  await page.route('https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/**',async route=>{
   const insCode=new URL(route.request().url()).pathname.split('/').at(-1);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({instrumentInfo:{insCode,cIsin:'TEST'+insCode,instrumentID:'TEST'+insCode,flow:1}})});
  });
  await page.route('https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/**',async route=>{
   const insCode=new URL(route.request().url()).pathname.split('/').at(-2);
   const count=insCode==='30000000002'?3:15;
   const tehran=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
   const today=Date.UTC(tehran.year,tehran.month-1,tehran.day);
   const recentOffset=insCode==='30000000004'?3:0;
   const recentCandidate=['30000000003','30000000004','30000000005','30000000006'].includes(insCode);
   const rows=Array.from({length:count},(_,j)=>{
    const d=recentCandidate
     ?new Date(today-(14-j+recentOffset)*86400000)
     :new Date(Date.UTC(2025,0,1+j));
    return {dEven:d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate(),pClosing:1000+j};
   });
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({closingPriceDaily:rows})});
  });
  await page.evaluate(()=>{window.__verifiedHistoryQuotes=[];window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{window.__verifiedHistoryQuotes=event.detail.quotes;});});
  await page.locator('#technicalHistoryAllV50').click();
  await page.getByText('تاریخچه معتبر برای ۱۸ از ۱۹ نماد دریافت شد',{exact:false}).waitFor({timeout:40000});
  const mappings=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-instrument-mappings-v1')||'{}'));
  assert.deepEqual(mappings,{'سهم4':'30000000008'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),holdingsBeforeHistory);
  const selected=await page.evaluate(()=>window.__verifiedHistoryQuotes?.find(x=>x.symbol==='سهم2'));
  assert.equal(selected?.resolution,'unique-freshest-recent-history');
  assert.match(selected?.resolutionNote||'',/30000000003/);
  const savedSelected=await page.evaluate(()=>window.__verifiedHistoryQuotes?.find(x=>x.symbol==='سهم4'));
  assert.equal(savedSelected?.insCode,'30000000008');
  assert.match(await page.locator('#livePortfolioStatus').innerText(),/چند شناسه برای سهم3/);
  assert.equal(await page.locator('#instrumentMappingPanel').isVisible(),true);
  assert.equal(await page.locator('#instrumentMappingPanel select option').count(),3); // placeholder + 2 tied candidates
  // Network failures must not erase a previously saved instrument identity.
  await page.evaluate(()=>localStorage.setItem('sahamban-instrument-mappings-v1',JSON.stringify({'سهم5':'30000000015'})));
  await page.route('https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/**',async route=>{
   const code=new URL(route.request().url()).pathname.split('/').at(-2);
   if(code==='30000000015')await route.fulfill({status:503,contentType:'application/json',body:'{}'});
   else await route.continue();
  });
  await page.locator('#technicalHistoryAllV50').click();
  await page.getByText('تاریخچه معتبر برای ۱۷ از ۱۹ نماد دریافت شد',{exact:false}).waitFor({timeout:40000});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-instrument-mappings-v1'))['سهم5']),'30000000015');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),holdingsBeforeHistory);
  console.log('PASS: stale mapping auto-clear, freshest unique recent history auto-resolution, tied candidates remain ambiguous, holdings untouched');
 }finally{
  await browser.close();await new Promise(r=>server.close(r));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
