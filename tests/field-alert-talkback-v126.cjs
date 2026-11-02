'use strict';
/* v126 regression: manual alert text remains visible while recorded audio plays,
 * and modules expose reliable Persian accessible names. Synthetic inputs only.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
async function main(){
 const root=process.cwd(),server=http.createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
  const file=path.resolve(root,p);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html;charset=utf-8'}).end(data));
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({locale:'fa-IR',serviceWorkers:'block'});
  await context.addInitScript(()=>{
   // Fake recording only: no microphone, browser storage holds no real portfolio.
   localStorage.setItem('sahamban-recorded-alert','data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
  const module=page.locator('#sahambanModulesV87 a[href="#livePortfolioSection"]');
  assert.match(await module.getAttribute('aria-label'),/سبد من/);
  await module.click();
  await page.waitForFunction(()=>document.getElementById('livePortfolioSection')?.hasAttribute('aria-labelledby'));
  assert.equal(await page.locator('#livePortfolioSection').getAttribute('aria-labelledby'),
   await page.locator('#livePortfolioSection h2').first().getAttribute('id'));
  await page.waitForFunction(()=>document.activeElement?.tagName==='H2');
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#manualAlertsSectionV87',{waitUntil:'load'});
  await page.locator('#symbol').fill('نمونه');
  await page.locator('#price').fill('13000');
  await page.locator('#aStop').fill('9000');
  await page.locator('#aTarget').fill('12000');
  await page.locator('#check').click();
  assert.match(await page.locator('#alerts').innerText(),/هشدار حد سود/);
  await page.waitForTimeout(250);
  assert.match(await page.locator('#alerts').innerText(),/هشدار حد سود/,'Audio status must not overwrite alert result');
  assert.notEqual(await page.locator('#alerts').getAttribute('role'),'alert');
  console.log('PASS v126: module accessible name/focus and persistent manual alert text');
 }finally{await browser?.close();await new Promise(ok=>server.close(ok));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
