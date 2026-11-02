'use strict';
/* v117: autonomous, synthetic-only mobile UI acceptance matrix.
 * Covers actual DOM interactions in Chromium and Linux WebKit, NOT physical Android/iOS.
 * Never reads personal holdings, calls market APIs or modifies portfolio math.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium,webkit}=require('playwright');

const engine=process.env.SAHAMBAN_UI_ENGINE||'chromium';
assert.ok(['chromium','webkit'].includes(engine),'Unsupported Playwright engine');
const widths=[320,360,390,520,768];
const report={version:117,engine,synthetic:true,physical_device:false,
  market_data_verified:false,tests:[],status:'RUNNING'};

function serve(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const relative=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   const type=file.endsWith('.js')?'text/javascript'
    :file.endsWith('.css')?'text/css'
    :file.endsWith('.html')?'text/html;charset=utf-8'
    :file.endsWith('.webmanifest')?'application/manifest+json'
    :file.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type}).end(data);
  });
 });
 return server;
}
async function putSyntheticRows(page,count){
 await page.locator('#livePortfolioRows').evaluate((body,n)=>{
  const fragment=document.createDocumentFragment();
  for(let i=0;i<n;i++){
   const tr=document.createElement('tr');
   for(let j=0;j<15;j++){
    const td=document.createElement('td');
    td.textContent=j===0?(i===7?'یاقوت آزمایشی':'نماد نمونه '+(i+1))
     :'مقدار مصنوعی '+(i+1)+' / '+j;
    tr.append(td);
   }
   fragment.append(tr);
  }
  body.replaceChildren(fragment);
 },count);
}
async function rowsSnapshot(page){
 return page.locator('#livePortfolioRows').evaluate(body=>
  Array.from(body.querySelectorAll('tr')).map(tr=>
   Array.from(tr.querySelectorAll('td'),td=>td.textContent)));
}
async function countVisible(page,selector){
 return page.locator(selector+':visible').count();
}
async function runWidth(browser,base,width){
 const context=await browser.newContext({
  viewport:{width,height:780},deviceScaleFactor:2,
  isMobile:true,hasTouch:true,locale:'fa-IR',serviceWorkers:'block'
 });
 let page;
 const failures=[];
 const external=[];
 try{
  page=await context.newPage();
  page.on('pageerror',e=>failures.push(e.message));
  page.on('request',req=>{
   if(/^https?:/.test(req.url())&&new URL(req.url()).origin!==new URL(base).origin)
    external.push(req.url());
  });
  await page.goto(base+'/index.html#livePortfolioTable',{waitUntil:'load'});
  assert.equal(await page.locator('#sb88-tab-prices').getAttribute('aria-selected'),'true',
   'A direct prices link should select the correct module tab');
  assert.equal(await page.locator('#livePortfolioTable').isVisible(),false,
   'No synthetic or stale quote table should auto-appear');
  assert.equal(await page.locator('#sb116PriceEmpty').isVisible(),true,
   'Missing prices should explain why cards are not present');
  await page.locator('#sb116PriceEmpty button').click();
  assert.equal(await page.locator('#sb88-tab-overview').getAttribute('aria-selected'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'sb88-tab-overview');
  await page.locator('#sb88-tab-prices').click();

  const cards=page.locator('#livePortfolioTable .sb99-mode');
  const views=page.locator('#livePortfolioTable .sb98-view-button');
  const sourceTable=page.locator('#livePortfolioTable .portfolio-v61-table');
  const scroll=page.locator('#livePortfolioTable .portfolio-v61-scroll');
  const cardList=page.locator('#livePortfolioTable .sb99-card');
  const search=page.locator('#sb104CardSearch');
  assert.equal(await cards.count(),2);
  assert.equal(await views.count(),2);
  assert.equal(await sourceTable.locator('thead th').count(),15);

  await putSyntheticRows(page,19);
  await page.locator('#livePortfolioTable').evaluate(el=>{el.hidden=false;});
  await page.waitForFunction(()=>document.getElementById('sb116PriceEmpty')?.hidden);
  assert.equal(await page.locator('#sb116PriceEmpty').isVisible(),false);
  const source19=await rowsSnapshot(page);
  assert.equal(source19.length,19);
  assert.ok(source19.every(row=>row.length===15));

  // Table, simple and full: 4 visible columns vs 15, never remove source cells.
  await cards.nth(1).click();
  assert.equal(await scroll.isVisible(),true);
  assert.equal(await search.isVisible(),false);
  await views.nth(0).click();
  assert.equal(await countVisible(page,'#livePortfolioTable .portfolio-v61-table thead th'),4);
  assert.equal(await countVisible(page,'#livePortfolioRows tr:first-child td'),4);
  assert.equal(await views.nth(0).getAttribute('aria-pressed'),'true');
  await views.nth(1).click();
  assert.equal(await countVisible(page,'#livePortfolioTable .portfolio-v61-table thead th'),15);
  assert.equal(await countVisible(page,'#livePortfolioRows tr:first-child td'),15);
  assert.equal(await views.nth(1).getAttribute('aria-pressed'),'true');
  const layout=await scroll.evaluate(el=>{
   const first=el.querySelector('th');
   return {scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,
    position:getComputedStyle(first).position,overflow:getComputedStyle(el).overflowX,
    bounds:el.getBoundingClientRect().toJSON()};
  });
  assert.ok(layout.scrollWidth>layout.clientWidth,
   'Full 15-column table should support horizontal scrolling at '+width+'px');
  assert.equal(layout.position,'sticky','RTL symbol column should be sticky');
  assert.equal(layout.overflow,'auto');
  assert.ok(layout.bounds.width<=width+2,'Table scroller should not overflow viewport');

  // Cards, one-symbol filtering, clearing, 11 extra fields and re-closing details.
  await cards.nth(0).click();
  await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===19);
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),19);
  assert.equal(await scroll.isVisible(),false);
  assert.equal(await search.isVisible(),true);
  assert.equal(await cardList.first().locator('.sb99-fields:not(.sb99-extra) dd').count(),4);
  await search.fill('یاقوت آزمایشی');
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),1);
  const selected=page.locator('#livePortfolioTable .sb99-card:visible');
  assert.match(await selected.locator('h4').innerText(),/یاقوت آزمایشی/);
  const details=selected.locator('details.sb99-more');
  await details.locator('summary').click();
  assert.equal(await details.evaluate(el=>el.open),true);
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card:visible .sb99-extra dd'),11);
  await details.locator('summary').click();
  assert.equal(await details.evaluate(el=>el.open),false);
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card:visible .sb99-extra dd'),0);
  await page.locator('#livePortfolioTable .sb104-filter-row button').click();
  assert.equal(await search.inputValue(),'');
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),19);
  await search.fill('یاقوت آزمایشی');
  await search.press('Escape');
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),19);
  await search.fill('نماد پیدا نمی‌شود');
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),0);
  assert.match(await page.locator('#sb104CardSearchStatus').innerText(),/پیدا نشد/);
  await search.press('Escape');
  assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),19);
  assert.deepEqual(await rowsSnapshot(page),source19,'Search must never alter source table rows');

  // Repeat table/card transitions with the same untouched 19x15 source data.
  for(let round=0;round<3;round++){
   await cards.nth(1).click();
   assert.equal(await cardList.count(),0,'Table mode must not keep duplicated cards');
   assert.equal(await scroll.isVisible(),true);
   assert.equal(await search.isVisible(),false);
   await cards.nth(0).click();
   await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===19);
   assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),19);
  }
  assert.deepEqual(await rowsSnapshot(page),source19);

  // Boundary portfolios: a single asset and a larger 100-asset report.
  for(const count of [1,100]){
   await putSyntheticRows(page,count);
   await page.waitForFunction(n=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===n,count);
   assert.equal(await countVisible(page,'#livePortfolioTable .sb99-card'),count);
   assert.equal(await page.locator('#livePortfolioRows td').count(),count*15);
   assert.equal(await cardList.locator('.sb99-extra dd').count(),count*11);
   await cards.nth(1).click();
   assert.equal(await cardList.count(),0);
   assert.equal(await page.locator('#livePortfolioRows tr').count(),count);
   await cards.nth(0).click();
   await page.waitForFunction(n=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===n,count);
  }

  // Synthetic operations must never write brokerage positions or a quote snapshot.
  const store=await page.evaluate(()=>({
   holdings:localStorage.getItem('sahamban-broker-holdings-v1'),
   quotes:localStorage.getItem('sahamban-broker-live-quotes-v1')
  }));
  assert.deepEqual(store,{holdings:null,quotes:null});
  assert.deepEqual(external,[],'Unexpected external requests during synthetic UI tests');
  assert.deepEqual(failures,[],'Uncaught page JavaScript errors');
  const searchBox=await search.boundingBox();
  assert.ok(searchBox&&searchBox.x>=-3&&searchBox.x+searchBox.width<=width+3,
   'Card symbol search must remain inside the viewport');
  report.tests.push({viewport:width,status:'PASS',scenarios:[
   'fresh-deep-link-and-empty-state','simple-four-columns','full-fifteen-columns',
   'RTL-horizontal-scroll-and-sticky-symbol','19-cards-and-symbol-filter',
   'clear-and-Escape-restore','open-and-close-11-details','unknown-symbol',
   'three-card-table-roundtrips','one-and-100-card-boundaries',
   'no-persistent-data-mutation','no-external-requests'
  ]});
  console.log('PASS '+engine+' '+width+'px: 4 views, 19/1/100 synthetic holdings, filter, details, RTL scroll, reload landing');
 }catch(error){
  report.tests.push({viewport:width,status:'FAIL',reason:String(error)});
  if(page){
   fs.mkdirSync('test-artifacts',{recursive:true});
   await page.screenshot({path:'test-artifacts/holdings-ui-v117-'+engine+'-'+width+'-failure.png',
    fullPage:true,timeout:5000}).catch(()=>{});
  }
  throw error;
 }finally{
  await context.close();
 }
}
async function main(){
 const server=serve();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const base='http://127.0.0.1:'+server.address().port;
  for(const width of widths)await runWidth(browser,base,width);
  report.status='PASS_PROXY_ONLY';
  console.log('SUCCESS v117 '+engine+' automated holdings UI matrix; no physical-device claims');
 }catch(error){
  report.status='FAIL';
  report.error=String(error.stack||error);
  throw error;
 }finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/holdings-ui-matrix-v117-'+engine+'.json',
   JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
