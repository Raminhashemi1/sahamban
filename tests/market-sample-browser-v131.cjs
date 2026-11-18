'use strict';
/* Browser-only synthetic market top feed; never touches a real user profile. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
async function main(){
 const root=process.cwd(),server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)||'index.html'),file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,body)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html;charset=utf-8'}).end(body));
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({serviceWorkers:'block',locale:'fa-IR',viewport:{width:390,height:780}});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const end=new Date(Date.UTC(+p.year,+p.month-1,+p.day));
  const history=Array.from({length:250},(_,i)=>{const d=new Date(end);d.setUTCDate(d.getUTCDate()-(249-i));return {dEven:Number(d.toISOString().slice(0,10).replaceAll('-','')),pClosing:1000+3*i+Math.sin(i*1.7)*12,qTotCap:1000000000+i*10000};});
  const top={tradeTop:Array.from({length:19},(_,i)=>({instrument:{lVal18AFC:'آزمایشی'+i,insCode:String(300000000000+i)}}))};
  await page.route('https://cdn.tsetmc.com/api/**',async route=>{const url=route.request().url();requests.push(url);const data=url.includes('GetTradeTop')?top:{closingPriceDaily:history};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
  const storage='{"version":2,"holdings":[{"symbol":"خصوصی","quantity":2,"buy":200,"current":300}]}';
  await page.evaluate(x=>localStorage.setItem('sahamban-broker-holdings-v1',x),storage);
  await page.locator('#sahambanModulesV87 a[href="#externalScreenerV130"]').click();
  await page.waitForFunction(()=>document.getElementById('externalScreenerV130')?.hidden===false);
  await page.locator('#marketSampleRunV131').click();
  await page.waitForFunction(()=>document.querySelectorAll('#marketSampleResultsV131 details').length===7,{timeout:30000});
  assert.equal(requests.length,7);
  assert.equal(await page.locator('#marketQualifiedRankV133 li').count(),0,'Unattested price basis must suppress all entry ranks');
  assert.match(await page.locator('#marketSampleResultsV131').innerText(),/تأیید مستقل مبنای تعدیل تاریخچه الزامی‌اند/);
  assert.equal(requests.filter(x=>x.includes('GetTradeTop')).length,1);
  assert.match(await page.locator('#marketSampleResultsV131').innerText(),/نمونه بررسی‌شده/);
  const firstCandidate=page.locator('#marketSampleResultsV131 details').nth(1);
  await firstCandidate.locator('summary').click();
  assert.match(await firstCandidate.innerText(),/آزمون گذشته قابل محاسبه نیست/);
  assert.match(await firstCandidate.innerText(),/بررسی زمانی مجزا قابل محاسبه نیست/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),storage);
  // All per-symbol histories fail: the UI must show an explicit empty state, never ranks.
  await page.unroute('https://cdn.tsetmc.com/api/**');
  await page.route('https://cdn.tsetmc.com/api/**',async route=>{
   const url=route.request().url();
   const data=url.includes('GetTradeTop')?top:{closingPriceDaily:[]};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.locator('#marketSampleRunV131').click();
  await page.waitForFunction(()=>document.getElementById('marketNoRankV133')?.isConnected===true);
  assert.equal(await page.locator('#marketQualifiedRankV133 li').count(),0);
  assert.match(await page.locator('#marketSampleResultsV131').innerText(),/کمتر از ۶۰ قیمت پایانی معتبر/);
  assert.match(await page.locator('#marketSampleStatusV131').innerText(),/۰ نماد با داده قابل قبول/);
  // A top-list network failure must surface an error and leave holdings untouched.
  await page.unroute('https://cdn.tsetmc.com/api/**');
  await page.route('https://cdn.tsetmc.com/api/**',route=>route.abort());
  await page.locator('#marketSampleRunV131').click();
  await page.waitForFunction(()=>document.getElementById('marketSampleStatusV131')?.innerText.includes('دریافت فهرست یا تاریخچه ممکن نشد'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),storage);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS v131 synthetic top list: six candidates, seven public requests and unchanged holdings');
 }finally{await browser?.close();await new Promise(ok=>server.close(ok));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
