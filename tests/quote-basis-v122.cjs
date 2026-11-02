'use strict';
// v122: deterministic, synthetic three-symbol market-price basis and atomic failure acceptance.
// Chromium simulation only; mocked TSETMC data, no physical device or live-market claims.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const report={version:122,synthetic:true,market_mocked:true,real_market_verified:false,physical_device:false,status:'RUNNING',checks:[]};
function record(label){report.checks.push(label);}
const instruments=[
 {symbol:'فولاد',code:'123456789012301',quantity:10,buy:4000,importCurrent:4090,close:4090,last:4200},
 {symbol:'فملی',code:'123456789012302',quantity:20,buy:26000,importCurrent:27510,close:27510,last:27560},
 {symbol:'وبملت',code:'123456789012303',quantity:30,buy:1500,importCurrent:1354,close:1354,last:1429}
];
const valuation=(field)=>instruments.reduce((sum,h)=>sum+h.quantity*h[field],0);
const cost=valuation('buy'),market=valuation('last'),closing=valuation('close');
assert.equal(cost,605000);
assert.equal(market,636070);
assert.equal(closing,631720);
assert.equal(market-closing,4350);
const digits=s=>String(s).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٬,\s\u200e\u200f\u061c]/g,'').replace(/[−﹣－]/g,'-');
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const marketDate=parts.year+parts.month+parts.day;
async function main(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const relative=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>{
   if(e){res.writeHead(404).end();return;}
   const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html;charset=utf-8':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type}).end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({locale:'fa-IR',viewport:{width:390,height:820},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[],marketPaths=[];
  let failCode='';
  page.on('pageerror',err=>errors.push(err.message));
  const saved={version:2,created:'2026-11-02T00:00:00.000Z',holdings:instruments.map(h=>({symbol:h.symbol,quantity:h.quantity,buy:h.buy,current:h.importCurrent}))};
  await page.addInitScript(payload=>localStorage.setItem('sahamban-broker-holdings-v1',JSON.stringify(payload)),saved);
  await page.route('https://cdn.tsetmc.com/api/**',async route=>{
   const u=new URL(route.request().url());
   marketPaths.push(u.pathname);
   const respond=obj=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(obj)});
   const search='/api/Instrument/GetInstrumentSearch/';
   const price='/api/ClosingPrice/GetClosingPriceInfo/';
   const info='/api/Instrument/GetInstrumentInfo/';
   if(u.pathname.startsWith(search)){
    const ticker=decodeURIComponent(u.pathname.slice(search.length));
    const h=instruments.find(x=>x.symbol===ticker);
    return respond({instrumentSearch:h?[{lVal18AFC:h.symbol,insCode:h.code,flow:1}]:[]});
   }
   if(u.pathname.startsWith(price)){
    const code=u.pathname.slice(price.length);
    if(code===failCode)return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    const h=instruments.find(x=>x.code===code);
    return respond({closingPriceInfo:h?{pClosing:h.close,pDrCotVal:h.last,dEven:Number(marketDate),hEven:113005,qTotCap:3500000,qTotTran5J:1000,zTotTran:24}:null});
   }
   if(u.pathname.startsWith(info)){
    const code=u.pathname.slice(info.length);
    return respond({instrumentInfo:{insCode:code,yVal:'300',flow:1,cSecVal:'10',lSecVal:'گروه ساختگی'}});
   }
   // Investor flows are optional; intentionally invalid, must not invalidate successful prices.
   if(u.pathname.includes('/ClientType/GetClientType/'))return respond({clientType:[]});
   return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#livePortfolioSection',{waitUntil:'load'});
  assert.match(await page.locator('#livePortfolioStatus').innerText(),/۳ نماد|3 نماد/);
  await page.locator('#livePortfolioRefresh').click();
  await page.waitForFunction(()=>document.getElementById('livePortfolioStatus')?.textContent.includes('دریافت قیمت جاری همه'),null,{timeout:30000});
  assert.equal(await page.locator('#livePortfolioRows tr').count(),3);
  const summary=digits(await page.locator('#livePortfolioSummary').innerText());
  assert.ok(summary.includes(String(market)),'last-trade value must equal 636070');
  assert.ok(summary.includes(String(cost)),'cost basis must equal 605000');
  assert.ok(summary.includes(String(market-cost)),'profit must equal 31070');
  record('market-based total, cost, and profit reconcile exactly');
  const rows=await page.locator('#livePortfolioRows tr').evaluateAll(trs=>trs.map(tr=>Array.from(tr.cells,td=>td.textContent)));
  for(let i=0;i<instruments.length;i++){
   const h=instruments[i],row=rows[i];
   assert.equal(digits(row[3]),String(h.last),'valuation basis must use latest trade');
   assert.equal(digits(row[11]),String(h.close),'closing price must remain separately visible');
   assert.equal(digits(row[4]),String(h.last*h.quantity),'holding market value must use latest trade');
   assert.equal(digits(row[8]),String((h.last-h.buy)*h.quantity),'per-symbol profit must reconcile');
  }
  record('last trade and closing remain distinct in all three rows');
  assert.equal(market-closing,4350);
  record('4350-rial discrepancy is explained by controlled last-versus-close differences');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1'))),saved);
  record('live refresh does not mutate original stored holdings');
  failCode=instruments[1].code;
  await page.locator('#livePortfolioRefresh').click();
  await page.waitForFunction(()=>document.getElementById('livePortfolioStatus')?.textContent.includes('به‌روزرسانی کامل نشد'),null,{timeout:45000});
  assert.equal(await page.locator('#livePortfolioTable').isVisible(),false);
  assert.equal((await page.locator('#livePortfolioSummary').innerText()).trim(),'');
  assert.match(await page.locator('#livePortfolioStatus').innerText(),/فملی/);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('sahamban-broker-holdings-v1'))),saved);
  record('partial market failure hides old total and never mutates holdings');
  assert.equal(errors.length,0,errors.join('\n'));
  assert.ok(marketPaths.length>=9);
  record('mocked browser flow produced no uncaught errors');
  report.totals={cost,lastTradeValue:market,closingValue:closing,pnl:market-cost,lastMinusClosing:market-closing};
  report.status='PASS_MOCKED_BROWSER_ONLY';
  console.log('PASS v122 synthetic quote basis and all-or-nothing portfolio valuation');
  await context.close();
 }catch(error){report.status='FAIL';report.error=String(error.stack||error);throw error;}
 finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/quote-basis-v122.json',JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
