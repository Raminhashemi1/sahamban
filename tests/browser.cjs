'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
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
 let browser;
 let page;
 try{
  browser=await chromium.launch({headless:true});
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

  // Import is deliberately a two-step operation; the stored copy must remain untouched.
  const backup={format:'sahamban-portfolio',version:1,data:'گاما,7,100,120,90,170',capital:'10000',riskCap:'5',stress:'10',concentration:'40'};
  const savedBeforeImport=await page.evaluate(()=>localStorage.getItem('sahamban-portfolio-local-v1'));
  await page.locator('#portfolioBackupFile').setInputFiles({
   name:'valid-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))
  });
  await page.locator('#portfolioBackupApply').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('portfolioBackupApply').disabled);
  assert.equal(await page.locator('#portfolioData').inputValue(),before);
  console.log('PASS: selecting a valid backup never overwrites current holdings');
  await page.locator('#portfolioBackupApply').click();
  assert.equal(await page.locator('#portfolioData').inputValue(),backup.data);
  assert.equal(await page.locator('#portfolioCapital').inputValue(),backup.capital);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-portfolio-local-v1')),savedBeforeImport);
  console.log('PASS: confirmed JSON backup restores screen fields without replacing saved copy');

  await page.locator('#portfolioBackupFile').setInputFiles({
   name:'corrupted-backup.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({...backup,riskCap:'150',data:'نامعتبر,0,100,120,90,170'}))
  });
  await page.getByText('فایل پذیرفته نشد:',{exact:false}).waitFor({timeout:10000});
  assert.equal(await page.locator('#portfolioBackupApply').isDisabled(),true);
  assert.equal(await page.locator('#portfolioData').inputValue(),backup.data);
  console.log('PASS: invalid JSON backup rejected without changing current holdings');

  // Matching the built-in example must never silently discard those holdings.
  await page.locator('#portfolioData').fill('فولاد,1000,500,540,470,650\nخودرو,2000,280,260,235,320');
  await page.locator('#pfSymbol').fill('آزمایش');
  for(const [id,value] of Object.entries({pfQty:'5',pfBuy:'100',pfCurrent:'110',pfStop:'90',pfTarget:'130'}))await page.locator('#'+id).fill(value);
  await page.locator('#pfAdd').click();
  const retainedRows=await page.locator('#portfolioData').inputValue();
  assert.match(retainedRows,/فولاد,1000,500,540,470,650/);
  assert.match(retainedRows,/خودرو,2000,280,260,235,320/);
  assert.match(retainedRows,/آزمایش,5,100,110,90,130/);
  console.log('PASS: adding a holding never silently removes example-shaped existing positions');

  // Mock market responses: no request is sent to the real exchange.
  const currentDate=new Date();
  const date=[currentDate.getFullYear(),String(currentDate.getMonth()+1).padStart(2,'0'),String(currentDate.getDate()).padStart(2,'0')].join('');
  const previousDate=new Date(currentDate);previousDate.setDate(previousDate.getDate()-1);
  const yesterday=[previousDate.getFullYear(),String(previousDate.getMonth()+1).padStart(2,'0'),String(previousDate.getDate()).padStart(2,'0')].join('');
  let sameDate=false;
  await page.evaluate(()=>{window.__sahambanTestSpeechCalls=0;window.speak=()=>{window.__sahambanTestSpeechCalls++;};});
  await page.route('https://cdn.tsetmc.com/api/ClosingPrice/**',async route=>{
   const endpoint=route.request().url();
   let body;
   if(endpoint.includes('GetClosingPriceDailyList'))body={closingPriceDaily:[{dEven:sameDate?Number(date):Number(yesterday),pClosing:2100}]};
   else if(endpoint.includes('GetClosingPriceInfo'))body={closingPriceInfo:{dEven:Number(date),pClosing:2100}};
   else throw Error('Unexpected market API route: '+endpoint);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.locator('#marketCode').fill('46348559193224090');
  await page.locator('#marketSymbol').fill('فولاد');
  await page.locator('#liveStop').fill('2000');
  await page.locator('#liveTarget').fill('2050'); // price crosses upper threshold, but history is mismatched
  await page.locator('#marketQuote').click();
  await assert.doesNotReject(async()=>{await page.getByText('وضعیت اعتبار: در انتظار تطبیق',{exact:false}).waitFor({timeout:10000});});
  assert.equal(await page.locator('#quoteStatus').evaluate(el=>el.classList.contains('alarm')),false);
  assert.equal(await page.evaluate(()=>window.__sahambanTestSpeechCalls),0);
  console.log('PASS: mismatch between daily quote and history blocks market alarm');

  sameDate=true;
  await page.locator('#liveTarget').fill('2300'); // no crossing when history is valid
  await page.locator('#marketQuote').click();
  await page.getByText('وضعیت اعتبار: تأییدشده',{exact:false}).waitFor({timeout:10000});
  assert.equal(await page.locator('#quoteStatus').evaluate(el=>el.classList.contains('alarm')),false);
  assert.equal(await page.evaluate(()=>window.__sahambanTestSpeechCalls),0);
  console.log('PASS: matching market quote and history confirm validity without out-of-range alarm');
  await page.locator('#liveTarget').fill('2050'); // valid closing price 2100 crosses upper limit
  await page.locator('#marketQuote').click();
  await page.locator('#quoteStatus.alarm').waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>window.__sahambanTestSpeechCalls),1);
  console.log('PASS: verified quote crossing upper limit triggers exactly one speech alert');

  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('SUCCESS: Chromium browser integration tests');
 }catch(error){
  try{
   const output=process.env.GITHUB_WORKSPACE?path.join(process.env.GITHUB_WORKSPACE,'test-artifacts'):path.join(os.tmpdir(),'sahamban-browser-artifacts');
   fs.mkdirSync(output,{recursive:true});
   if(page){await page.screenshot({path:path.join(output,'browser-failure.png'),fullPage:true,timeout:5000}).catch(()=>{});fs.writeFileSync(path.join(output,'browser-page.txt'),(await page.locator('body').innerText().catch(()=>'' )).slice(0,20000));}
   fs.writeFileSync(path.join(output,'error.txt'),String(error.stack||error));
   console.error('Browser failure evidence: '+output);
  }catch(e){console.error('Could not save browser artifacts:',e.message);}
  throw error;
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
