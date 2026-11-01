'use strict';
// Automated accessibility-semantic proxy in Linux WebKit.
// NOT a VoiceOver/TalkBack test and NOT evidence of correct Persian pronunciation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {webkit}=require('playwright');

async function main(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  const file=path.resolve(root,decodeURIComponent(relative));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>{
   if(err){res.writeHead(404).end();return;}
   const mime=file.endsWith('.js')?'text/javascript'
    :file.endsWith('.css')?'text/css'
    :file.endsWith('.html')?'text/html;charset=utf-8'
    :file.endsWith('.webmanifest')?'application/manifest+json'
    :file.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
   res.writeHead(200,{'Content-Type':mime}).end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser,context,page;
 try{
  browser=await webkit.launch({headless:true});
  context=await browser.newContext({
   viewport:{width:320,height:700},deviceScaleFactor:2,isMobile:true,hasTouch:true,
   locale:'fa-IR'
  });
  page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
  const skip=page.getByRole('link',{name:'رفتن به محتوای اصلی'});
  await skip.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'sb105MainContent');

  await page.evaluate(()=>{location.hash='livePortfolioSection';});
  await page.locator('#sb88-tab-prices').click();
  await page.locator('#livePortfolioTable').evaluate(el=>{el.hidden=false;});
  await page.locator('#livePortfolioRows').evaluate(body=>{
   const fragment=document.createDocumentFragment();
   for(let i=1;i<=3;i++){
    const tr=document.createElement('tr');
    for(let j=0;j<15;j++){
     const td=document.createElement('td');
     td.textContent=j===0?'نماد '+i:'مقدار '+j;
     tr.append(td);
    }
    fragment.append(tr);
   }
   body.replaceChildren(fragment);
  });
  const modes=page.locator('#livePortfolioTable .sb99-mode');
  await modes.first().click();
  await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===3);

  // Use the accessibility tree's exposed label, not only a CSS selector.
  const input=page.getByRole('searchbox',{name:'پیدا کردن نماد در کارت‌ها'});
  assert.equal(await input.count(),1);
  assert.equal(await input.getAttribute('aria-controls'),'sb104CardList');
  assert.equal(await input.getAttribute('aria-describedby'),'sb104CardSearchStatus');
  const status=page.locator('#sb104CardSearchStatus');
  assert.equal(await status.getAttribute('role'),'status');
  assert.equal(await status.getAttribute('aria-live'),'polite');
  assert.equal(await status.isVisible(),true);

  await input.fill('نماد ۲');
  assert.equal(await page.locator('#livePortfolioTable .sb99-card:visible').count(),1);
  assert.match(await status.innerText(),/1 نماد از 3 نماد|۱ نماد از ۳ نماد/);
  await input.fill('نماد ناموجود');
  assert.equal(await page.locator('#livePortfolioTable .sb99-card:visible').count(),0);
  assert.match(await status.innerText(),/پیدا نشد/);
  await input.press('Escape');
  assert.equal(await input.inputValue(),'');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'sb104CardSearch');
  assert.equal(await page.locator('#livePortfolioTable .sb99-card:visible').count(),3);
  await modes.last().click();
  assert.equal(await input.isVisible(),false);
  assert.equal(await page.locator('#livePortfolioRows tr').count(),3);

  const notice=page.locator('#sb103UpdateNotice');
  assert.equal(await notice.count(),1);
  assert.equal(await notice.getAttribute('role'),'status');
  assert.equal(await notice.getAttribute('aria-live'),'polite');
  assert.equal(await notice.isVisible(),false);
  assert.deepEqual(errors,[],'unexpected page errors');
  console.log('PASS WebKit semantics proxy: keyboard skip, labeled searchbox, live result status, no-result text, Escape focus, notice role, preserved table.');
  console.log('UNVERIFIED: native screen readers, Persian pronunciation and physical-device performance.');
 }catch(err){
  if(page){
   fs.mkdirSync('test-artifacts',{recursive:true});
   await page.screenshot({path:'test-artifacts/webkit-a11y-v109-failure.png',fullPage:true}).catch(()=>{});
  }
  throw err;
 }finally{
  await context?.close();
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
