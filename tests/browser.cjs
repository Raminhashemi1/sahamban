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
  const latinize=value=>String(value).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const readPortfolio=async()=>latinize(await page.locator('#portfolioData').inputValue());
  await page.evaluate(()=>localStorage.setItem('sahamban-recorded-alert','data:audio/webm;base64,VEVTVA=='));
  const voiceBeforeBrokerImport=await page.evaluate(()=>localStorage.getItem('sahamban-recorded-alert'));
  // Broker imports are staged independently and never overwrite the analytical portfolio.
  const portfolioBeforeImport=await readPortfolio();
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
  assert.equal(await readPortfolio(),portfolioBeforeImport);
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
  assert.equal(await readPortfolio(),portfolioBeforeImport);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-recorded-alert')),voiceBeforeBrokerImport);
  console.log('PASS: offline compressed XLSX, local backup on replacement, no analytical portfolio changes');

  // Older brokerage exports may be in toman. Multiply by 10 to store rial.
  await page.locator('#brokerUnit').selectOption('toman');
  await page.locator('#brokerFile').setInputFiles({name:'legacy-toman.csv',mimeType:'text/csv',buffer:Buffer.from(
    'نام نماد,تعداد دارایی,میانگین خرید,قیمت پایانی\nفولاد,7,125,140\n','utf8')});
  await page.locator('#brokerPreview').click();
  assert.match(await page.locator('#brokerReviewStatus').innerText(),/۱ ردیف/);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#brokerApply').click();
  const tomanImported=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1')));
  assert.equal(tomanImported.version,2);
  assert.equal(tomanImported.holdings[0].quantity,7);
  assert.equal(tomanImported.holdings[0].buy,1250);
  assert.equal(tomanImported.holdings[0].current,1400);
  assert.equal(await page.locator('#portfolioData').inputValue(),portfolioBeforeImport);
  console.log('PASS: old toman prices multiplied by 10 into rial, quantity and risk portfolio unchanged');
  const importedBeforeOffline=await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1'));
  await page.locator('#livePortfolioImported').click();
  assert.match(await page.locator('#livePortfolioSummary').innerText(),/ارزش بر اساس قیمت فایل: ۹٬۸۰۰ ریال/);
  assert.match(await page.locator('#livePortfolioSummary').innerText(),/سود\/زیان تحقق‌نیافته: ۱٬۰۵۰ ریال/);
  assert.match(await page.locator('#livePortfolioMeta').innerText(),/قیمت روز یا به‌روزرسانی خودکار نیست/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),importedBeforeOffline);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-live-quotes-v1')),null);
  console.log('PASS: offline file-based valuation explicitly marked non-live, with no storage mutation');
  const savedBeforeExport=await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1'));
  const backupDownload=page.waitForEvent('download');
  await page.locator('#brokerExportBackup').click();
  const downloaded=await backupDownload;
  assert.equal(downloaded.suggestedFilename(),'sahamban-broker-holdings-backup.json');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1')),savedBeforeExport);
  console.log('PASS: broker holdings JSON backup downloads without changing stored holdings');
  await page.locator('#brokerUnit').selectOption('rial');
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
  assert.match(await readPortfolio(),/بتا,20,100,110,90,150/);
  console.log('PASS: add holding via form');

  await page.locator('#pfExisting').selectOption('بتا');
  await page.locator('#pfEdit').click();
  await page.locator('#pfQty').fill('30');
  await page.locator('#pfAdd').click();
  assert.match(await readPortfolio(),/بتا,30,100,110,90,150/);
  console.log('PASS: edit existing holding');

  await page.locator('#pfExisting').selectOption('بتا');
  const before=await readPortfolio();
  await page.locator('#pfDelete').click();
  assert.equal(await readPortfolio(),before);
  await page.locator('#pfDelete').click();
  assert.doesNotMatch(await readPortfolio(),/بتا,/);
  await page.locator('#pfUndo').click();
  assert.equal(await readPortfolio(),before);
  console.log('PASS: two-step delete and undo');

  await page.locator('#portfolioSave').click();
  assert.match(await page.locator('#portfolioSaveState').innerText(),/ذخیره شده‌اند/);
  await page.locator('#portfolioData').fill('آلفا,10,100,120,90,180');
  assert.match(await page.locator('#portfolioSaveState').innerText(),/هنوز ذخیره نشده‌اند/);
  await page.locator('#portfolioLoad').click();
  assert.equal(await readPortfolio(),before);
  console.log('PASS: on-device save, unsaved warning, restore');

  // Import is deliberately a two-step operation; the stored copy must remain untouched.
  const backup={format:'sahamban-portfolio',version:1,data:'گاما,7,100,120,90,170',capital:'10000',riskCap:'5',stress:'10',concentration:'40'};
  const savedBeforeImport=await page.evaluate(()=>localStorage.getItem('sahamban-portfolio-local-v1'));
  await page.locator('#portfolioBackupFile').setInputFiles({
   name:'valid-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))
  });
  await page.locator('#portfolioBackupApply').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('portfolioBackupApply').disabled);
  assert.equal(await readPortfolio(),before);
  console.log('PASS: selecting a valid backup never overwrites current holdings');
  await page.locator('#portfolioBackupApply').click();
  assert.equal(await readPortfolio(),'گاما,7,1000,1200,900,1700');
  assert.equal(latinize(await page.locator('#portfolioCapital').inputValue()),'100000');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-portfolio-local-v1')),savedBeforeImport);
  console.log('PASS: confirmed JSON backup restores screen fields without replacing saved copy');

  await page.locator('#portfolioBackupFile').setInputFiles({
   name:'corrupted-backup.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({...backup,riskCap:'150',data:'نامعتبر,0,100,120,90,170'}))
  });
  await page.getByText('فایل پذیرفته نشد:',{exact:false}).waitFor({timeout:10000});
  assert.equal(await page.locator('#portfolioBackupApply').isDisabled(),true);
  assert.equal(await readPortfolio(),'گاما,7,1000,1200,900,1700');
  console.log('PASS: invalid JSON backup rejected without changing current holdings');

  // Matching the built-in example must never silently discard those holdings.
  await page.locator('#portfolioData').fill('فولاد,1000,500,540,470,650\nخودرو,2000,280,260,235,320');
  await page.locator('#pfSymbol').fill('آزمایش');
  for(const [id,value] of Object.entries({pfQty:'5',pfBuy:'100',pfCurrent:'110',pfStop:'90',pfTarget:'130'}))await page.locator('#'+id).fill(value);
  await page.locator('#pfAdd').click();
  const retainedRows=await readPortfolio();
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

  // Test the live portfolio overlay using synthetic holdings and mocked TSETMC responses only.
  const marketToday=new Date().toISOString().slice(0,10).replace(/-/g,'');
  const marketYesterday=new Date(Date.now()-9*86400000).toISOString().slice(0,10).replace(/-/g,'');
  let staleBeta=true;
  await page.evaluate(()=>{
   localStorage.setItem('sahamban-broker-holdings-v1',JSON.stringify({version:2,holdings:[
    {symbol:'آلفا',quantity:10,buy:1000,current:1200},
    {symbol:'بتا',quantity:20,buy:2000,current:2100}
   ]}));
   localStorage.removeItem('sahamban-broker-live-quotes-v1');
  });
  await page.route('https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/**',async route=>{
   const symbol=decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1));
   const code=symbol==='آلفا'?'12345678901':symbol==='بتا'?'12345678902':null;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({instrumentSearch:code?[{insCode:code,lVal18AFC:symbol,lVal30:symbol}]:[]})});
  });
  await page.route('https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceInfo/**',async route=>{
   const code=new URL(route.request().url()).pathname.split('/').at(-1);
   const isBeta=code==='12345678902';
   const date=isBeta&&staleBeta?Number(marketYesterday):Number(marketToday);
   const price=isBeta?2100:1500;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({closingPriceInfo:{dEven:date,pClosing:price}})});
  });
  await page.locator('#livePortfolioRefresh').click();
  await page.getByText('به‌روزرسانی کامل نشد',{exact:false}).waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-broker-live-quotes-v1')),null);
  assert.equal(await page.locator('#livePortfolioTable').isVisible(),false);
  console.log('PASS: stale quote for one holding blocks partial portfolio totals');
  staleBeta=false;
  await page.locator('#livePortfolioRefresh').click();
  await page.getByText('ارزش روز: ۵۷٬۰۰۰ ریال',{exact:false}).waitFor({timeout:10000});
  assert.match(await page.locator('#livePortfolioSummary').innerText(),/سود\/زیان تحقق‌نیافته: ۷٬۰۰۰ ریال/);
  const storedAfterLive=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1')));
  assert.deepEqual(storedAfterLive.holdings.map(x=>[x.symbol,x.quantity,x.buy]),[['آلفا',10,1000],['بتا',20,2000]]);
  const savedQuotes=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-live-quotes-v1')));
  assert.equal(savedQuotes.quotes.length,2);
  assert.equal(savedQuotes.source,'TSETMC');
  console.log('PASS: mocked fresh quotes calculate rial value/P&L and preserve quantities and buy prices');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sahamban-recorded-alert')),recordedBefore);
  console.log('PASS: portfolio, backup and market checks preserve recorded user voice');

  // Best-effort direct browser CORS probe against the real endpoint after removing all mocks.
  await page.unrouteAll();
  const browserProbe=await page.evaluate(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
   try{
    const response=await fetch('https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/'+encodeURIComponent('فولاد'),{cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    const type=response.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('json'))throw Error('response is not JSON');
    const data=await response.json(),rows=data?.instrumentSearch;
    if(!Array.isArray(rows)||!rows.some(x=>String(x.lVal18AFC||'').replace(/\\s/g,'')==='فولاد'))throw Error('exact ticker not present in response');
    return {ok:true,message:'Real TSETMC search endpoint reachable from browser origin; this runner origin is localhost, not GitHub Pages.'};
   }catch(e){return {ok:false,message:(e.name==='AbortError'?'timeout':e.message)+'; CORS/network/geographic access remains unverified.'};}
   finally{clearTimeout(timer);}
  });
  console.log((browserProbe.ok?'BROWSER INTEGRATION PASS: ':'BROWSER INTEGRATION BLOCKED/UNVERIFIED: ')+browserProbe.message);
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
