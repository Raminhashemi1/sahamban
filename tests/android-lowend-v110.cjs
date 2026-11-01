'use strict';
// Chromium + CDP proxy, not a real Android or field benchmark.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
async function run(){
 const root=process.cwd(),report={proxy:true,physical_device:false,network_mbps:1.5,cpu_slowdown:4,loads:[],switches:[]};
 const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
  const p=path.resolve(root,rel);
  if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(p,(e,data)=>{if(e){res.writeHead(404).end();return;}
   res.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'}).end(data);
  });
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser,context,page;
 try{
  browser=await chromium.launch({headless:true});
  for(let i=0;i<5;i++){
   const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true,locale:'fa-IR',serviceWorkers:'block'});
   const p=await ctx.newPage(),cdp=await ctx.newCDPSession(p);
   await cdp.send('Network.enable');
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:350,downloadThroughput:196608,uploadThroughput:98304});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   const start=Date.now();
   await p.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load',timeout:90000});
   report.loads.push(Date.now()-start);
   if(i===4){context=ctx;page=p;}else await ctx.close();
  }
  await page.evaluate(()=>{location.hash='livePortfolioSection';});
  await page.locator('#sb88-tab-prices').click();
  await page.locator('#livePortfolioTable').evaluate(el=>{el.hidden=false;});
  await page.locator('#livePortfolioRows').evaluate(body=>{
   const frag=document.createDocumentFragment();
   for(let i=0;i<100;i++){const tr=document.createElement('tr');for(let j=0;j<15;j++){
    const td=document.createElement('td');td.textContent=j?'نمونه '+j:'نماد '+i;tr.append(td);
   }frag.append(tr);}body.replaceChildren(frag);
  });
  const rootElement=page.locator('#livePortfolioTable'),buttons=rootElement.locator('.sb99-mode');
  assert.equal(await page.locator('#livePortfolioRows td').count(),1500);
  for(let i=0;i<5;i++){
   await buttons.last().click();
   assert.equal(await rootElement.locator('.sb99-card').count(),0);
   const start=Date.now();await buttons.first().click();
   await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===100);
   report.switches.push(Date.now()-start);
   assert.equal(await page.locator('#livePortfolioRows tr').count(),100);
  }
  await page.locator('#sb104CardSearch').fill('نماد ۹۹');
  assert.equal(await rootElement.locator('.sb99-card:visible').count(),1);
  report.status='PASS_PROXY_ONLY';
  console.log('PASS constrained Chromium synthetic 100-row regression');
 }catch(e){report.status='FAIL_PROXY';report.error=String(e);throw e;}
 finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/android-lowend-v110.json',JSON.stringify(report,null,2)+'\n');
  await context?.close();await browser?.close();await new Promise(ok=>server.close(ok));
 }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
