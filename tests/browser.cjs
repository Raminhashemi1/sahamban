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
  await page.evaluate(()=>localStorage.setItem('sahamban-recorded-alert','data:audio/webm;base64,VEVTVA=='));
  const voiceBeforeBrokerImport=await page.evaluate(()=>localStorage.getItem('sahamban-recorded-alert'));
  // Broker imports are staged independently and never overwrite the analytical portfolio.
  const portfolioBeforeImport=await page.locator('#portfolioData').inputValue();
  await page.locator('#brokerFile').setInputFiles({name:'brokers.csv',mimeType:'text/csv',buffer:Buffer.from(
    'نام نماد,تعداد دارایی,قیمت میانگین خرید در آخرین دوره با لحاظ کارمزد,قیمت پایانی\n' +
    'فولاد,100,2500,3000\nوملل,1842,6975,2282\nوملل,1842,0,1000\n', 'utf8')});
  await page.locator('#brokerMapping').waitFor({state:'visible'});
  await page.locator('#brokerPreview').click();
  assert.match(await page.locator('#brokerReviewStatus').innerText(),/۳ ردیف/);
  assert.equal(await page.locator('#brokerApply').isDisabled(),false);
  await page.locator('#brokerApply').click();
  const importedCSV=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1')));
  assert.equal(importedCSV.holdings.length,2);
  assert.equal(importedCSV.holdings[0].buy,2500);
  assert.equal(importedCSV.holdings[1].symbol,'وملل');
  assert.equal(await page.locator('#portfolioData').inputValue(),portfolioBeforeImport);
  console.log('PASS: generic CSV mapping, rial prices, duplicate and zero-price exclusion, no portfolio overwrite');

  // Generate a minimal compressed XLSX in-memory; no personal brokerage file in test artifacts.
  function zip(files){
   const {deflateRawSync}=require('node:zlib');
   const parts=[],directory=[];let offset=0;
   for(const [name,content] of Object.entries(files)){
    const data=Buffer.from(content,'utf8'),packed=deflateRawSync(data),filename=Buffer.from(name);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);header.writeUInt32LE(packed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
    parts.push(header,filename,packed);
    const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50,0);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(8,10);entry.writeUInt32LE(packed.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);
    directory.push(entry,filename);offset+=header.length+filename.length+packed.length;
   }
   const central=Buffer.concat(directory),eocd=Buffer.alloc(22);eocd.writeUInt32LE(0x06054b50,0);
   const count=Object.keys(files).length;eocd.writeUInt16LE(count,8);eocd.writeUInt16LE(count,10);eocd.writeUInt32LE(central.length,12);eocd.writeUInt32LE(offset,16);
   return Buffer.concat([...parts,central,eocd]);
  }
  const xlsx=zip({
   'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Holdings" sheetId="1" r:id="rId1"/></sheets></workbook>',
   'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
   'xl/sharedStrings.xml':'<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>نام نماد</t></si><si><t>تعداد دارایی</t></si><si><t>قیمت میانگین خرید در آخرین دوره با لحاظ کارمزد</t></si><si><t>قیمت پایانی</t></si><si><t>خودرو</t></si></sst>',
   'xl/worksheets/sheet1.xml':'<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row><row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2"><v>200</v></c><c r="C2"><v>5000</v></c><c r="D2"><v>4500</v></c></row></sheetData></worksheet>'
  });
  await page.locator('#brokerFile').setInputFiles({name:'sample.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:xlsx});
  await page.locator('#brokerMapping').waitFor({state:'visible'});
  await page.locator('#brokerPreview').click();
  assert.match(await page.locator('#brokerReviewStatus').innerText(),/۱ ردیف/);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#brokerApply').click();
  const importedExcel=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1')));
  const previousExcel=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1-previous')));
  assert.equal(importedExcel.holdings.length,1);
  assert.equal(importedExcel.holdings[0].symbol,'خودرو');
  assert.equal(importedExcel.holdings[0].buy,5000);
  assert.equal(previousExcel.holdings.length,2);
  assert.equal(await page.locator('#portfolioData').inputValue(),portfolioBeforeImport);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-recorded-alert')),voiceBeforeBrokerImport);
  console.log('PASS: offline compressed XLSX, local backup on replacement, no analytical portfolio changes');
  // Simulate an existing user recording; portfolio actions must never overwrite it.
  await page.evaluate(()=>localStorage.setItem('sahamban-recorded-alert','data:audio/webm;base64,VEVTVA=='));
  const recordedBefore=await page.evaluate(()=>localStorage.getItem('sahamban-recorded-alert'));
  await page.locator('#portfolioAnalyze').click();
  assert.match(await page.locator('#portfolioSummary').innerText(),/ارزش روز سبد/u);
  console.log('PASS: portfolio report renders in Chromium');

  await page.locator('#portfolioData').fill('آلفا,10,100,120,90,180');
  assert.match(await page.locator('#portfolioSummary').innerText(),/تغییر کرده/);
  await page.locator('#portfolioAnalyze').click();
  assert.match(await page.locator('#portfolioSummary').innerText(),/آلفا/);
  console.log('PASS: changes invalidate report and recalculation succeeds');

  await page.locator('#pfSymbol').fill('بتا');
  for(const [id,value] of Object.entries({pfQty:'20',pfBuy:'100',pfCurrent:'110',pfStop:'90',pfTarget:'150'}))await page.locator('#'+id).fill(value);
  await page.locator('#pfAdd').click();
  assert.match(await page.locator('#portfolioData').inputValue(),/بتا,۲۰,۱۰۰,۱۱۰,۹۰,۱۵۰/);
  console.log('PASS: add holding via form');

  await page.locator('#pfExisting').selectOption('بتا');
  await page.locator('#pfEdit').click();
  await page.locator('#pfQty').fill('30');
  await page.locator('#pfAdd').click();
  assert.match(await page.locator('#portfolioData').inputValue(),/بتا,۳۰,۱۰۰,۱۱۰,۹۰,۱۵۰/);
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
  assert.equal(await page.locator('#portfolioData').inputValue(),'گاما,۷,۱۰۰۰,۱۲۰۰,۹۰۰,۱۷۰۰');
  assert.equal(await page.locator('#portfolioCapital').inputValue(),'۱۰۰۰۰۰');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-portfolio-local-v1')),savedBeforeImport);
  console.log('PASS: confirmed JSON backup restores screen fields without replacing saved copy');

  await page.locator('#portfolioBackupFile').setInputFiles({
   name:'corrupted-backup.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({...backup,riskCap:'150',data:'نامعتبر,0,100,120,90,170'}))
  });
  await page.getByText('فایل پذیرفته نشد:',{exact:false}).waitFor({timeout:10000});
  assert.equal(await page.locator('#portfolioBackupApply').isDisabled(),true);
  assert.equal(await page.locator('#portfolioData').inputValue(),'گاما,۷,۱۰۰۰,۱۲۰۰,۹۰۰,۱۷۰۰');
  console.log('PASS: invalid JSON backup rejected without changing current holdings');

  // Matching the built-in example must never silently discard those holdings.
  await page.locator('#portfolioData').fill('فولاد,1000,500,540,470,650\nخودرو,2000,280,260,235,320');
  await page.locator('#pfSymbol').fill('آزمایش');
  for(const [id,value] of Object.entries({pfQty:'5',pfBuy:'100',pfCurrent:'110',pfStop:'90',pfTarget:'130'}))await page.locator('#'+id).fill(value);
  await page.locator('#pfAdd').click();
  const retainedRows=await page.locator('#portfolioData').inputValue();
  assert.match(retainedRows,/فولاد,۱۰۰۰,۵۰۰,۵۴۰,۴۷۰,۶۵۰/);
  assert.match(retainedRows,/خودرو,۲۰۰۰,۲۸۰,۲۶۰,۲۳۵,۳۲۰/);
  assert.match(retainedRows,/آزمایش,۵,۱۰۰,۱۱۰,۹۰,۱۳۰/);
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

  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-recorded-alert')),recordedBefore);
  console.log('PASS: portfolio, backup and market checks preserve recorded user voice');

  // Integrated main-page regression: nineteen imported holdings must be read-only,
  // and must never be confused with the editable risk-analysis/demo portfolio.
  const nineteen=Array.from({length:19},(_,i)=>({symbol:'سبد'+(i+1),quantity:i+1,buy:1200+i,current:1300+i}));
  const beforeNineteen=JSON.stringify({version:2,created:new Date().toISOString(),holdings:nineteen});
  await page.evaluate(data=>localStorage.setItem('sahamban-broker-holdings-v1',data),beforeNineteen);
  await page.reload({waitUntil:'load'});
  const analysisBeforeIntegrated=await page.locator('#portfolioData').inputValue();
  await page.getByText('۱۹ نماد',{exact:false}).first().waitFor({timeout:10000});
  await page.locator('#livePortfolioImported').click();
  assert.match(await page.locator('#livePortfolioSummary').innerText(),/ارزش بر اساس قیمت فایل/);
  assert.match(await page.locator('#livePortfolioMeta').innerText(),/قیمت روز یا به‌روزرسانی خودکار نیست/);
  assert.equal(await page.locator('#livePortfolioRows tr').count(),19);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),beforeNineteen);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-live-quotes-v1')),null);
  assert.equal(await page.locator('#portfolioData').inputValue(),analysisBeforeIntegrated);
  console.log('PASS: integrated main page reads a 19-position broker portfolio without mutations or demo-portfolio mixing');
  // Variable-size portfolios: support both fewer and more holdings than this user's 19.
  for(const count of [1,7,19,35,100]){
   const sample=Array.from({length:count},(_,i)=>({symbol:'تعداد'+count+'_'+(i+1),quantity:i+1,buy:900+i,current:1000+i}));
   const snapshot=JSON.stringify({version:2,created:new Date().toISOString(),holdings:sample});
   await page.evaluate(data=>localStorage.setItem('sahamban-broker-holdings-v1',data),snapshot);
   await page.reload({waitUntil:'load'});
   await page.locator('#livePortfolioImported').click();
   assert.equal(await page.locator('#livePortfolioRows tr').count(),count);
   const persianCount=String(count).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
   assert.ok((await page.locator('#livePortfolioMeta').innerText()).includes('تعداد دارایی: '+persianCount));
   assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),snapshot);
   assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-live-quotes-v1')),null);
  }
  console.log('PASS: variable portfolio sizes 1, 7, 19, 35 and 100 render without storage mutations');
  const restoreNineteen=JSON.stringify({version:2,created:new Date().toISOString(),holdings:nineteen});
  await page.evaluate(data=>localStorage.setItem('sahamban-broker-holdings-v1',data),restoreNineteen);
  await page.reload({waitUntil:'load'});

  const beforeDownload=await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1'));
  const pendingBackup=page.waitForEvent('download');
  await page.locator('#brokerExportBackup').click();
  const downloadedBrokerBackup=await pendingBackup;
  assert.equal(downloadedBrokerBackup.suggestedFilename(),'sahamban-broker-holdings-backup.json');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),beforeDownload);
  console.log('PASS: mobile real-holdings JSON backup download does not mutate 19-position storage');

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
