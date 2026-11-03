'use strict';
// v125: inspect every local first-party reference in the deployed PWA shell.
// Offline source audit runs on PR; optional public HTTPS audit runs after deploy.
// This is not physical installation, service worker execution, or market verification.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {fetchWithRetry}=require('./pwa-asset-retry-v125.cjs');
const root=process.cwd();
const report={version:125,kind:'pwa-asset-integrity',physical_device:false,market_verified:false,checks:[],status:'RUNNING'};
const base=new URL(process.env.SAHAMBAN_PUBLIC_ORIGIN||'https://raminhashemi1.github.io/sahamban/');
assert.equal(base.protocol,'https:');
const publicCheck=process.argv.includes('--public');
function localPath(raw){
 const t=String(raw).trim();
 if(!t||/^(?:https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(t))return null;
 const pathname=decodeURIComponent(t.split(/[?#]/,1)[0]).replace(/^\.\//,'');
 if(!pathname||pathname==='.')return 'index.html';
 if(pathname.startsWith('/')||pathname.split('/').includes('..'))throw Error('Unsafe relative asset path: '+raw);
 return pathname;
}
function referenced(html){
 return [...html.matchAll(/\b(?:src|href)=["']([^"'<>]+)["']/g)].map(m=>m[1]).map(localPath).filter(Boolean);
}
function swCore(sw){
 const match=sw.match(/\bconst CORE=(\[[^;]+\]);/);
 assert.ok(match,'service worker CORE pre-cache list not found');
 const core=vm.runInNewContext(match[1],Object.create(null),{timeout:1000});
 assert.ok(Array.isArray(core));
 return core.map(localPath).filter(Boolean);
}
async function run(){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const install=fs.readFileSync(path.join(root,'install.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 const all=new Set(['index.html','install.html','sw.js','manifest.webmanifest']);
 for(const name of referenced(html))all.add(name);
 for(const name of referenced(install))all.add(name);
 for(const name of swCore(sw))all.add(name);
 for(const icon of manifest.icons){const name=localPath(icon.src);if(name)all.add(name);}
 assert.ok(all.size>=55,'unexpectedly few first-party assets: '+all.size);
 for(const name of all){
  const filename=path.resolve(root,name);
  assert.ok(filename.startsWith(root+path.sep),'asset escaped checkout: '+name);
  assert.ok(fs.existsSync(filename),'missing referenced first-party asset: '+name);
  const stat=fs.statSync(filename);
  assert.ok(stat.isFile()&&stat.size>0,'empty or non-file first-party asset: '+name);
 }
 report.checks.push('All '+all.size+' referenced first-party files exist and are nonempty in checkout');
 // Browser caches should be able to pre-cache all mandatory assets, otherwise installation fails offline.
 const cached=swCore(sw);
 for(const file of cached)assert.ok(all.has(file),'precache entry not in inventory: '+file);
 report.checks.push('All '+cached.length+' mandatory SW pre-cache paths resolve locally');
 if(publicCheck){
  const failures=[];
  // Request across a bounded pool; fail if any link is missing, or returns an HTML fallback for CSS/JS.
  const names=[...all],outcomes=new Array(names.length);
  let next=0;
  async function worker(){
   while(next<names.length){
    const i=next++,name=names[i],url=new URL(name,base);
    assert.equal(url.origin,base.origin,'cross-origin request prohibited');
    try{
     const {response,attempts}=await fetchWithRetry(
      fetch,url,()=>({cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(20000)}),
      {maxAttempts:2,delayMs:750}
     );
     const type=(response.headers.get('content-type')||'').toLowerCase();
     const bytes=Buffer.from(await response.arrayBuffer());
     if(new URL(response.url).origin!==base.origin)throw Error('cross-origin redirect');
     if(bytes.length===0)throw Error('empty body');
     if(name.endsWith('.js')&&/(?:text\/html|application\/html)/.test(type))throw Error('JavaScript served as HTML');
     if(name.endsWith('.css')&&/(?:text\/html|application\/html)/.test(type))throw Error('CSS served as HTML');
     outcomes[i]={file:name,status:'PASS',bytes:bytes.length,attempts};
    }catch(e){failures.push(name+': '+e.message);outcomes[i]={file:name,status:'FAIL',error:e.message};}
   }
  }
  await Promise.all(Array.from({length:Math.min(6,names.length)},worker));
  report.public_assets=outcomes;
  assert.deepEqual(failures,[], 'Public assets missing or invalid: '+failures.join('; '));
  report.checks.push('All '+names.length+' first-party assets load via public HTTPS');
 }
 report.status=publicCheck?'PASS_PUBLIC_REFERENCE_ASSETS':'PASS_SOURCE_REFERENCE_ASSETS';
 console.log('PASS v125 '+report.status+'; '+all.size+' first-party assets; no device or live market certification');
}
run().catch(e=>{report.status='FAIL';report.error=String(e.stack||e);console.error(e);process.exitCode=1;}).finally(()=>{
 fs.mkdirSync('test-artifacts',{recursive:true});
 fs.writeFileSync('test-artifacts/pwa-asset-integrity-v125.json',JSON.stringify(report,null,2)+'\n');
});
