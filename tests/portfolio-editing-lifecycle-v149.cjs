'use strict';
// v149: synthetic-only add/edit/delete + explicit local save/reload lifecycle.
// Browser automation is not physical Android/WebView acceptance and never uses real holdings.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const report={version:149,synthetic:true,physical_device:false,live_market_verified:false,checks:[],status:'RUNNING'};
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
   const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':
    file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.json')?'application/json':'application/octet-stream';
   res.writeHead(200,{'content-type':type}).end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({locale:'fa-IR',serviceWorkers:'block',viewport:{width:390,height:820}});
  const page=await context.newPage(),errors=[],marketRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/tsetmc\.com|codal\.ir/i.test(r.url()))marketRequests.push(r.url());});
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/index.html#portfolioSection',{waitUntil:'load'});
  await page.locator('#portfolioData').fill('آزمایشی01,10,100,120,90,150');
  await page.locator('#pfSymbol').fill('آزمایشی02');
  await page.locator('#pfQty').fill('5');
  await page.locator('#pfBuy').fill('200');
  await page.locator('#pfCurrent').fill('220');
  await page.locator('#pfStop').fill('180');
  await page.locator('#pfTarget').fill('280');
  await page.locator('#pfAdd').click();
  let rows=(await page.locator('#portfolioData').inputValue()).trim().split(/\\r?\\n/);
  assert.equal(rows.length,2,'adding a new symbol should create exactly one new row');
  assert.match(rows[1],/^آزمایشی02,5,200,220,180,280$/);
  assert.match(await page.locator('#pfStatus').innerText(),/نماد به سبد اضافه شد/);
  pass('new synthetic holding added through the real form without duplicating existing rows');

  await page.locator('#pfExisting').selectOption('آزمایشی02');
  await page.locator('#pfEdit').click();
  assert.equal(await page.locator('#pfQty').inputValue(),'5');
  await page.locator('#pfQty').fill('12');
  await page.locator('#pfCurrent').fill('230');
  await page.locator('#pfAdd').click();
  rows=(await page.locator('#portfolioData').inputValue()).trim().split(/\\r?\\n/);
  assert.equal(rows.length,2,'editing must update in place, not append a duplicate');
  assert.match(rows[1],/^آزمایشی02,12,200,230,180,280$/);
  assert.match(await page.locator('#pfStatus').innerText(),/اطلاعات نماد به‌روزرسانی شد/);
  pass('existing synthetic holding edited in place with no duplicate row');

  await page.locator('#portfolioSave').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-portfolio-local-v1')||'null'));
  assert.equal(saved.version,2);
  assert.match(saved.data,/آزمایشی02,12,200,230,180,280/);
  pass('explicit save writes the edited portfolio and risk settings to local browser storage');

  await page.reload({waitUntil:'load'});
  await page.locator('#portfolioLoad').click();
  rows=(await page.locator('#portfolioData').inputValue()).trim().split(/\\r?\\n/);
  assert.equal(rows.length,2);
  assert.match(rows[1],/^آزمایشی02,12,200,230,180,280$/);
  pass('saved portfolio is restored after a full page reload');

  await page.locator('#pfExisting').selectOption('آزمایشی02');
  await page.locator('#pfDelete').click();
  assert.match(await page.locator('#pfStatus').innerText(),/هنوز چیزی حذف نشده/);
  assert.equal((await page.locator('#portfolioData').inputValue()).includes('آزمایشی02'),true);
  await page.locator('#pfDelete').click();
  assert.equal((await page.locator('#portfolioData').inputValue()).includes('آزمایشی02'),false);
  assert.equal(await page.locator('#pfUndo').isEnabled(),true);
  pass('delete requires a second explicit confirmation and exposes a guarded undo');

  await page.locator('#pfUndo').click();
  assert.match(await page.locator('#portfolioData').inputValue(),/آزمایشی02,12,200,230,180,280/);
  pass('undo restores the exact pre-delete text without changing the saved snapshot');

  await page.locator('#pfExisting').selectOption('آزمایشی02');
  await page.locator('#pfDelete').click();
  await page.locator('#pfDelete').click();
  assert.equal((await page.locator('#portfolioData').inputValue()).includes('آزمایشی02'),false);
  await page.locator('#portfolioSave').click();
  await page.reload({waitUntil:'load'});
  await page.locator('#portfolioLoad').click();
  rows=(await page.locator('#portfolioData').inputValue()).trim().split(/\\r?\\n/);
  assert.equal(rows.length,1,'persisted deletion should remain absent after reload and restore');
  assert.match(rows[0],/^آزمایشی01,10,100,120,90,150$/);
  pass('confirmed deletion persists only after explicit save and survives reload/restore');

  assert.deepEqual(errors,[]);
  assert.deepEqual(marketRequests,[],'synthetic CRUD and storage test must not call live market/CODAL sources');
  report.status='PASS_BROWSER_AUTOMATION_ONLY';
  console.log('PASS v149 synthetic add/edit/delete and explicit save/reload lifecycle; not physical device acceptance');
  await context.close();
 }catch(error){
  report.status='FAIL';report.error=String(error.stack||error);throw error;
 }finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/portfolio-editing-lifecycle-v149.json',JSON.stringify(report,null,2)+'\\n');
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
