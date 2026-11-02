'use strict';
// v128 guide acceptance: synthetic browser context only, never real holdings.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
async function main(){
 const root=process.cwd(),server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html;charset=utf-8'}).end(data));
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  const source=fs.readFileSync('learning-v128.js','utf8');
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest|sendBeacon/);
  const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
  assert.match(html,/lang="fa"/);
  assert.match(html,/learning-v128.js\?v=128\.0/);
  assert.match(sw,/learning-v128.js\?v=128\.0/);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:790},locale:'fa-IR',serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/index.html',{waitUntil:'load'});
  const storageBefore=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  const link=page.locator('#sahambanModulesV87 a[href="#educationSectionV128"]');
  assert.equal(await link.count(),1);
  await link.click();
  await page.waitForFunction(()=>document.getElementById('educationSectionV128')&&!document.getElementById('educationSectionV128').hidden);
  const tutorials=page.locator('#sahambanLearningChaptersV128 details');
  assert.equal(await tutorials.count(),12);
  assert.equal(await page.locator('#sahambanLearningChaptersV128 details summary').count(),12);
  await page.locator('#sahambanLearningIndexV128 button').nth(2).click();
  assert.equal(await tutorials.nth(2).getAttribute('open'),'');
  assert.equal(await tutorials.nth(1).getAttribute('open'),null);
  await page.locator('#sb128ExpandAll').click();
  assert.equal(await page.locator('#sahambanLearningChaptersV128 details[open]').count(),12);
  await page.locator('#sb128CollapseAll').click();
  assert.equal(await page.locator('#sahambanLearningChaptersV128 details[open]').count(),0);
  await tutorials.nth(2).locator('summary').click();
  await tutorials.nth(2).locator('a').click();
  await page.waitForFunction(()=>document.getElementById('livePortfolioSection')?.hidden===false);
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),storageBefore);
  assert.deepEqual(errors,[]);
  console.log('PASS Persian tutorial: twelve chapters, keyboardable navigation, links, no holdings access');
  await context.close();
 }finally{await browser?.close();await new Promise(ok=>server.close(ok));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
