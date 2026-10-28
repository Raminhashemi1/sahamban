'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

async function main(){
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const requested=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
  const full=path.resolve(process.cwd(),requested);
  if(!full.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(full,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   const type=full.endsWith('.js')?'text/javascript':full.endsWith('.webmanifest')?'application/manifest+json':full.endsWith('.svg')?'image/svg+xml':full.endsWith('.html')?'text/html;charset=utf-8':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type});res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 let page;
 try{
  page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
  await page.locator('#portfolioAnalyze').click();
  assert.match(await page.locator('#portfolioSummary').innerText(),/1.?060.?000|۱.?۰۶۰.?۰۰۰|ارزش روز سبد/u);
  console.log('PASS: portfolio report renders in Chromium');

  await page.locator('#portfolioData').fill('آلفا,10,100,120,90,180');
  assert.match(await page.locator('#portfolioSummary').innerText(),/تغییر کرده/);
  await page.locator('#portfolioAnalyze').click();
  assert.match(await page.locator('#portfolioSummary').innerText(),/آلفا/);
  console.log('PASS: changes invalidate report and recalculation succeeds');

  await page.locator('#pfSymbol').fill('بتا');
  for(const [id,value] of Object.entries({pfQty:'20',pfBuy:'100',pfCurrent:'110',pfStop:'90',pfTarget:'150'}))await page.locator('#'+id).fill(value);
  await page.locator('#pfAdd').click();
  assert.match(await page.locator('#portfolioData').inputValue(),/بتا,20,100,110,90,150/);
  console.log('PASS: add holding via form');

  await page.locator('#pfExisting').selectOption('بتا');
  await page.locator('#pfEdit').click();
  await page.locator('#pfQty').fill('30');
  await page.locator('#pfAdd').click();
  assert.match(await page.locator('#portfolioData').inputValue(),/بتا,30,100,110,90,150/);
  console.log('PASS: edit existing holding');

  await page.locator('#pfExisting').selectOption('بتا');
  const before=await page.locator('#portfolioData').inputValue();
  await page.locator('#pfDelete').click();
  assert.equal(await page.locator('#portfolioData').inputValue(),before);
  await page.locator('#pfDelete').click();
  assert.doesNotMatch(await page.locator('#portfolioData').inputValue(),/بتا,/);
  await page.locator('#pfUndo').click();
  assert.equal(await page.locator('#portfolioData').inputValue(),before);
  console.log('PASS: two-step delete and undo');

  await page.locator('#portfolioSave').click();
  assert.match(await page.locator('#portfolioSaveState').innerText(),/ذخیره شده‌اند/);
  await page.locator('#portfolioData').fill('آلفا,10,100,120,90,180');
  assert.match(await page.locator('#portfolioSaveState').innerText(),/هنوز ذخیره نشده‌اند/);
  await page.locator('#portfolioLoad').click();
  assert.equal(await page.locator('#portfolioData').inputValue(),before);
  console.log('PASS: on-device save, unsaved warning, restore');

  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('SUCCESS: Chromium browser integration tests');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
