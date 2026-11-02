'use strict';
// v121: synthetic 20-holding import -> persist -> reload -> offline valuation.
// Browser proxy only; no brokerage credentials, personal holdings or market requests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const report={version:121,synthetic:true,physical_device:false,live_quotes_verified:false,checks:[],status:'RUNNING'};
function pass(label){report.checks.push(label);}
async function main(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const relative=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{
   if(error){res.writeHead(404).end();return;}
   const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html;charset=utf-8':'application/octet-stream';
   res.writeHead(200,{'content-type':type}).end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({locale:'fa-IR',serviceWorkers:'block',viewport:{width:390,height:820}});
  const page=await context.newPage();
  const errors=[],marketRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(request.url().includes('tsetmc.com'))marketRequests.push(request.url());});
  const entries=Array.from({length:20},(_,i)=>({symbol:'آزمایشی'+String(i+1).padStart(2,'0'),quantity:i+1,buy:1000+i*100,current:1200+i*100}));
  const expectedValue=entries.reduce((n,p)=>n+p.quantity*p.current,0);
  const expectedCost=entries.reduce((n,p)=>n+p.quantity*p.buy,0);
  const csv=['نماد,تعداد,میانگین خرید,قیمت پایانی',...entries.map(p=>[p.symbol,p.quantity,p.buy,p.current].join(','))].join('\n');
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/index.html#brokerImportSection',{waitUntil:'load'});
  assert.equal(await page.locator('#brokerImportSection').isVisible(),true);
  await page.locator('#brokerFile').setInputFiles({name:'synthetic-20.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.locator('#brokerPreview').click();
  assert.match(await page.locator('#brokerReviewStatus').innerText(),/20 ردیف پیدا شد|۲۰ ردیف پیدا شد/);
  assert.equal(await page.locator('#brokerRows tr').count(),20);
  assert.match(await page.locator('#brokerReviewStatus').innerText(),/0 ردیف تکراری|۰ ردیف تکراری/);
  pass('20 unique CSV holdings imported with no excluded rows');
  await page.locator('#brokerApply').click();
  let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1')||'null'));
  assert.equal(stored.holdings.length,20);
  assert.deepEqual(stored.holdings,entries);
  pass('exact quantities, costs and imported prices persisted locally');
  await page.reload({waitUntil:'load'});
  await page.locator('#brokerLoad').click();
  assert.equal(await page.locator('#brokerRows tr').count(),20);
  assert.match(await page.locator('#brokerReviewStatus').innerText(),/20 سهم|۲۰ سهم/);
  pass('all 20 holdings recovered after a full reload');
  await page.evaluate(()=>{location.hash='livePortfolioSection';});
  await page.waitForFunction(()=>document.getElementById('livePortfolioSection')?.hidden===false);
  await page.locator('#livePortfolioImported').click();
  assert.equal(await page.locator('#livePortfolioTable').isVisible(),true);
  assert.equal(await page.locator('#livePortfolioRows tr').count(),20);
  const summary=await page.locator('#livePortfolioSummary').innerText();
  const normalizeNumbers=s=>s.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٬,\s]/g,'');
  const numbers=normalizeNumbers(summary);
  assert.ok(numbers.includes(String(expectedValue)),'total market value must equal synthetic price x quantity');
  assert.ok(numbers.includes(String(expectedCost)),'cost basis must match synthetic quantities');
  assert.ok(numbers.includes(String(expectedValue-expectedCost)),'unrealized P/L must reconcile');
  pass('offline valuation: 20 rows and independently reconciled value, cost, and P/L');
  assert.equal(marketRequests.length,0,'offline valuation must not contact market');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1')).holdings),entries);
  assert.deepEqual(errors,[]);
  pass('no TSETMC requests, storage mutations, or uncaught page errors');
  report.totals={holdings:20,value:expectedValue,cost:expectedCost,pnl:expectedValue-expectedCost};
  report.status='PASS_BROWSER_PROXY_ONLY';
  console.log('PASS v121 synthetic 20-holding lifecycle; not a live quote or physical device test');
  await context.close();
 }catch(error){report.status='FAIL';report.error=String(error.stack||error);throw error;}
 finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/holdings-lifecycle-v121.json',JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
