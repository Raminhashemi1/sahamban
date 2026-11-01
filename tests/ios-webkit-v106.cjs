'use strict';
// WebKit mobile-browser preflight only. This does NOT replace physical iOS,
// VoiceOver, low-memory Android or live-market acceptance tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {webkit, devices} = require('playwright');

const artifactDir = path.resolve('test-artifacts');
fs.mkdirSync(artifactDir, {recursive:true});
const results = [];
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const relative = pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
  const file = path.resolve(process.cwd(),relative);
  if (!file.startsWith(process.cwd()+path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    const mime = file.endsWith('.js')?'text/javascript'
      :file.endsWith('.css')?'text/css'
      :file.endsWith('.html')?'text/html;charset=utf-8'
      :file.endsWith('.webmanifest')?'application/manifest+json'
      :file.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime});res.end(data);
  });
});

async function validate(browser,profile,base){
  const context=await browser.newContext({...devices[profile],locale:'fa-IR',timezoneId:'Asia/Tehran'});
  const page=await context.newPage();
  const result={profile,engine:'Playwright WebKit on Linux',physical_device:false,checks:[],measurements_ms:{}};
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    let start=performance.now();
    await page.goto(base+'/index.html',{waitUntil:'load'});
    await page.locator('.sb105-skip-link').waitFor();
    result.measurements_ms.navigation_load=Math.round(performance.now()-start);
    result.checks.push('initial page load');

    await page.locator('.sb105-skip-link').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'sb105MainContent');
    result.checks.push('keyboard skip to main content');

    // The portfolio section starts behind the module launcher and a prices tab.
    // Open it through the same navigation path as the established Chromium suite.
    await page.evaluate(()=>{location.hash='livePortfolioSection';});
    await page.waitForFunction(()=>document.querySelector('#sb88-tab-overview')?.getAttribute('aria-selected')==='true');
    await page.locator('#sb88-tab-prices').click();
    await page.waitForFunction(()=>document.querySelector('#sb88-tab-prices')?.getAttribute('aria-selected')==='true');
    const root=page.locator('#livePortfolioTable');
    assert.equal(await root.isVisible(),true);
    assert.equal((await root.getAttribute('class')).includes('sb99-card-mode'),true);
    assert.equal(await page.locator('#livePortfolioRows').count(),1);
    await page.evaluate(()=>{
      const source=document.getElementById('livePortfolioRows');
      const columns=document.querySelectorAll('#livePortfolioTable .portfolio-v61-table thead th').length;
      if(columns!==15)throw Error('Expected 15 portfolio table columns; got '+columns);
      const fragment=document.createDocumentFragment();
      for(let i=0;i<100;i++){
        const tr=document.createElement('tr');
        for(let j=0;j<columns;j++){
          const td=document.createElement('td');
          td.textContent=j===0?'نماد'+i:'نمونه '+j;
          tr.append(td);
        }
        fragment.append(tr);
      }
      source.replaceChildren(fragment);
    });
    start=performance.now();
    await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===100);
    result.measurements_ms.render_100_synthetic_cards=Math.round(performance.now()-start);
    assert.equal(await page.locator('#livePortfolioRows tr').count(),100);
    result.checks.push('100 synthetic rows rendered as mobile cards, table preserved');

    const input=page.locator('#sb104CardSearch');
    await input.fill('نماد۹۹');
    await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card:not([hidden])').length===1);
    assert.match(await page.locator('#sb104CardSearchStatus').innerText(),/۱ نماد|1 نماد/);
    await page.locator('#livePortfolioTable .sb99-card:not([hidden]) summary').click();
    assert.equal(await page.locator('#livePortfolioTable .sb99-card:not([hidden]) dl dt').count(),15);
    await input.press('Escape');
    assert.equal(await input.inputValue(),'');
    assert.equal(await page.locator('#livePortfolioTable .sb99-card:not([hidden])').count(),100);
    result.checks.push('Persian-digit symbol filtering, expanded details, Escape reset');

    start=performance.now();
    await root.getByRole('button',{name:'جدول',exact:true}).click();
    assert.equal(await page.locator('#livePortfolioTable .sb99-card').count(),0);
    assert.equal(await page.locator('#livePortfolioRows tr').count(),100);
    await root.getByRole('button',{name:'کارت‌های دارایی',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===100);
    result.measurements_ms.table_cards_roundtrip=Math.round(performance.now()-start);
    result.checks.push('table/card round-trip does not delete holdings rows');

    assert.deepEqual(errors,[], 'Unexpected WebKit page errors');
    result.status='pass';
    console.log('PASS '+profile+': '+result.checks.join(' | '));
  }catch(err){
    result.status='fail';
    result.error=String(err?.stack||err);
    result.page_errors=errors;
    await page.screenshot({path:path.join(artifactDir,'webkit-'+profile.replace(/[^a-zA-Z0-9]/g,'-')+'.png'),fullPage:true}).catch(()=>{});
    throw err;
  }finally{
    results.push(result);
    await context.close();
  }
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await webkit.launch({headless:true});
    const base='http://127.0.0.1:'+server.address().port;
    for(const device of ['iPhone 13','iPhone SE'])await validate(browser,device,base);
  }finally{
    fs.writeFileSync(path.join(artifactDir,'webkit-v106-report.json'),JSON.stringify({
      note:'Simulated WebKit on Linux, not actual iOS/VoiceOver/field performance.',
      generated_at:new Date().toISOString(),results
    },null,2)+'\n');
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
