'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
const src=fs.readFileSync('portfolio-pilot-v48.js','utf8');
const html=fs.readFileSync('portfolio-pilot.html','utf8');
assert.doesNotMatch(src,/localStorage\.setItem\s*\(/);
assert.doesNotMatch(src,/localStorage\.removeItem\s*\(/);
assert.doesNotMatch(src,/localStorage\.clear\s*\(/);
assert.match(src,/const HOLDINGS_KEY='sahamban-broker-holdings-v1'/);
assert.doesNotMatch(html,/<script[^>]*persian-ui/);
assert.match(html,/در حافظه گوشی ذخیره، پاک یا جایگزین نمی‌کند/);
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
  await page.getByText('۱۹ نماد',{exact:false}).waitFor({timeout:10000});
  assert.match(await page.locator('#livePortfolioStatus').innerText(),/۱۹ نماد/);
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
  console.log('PASS: 19-holding pilot offline valuation, live mocked valuation, mismatch guard, concurrent holdings change, no pilot writes');
 }finally{
  await browser.close();await new Promise(r=>server.close(r));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
