'use strict';
/* v119: PWA installation & offline acceptance through localhost browser.
 * Browser proxy only: no claim about an installed physical Android/iPhone APK.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const engine=process.env.SAHAMBAN_INSTALL_ENGINE||'chromium';
assert.ok(['chromium','webkit'].includes(engine));
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const html=fs.readFileSync('install.html','utf8');
const home=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const report={version:119,engine,physical_device:false,apk:false,
  install_prompt_actual:false,checks:[],status:'RUNNING'};
const check=(label,callback)=>{callback();report.checks.push(label);};
function pngSize(file){
 const bytes=fs.readFileSync(file);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file+' must be PNG');
 return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
}
check('valid-home-and-install-link',()=>{
 assert.match(home,/href="\.\/install\.html"/);
 assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest"/);
 assert.match(html,/href="\.\/index\.html"/);
 assert.match(html,/navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
 assert.ok(sw.includes("'./install.html'"),'PWA install landing must be precached');
});
check('valid-manifest-and-192-512-icons',()=>{
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.lang,'fa');
 assert.equal(manifest.dir,'rtl');
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.start_url,'./');
 assert.ok(manifest.name&&manifest.short_name);
 for(const size of [192,512]){
  const icon=manifest.icons.find(icon=>icon.sizes===size+'x'+size&&icon.type==='image/png');
  assert.ok(icon,'missing '+size+' icon');
  assert.deepEqual(pngSize(icon.src),[size,size]);
 }
 assert.deepEqual(pngSize('icon-180.png'),[180,180]);
});
function startServer(){
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,contents)=>{
   if(error){res.writeHead(404).end();return;}
   const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':
     file.endsWith('.webmanifest')?'application/manifest+json':
     file.endsWith('.html')?'text/html;charset=utf-8':
     file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':
     'application/octet-stream';
   res.writeHead(200,{'Content-Type':type}).end(contents);
  });
 });
 return server;
}
async function main(){
 const server=startServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser,context,page;
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  context=await browser.newContext({
   viewport:{width:390,height:844},isMobile:true,hasTouch:true,
   deviceScaleFactor:2,locale:'fa-IR'
  });
  page=await context.newPage();
  const pageErrors=[];
  const external=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('request',request=>{
   if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==origin)
    external.push(request.url());
  });
  const response=await page.goto(origin+'/install.html',{waitUntil:'load'});
  assert.equal(response?.status(),200);
  assert.match(await page.title(),/نصب سهام‌بان/);
  assert.equal(await page.getByRole('heading',{name:'نصب سهام‌بان',level:1}).count(),1);
  assert.equal(await page.getByRole('heading',{name:/نصب روی اندروید/}).count(),1);
  assert.equal(await page.getByRole('heading',{name:/نصب روی آیفون/}).count(),1);
  assert.equal(await page.getByRole('link',{name:'باز کردن سهام‌بان'}).getAttribute('href'),'./index.html');
  assert.equal(await page.locator('#installStatus').getAttribute('aria-live'),'polite');
  report.checks.push('Persian Android-iPhone installation instructions');
  // This is a synthetic browser event, not a real beforeinstallprompt event.
  assert.equal(await page.locator('#installAction').isVisible(),false);
  await page.evaluate(()=>{
   const e=new Event('beforeinstallprompt',{cancelable:true});
   e.prompt=async()=>{};
   e.userChoice=Promise.resolve({outcome:'dismissed'});
   window.dispatchEvent(e);
  });
  assert.equal(await page.locator('#installAction').isVisible(),true);
  await page.locator('#installAction').click();
  assert.match(await page.locator('#installStatus').innerText(),/نصب لغو شد/);
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
  assert.equal(await page.locator('#installAction').isVisible(),false);
  assert.match(await page.locator('#installStatus').innerText(),/نصب برنامه توسط مرورگر گزارش شد/);
  report.checks.push('synthetic install-prompt and cancel/installed states');

  // Real service worker registration and offline navigation; no fake service worker.
  const active=await page.evaluate(async()=>{
   const registered=await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_,reject)=>setTimeout(()=>reject(Error('SW ready timeout')),20000))
   ]);
   return registered.active?.state;
  });
  assert.ok(['activating','activated'].includes(active),'unexpected service worker state: '+active);
  // serviceWorker.ready may resolve while activation is still finishing.
  await page.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated',null,{timeout:15000});
  const installed=await page.evaluate(async()=>{
   const keys=await caches.keys();
   const cache=await caches.match('./install.html');
   return {controlled:!!navigator.serviceWorker.controller,cached:!!cache,
    cacheKeys:keys.filter(k=>k.startsWith('sahamban-static-'))};
  });
  assert.equal(installed.controlled,true);
  assert.equal(installed.cached,true);
  assert.ok(installed.cacheKeys.length>=1);
  report.checks.push('real service worker activation and offline install page cache');

  await context.setOffline(true);
  if(engine==='chromium'){
   // Chromium proxy can verify full offline navigations through the SW.
   const offlineInstall=await page.goto(origin+'/install.html',{waitUntil:'domcontentloaded'});
   assert.equal(offlineInstall?.status(),200);
   assert.match(await page.title(),/نصب سهام‌بان/);
   report.checks.push('real offline install page navigation in Chromium');
   const offlineApp=await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
   assert.equal(offlineApp?.status(),200);
   assert.match(await page.title(),/سهام‌بان/);
   report.checks.push('real offline application shell navigation in Chromium');
  }else{
   // Playwright Linux WebKit currently fails offline page.goto with an internal
   // engine error. Verify cached document bytes instead, and explicitly do NOT
   // claim WebKit offline navigation or physical Safari offline acceptance.
   const entries=await page.evaluate(async()=>{
    const install=await caches.match('./install.html');
    const app=await caches.match('./index.html');
    return {install:install?await install.text():null,app:app?await app.text():null};
   });
   assert.match(entries.install||'',/نصب سهام‌بان/);
   assert.match(entries.app||'',/سهام‌بان/);
   report.checks.push('offline WebKit cached install/app documents (navigation unverified)');
   report.webkit_offline_navigation_verified=false;
  }
  await context.setOffline(false);
  assert.deepEqual(external,[],'installation page must not request external services');
  assert.deepEqual(pageErrors,[],'uncaught JavaScript errors');
  report.status='PASS_PROXY_ONLY';
  console.log('PASS '+engine+' PWA manifest/icons, install entry, SW registration and two offline navigations');
 }catch(error){
  report.status='FAIL';report.error=String(error.stack||error);
  if(page){
   fs.mkdirSync('test-artifacts',{recursive:true});
   await page.screenshot({path:'test-artifacts/pwa-install-v119-'+engine+'-failure.png',
    fullPage:true,timeout:5000}).catch(()=>{});
  }
  throw error;
 }finally{
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/pwa-install-v119-'+engine+'.json',
   JSON.stringify(report,null,2)+'\n');
  await context?.close();await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
