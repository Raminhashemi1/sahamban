'use strict';
/* v130 synthetic Chromium acceptance. Never opens a real user profile or reaches TSETMC. */
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
async function main(){
 const root=process.cwd(),server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)||'index.html'),file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,body)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html;charset=utf-8'}).end(body));
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({serviceWorkers:'block',locale:'fa-IR',viewport:{width:390,height:780}});
  const page=await context.newPage(),errors=[],calls=[];
  page.on('pageerror',e=>errors.push(e.message));
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const now=new Date(Date.UTC(+p.year,+p.month-1,+p.day));
  const hist=Array.from({length:100},(_,i)=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()-(99-i));return {dEven:Number(d.toISOString().slice(0,10).replaceAll('-','')),pClosing:1000+i*2+Math.sin(i)*15};});
  await page.route('https://cdn.tsetmc.com/api/**',async route=>{
   const url=route.request().url();calls.push(url);
   const isSearch=url.includes('/GetInstrumentSearch/'),sym=decodeURIComponent(url.split('/').at(-1));
   const data=isSearch?{instrumentSearch:[{lVal18AFC:sym,insCode:'123456789012'}]}:{closingPriceDaily:hist};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
  const synthetic='{"version":2,"holdings":[{"symbol":"ساختگی","quantity":1,"buy":100,"current":100}]}';
  await page.evaluate(value=>localStorage.setItem('sahamban-broker-holdings-v1',value),synthetic);
  await page.locator('#sahambanModulesV87 a[href="#externalScreenerV130"]').click();
  await page.waitForFunction(()=>document.getElementById('externalScreenerV130')?.hidden===false);
  await page.locator('#externalNamesV130').fill('فولاد، شستا');
  await page.locator('#externalRunV130').click();
  await page.waitForFunction(()=>document.querySelectorAll('#externalResultsV130 details').length===2);
  assert.match(await page.locator('#externalStatusV130').innerText(),/۲ نماد/);
  assert.equal(calls.length,4);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),synthetic);
  await page.locator('#externalNamesV130').fill('فولاد، فولاد');
  await page.locator('#externalRunV130').click();
  assert.match(await page.locator('#externalStatusV130').innerText(),/تکراری/);
  assert.equal(calls.length,4,'Invalid input must not make requests');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS v130: external candidates, strict request bound, no holdings mutation');
 }finally{await browser?.close();await new Promise(ok=>server.close(ok));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
