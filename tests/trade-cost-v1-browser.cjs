'use strict';
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const root=process.cwd(),server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,relative=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1)),file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html;charset=utf-8'}).end(b);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({locale:'fa-IR'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#positionSizeSectionV87',{waitUntil:'load'});
  await page.locator('#calculate').click();
  const output=await page.locator('#calcResult').innerText();
  assert.match(output,/کارمزد خرید/);assert.match(output,/وجه لازم/);assert.match(output,/زیان تا حد ضرر پس از هزینه فروش/);assert.match(output,/سود تا هدف پس از هزینه فروش/);
  const qtyText=output.match(/سقف خرید محاسباتی:\s*([۰-۹0-9,٬]+)/);assert.ok(qtyText,'quantity output missing');
  await page.locator('#budget').fill('10000');await page.locator('#calculate').click();
  assert.match(await page.locator('#calcResult').innerText(),/حتی یک سهم نیز/);
  assert.deepEqual(errors,[]);
  console.log('PASS fee-aware buy budget, sell-at-stop risk, target proceeds, and zero-share boundary');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
