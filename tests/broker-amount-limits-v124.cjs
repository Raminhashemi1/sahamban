'use strict';
// v124: exercise real browser CSV import with safe-amount boundaries.
// Synthetic inputs only; no market requests or personal holdings.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const report={version:124,synthetic:true,physical_device:false,checks:[],status:'RUNNING'};
function checked(label){report.checks.push(label);}
async function main(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  const full=path.resolve(root,decodeURIComponent(relative));
  if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(full,(err,buf)=>{
   if(err){res.writeHead(404).end();return;}
   res.writeHead(200,{'content-type':full.endsWith('.js')?'text/javascript':full.endsWith('.css')?'text/css':'text/html;charset=utf-8'}).end(buf);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({serviceWorkers:'block',locale:'fa-IR'});
  const page=await ctx.newPage();
  const errors=[],marketRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',req=>{if(req.url().includes('tsetmc.com'))marketRequests.push(req.url());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#brokerImportSection',{waitUntil:'load'});
  async function preview(rows){
   const csv='نماد,تعداد,میانگین خرید,قیمت پایانی\n'+rows.join('\n');
   await page.locator('#brokerFile').setInputFiles({name:'synthetic-safe-amount.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
   await page.locator('#brokerPreview').click();
  }
  const saved=()=>page.evaluate(()=>localStorage.getItem('sahamban-broker-holdings-v1'));
  await preview(['فولاد,2,"1,000","1,200"']);
  assert.equal(await page.locator('#brokerRows tr').count(),1);
  await page.locator('#brokerApply').click();
  const initial=await saved();
  const obj=JSON.parse(initial);
  assert.deepEqual(obj.holdings,[{symbol:'فولاد',quantity:2,buy:1000,current:1200}]);
  checked('quoted CSV thousand separators preserve correct monetary values');
  await preview(['آزمایش,1,9007199254740992,1500']);
  assert.match(await page.locator('#brokerRows tr').innerText(),/خارج از محدوده/);
  assert.equal(await page.locator('#brokerApply').isDisabled(),true);
  assert.equal(await saved(),initial);
  checked('single unsafe cost price excluded without overwriting saved holdings');
  await preview(['آزمایش,10000000,1000000000000,1000000000000']);
  assert.match(await page.locator('#brokerRows tr').innerText(),/خارج از محدوده/);
  assert.equal(await page.locator('#brokerApply').isDisabled(),true);
  assert.equal(await saved(),initial);
  checked('unsafe quantity multiplied by price excluded before persistence');
  await preview(['اول,1,5000000000000000,5000000000000000','دوم,1,5000000000000000,5000000000000000']);
  assert.match(await page.locator('#brokerStatus').innerText(),/جمع ارزش یا بهای خرید سبد خارج از محدوده/);
  assert.equal(await page.locator('#brokerReview').isVisible(),false);
  assert.equal(await saved(),initial);
  checked('two individually safe positions with unsafe aggregate are rejected atomically');
  assert.deepEqual(errors,[]);
  assert.equal(marketRequests.length,0);
  checked('no uncaught page errors or market requests');
  await ctx.close();
  report.status='PASS_BROWSER_PROXY_ONLY';
  console.log('PASS v124 broker CSV input safe-amount boundaries');
 }catch(e){report.status='FAIL';report.error=String(e.stack||e);throw e;}
 finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/broker-amount-limits-v124.json',JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
