'use strict';
/* v118: automated WCAG rules inspection, synthetic data only.
 * Linux browsers are not physical Android/iPhone or native TalkBack/VoiceOver.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const axe=require('axe-core');
const engine=process.env.SAHAMBAN_A11Y_ENGINE||'chromium';
assert.ok(['chromium','webkit'].includes(engine));
const report={version:118,engine,physical_screen_reader:false,real_device:false,
  locale:'fa-IR',scope:'livePortfolioSection',audit:'WCAG A/AA through 2.1',
  states:[],status:'RUNNING'};
async function audit(page,state){
 const result=await page.evaluate(async()=>
  window.axe.run(document.getElementById('livePortfolioSection'),{
   runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
  }));
 const violations=result.violations.map(v=>({
  id:v.id,impact:v.impact,description:v.help,
  nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,350)}))
 }));
 report.states.push({state,violations,passes:result.passes.length,incomplete:result.incomplete.length});
 if(violations.length){
  console.error('A11Y_V118 '+engine+' '+state+' '+JSON.stringify(violations,null,2));
 }
 assert.deepEqual(violations,[],'WCAG 2.1 A/AA violations in '+state);
}
function server(){
 const root=process.cwd();
 const s=http.createServer((req,res)=>{
  const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
  const full=path.resolve(root,requested);
  if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(full,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   const mime=full.endsWith('.js')?'text/javascript':full.endsWith('.css')?'text/css':
    full.endsWith('.html')?'text/html;charset=utf-8':full.endsWith('.svg')?'image/svg+xml':
    'application/octet-stream';
   res.writeHead(200,{'Content-Type':mime}).end(data);
  });
 });
 return s;
}
async function main(){
 const s=server();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 let browser,context,page;
 try{
  browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  context=await browser.newContext({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'fa-IR',serviceWorkers:'block'});
  page=await context.newPage();
  await page.goto('http://127.0.0.1:'+s.address().port+'/index.html#livePortfolioTable',
   {waitUntil:'load'});
  await page.addScriptTag({content:axe.source});
  assert.equal(await page.locator('#sb88-tab-prices').getAttribute('aria-selected'),'true');
  await audit(page,'empty-prices-tab');
  await page.locator('#livePortfolioRows').evaluate(body=>{
   const frag=document.createDocumentFragment();
   for(let i=0;i<19;i++){
    const tr=document.createElement('tr');
    for(let j=0;j<15;j++){
     const td=document.createElement('td');
     td.textContent=j===0?'نماد نمونه '+(i+1):'مقدار ساختگی '+i+'-'+j;
     tr.append(td);
    }
    frag.append(tr);
   }
   body.replaceChildren(frag);
  });
  await page.locator('#livePortfolioTable').evaluate(el=>{el.hidden=false;});
  await page.waitForFunction(()=>document.querySelectorAll('#livePortfolioTable .sb99-card').length===19);
  await audit(page,'holdings-cards-19');
  const details=page.locator('#livePortfolioTable .sb99-more');
  await details.first().locator('summary').click();
  await audit(page,'card-11-details-open');
  await details.first().locator('summary').click();
  await page.locator('#sb104CardSearch').fill('نماد نمونه ۱۹');
  await audit(page,'cards-filtered-single-symbol');
  await page.locator('#sb104CardSearch').press('Escape');
  await page.locator('#livePortfolioTable .sb99-mode').last().click();
  await page.locator('#livePortfolioTable .sb98-view-button').first().click();
  await audit(page,'holdings-table-simple');
  await page.locator('#livePortfolioTable .sb98-view-button').last().click();
  await audit(page,'holdings-table-all-15');
  report.status='PASS_PROXY_ONLY';
  console.log('PASS '+engine+' WCAG a11y audit on 6 states; native assistive-technology testing remains unverified');
 }catch(e){
  report.status='FAIL';report.error=String(e.stack||e);
  if(page){
   await fs.promises.mkdir('test-artifacts',{recursive:true});
   await page.screenshot({path:'test-artifacts/a11y-v118-'+engine+'-failure.png',
    fullPage:true,timeout:5000}).catch(()=>{});
  }
  throw e;
 }finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/a11y-v118-'+engine+'.json',
   JSON.stringify(report,null,2)+'\n');
  await context?.close();await browser?.close();
  await new Promise(resolve=>s.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
