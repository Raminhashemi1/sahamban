#!/usr/bin/env node
'use strict';
/* Explicit opt-in network CLI: node scripts/collect-tsetmc-evidence-v162.cjs <insCode> <outDir>
 * No historical prices are rewritten. No data leaves the user-chosen directory.
 * Do not supply passwords, tokens, or arbitrary URLs. */
const fs=require('node:fs/promises');
const path=require('node:path');
const {captureTsetmcEvidence}=require('../tsetmc-live-evidence-v162.cjs');
async function run(argv=process.argv.slice(2),{collector=captureTsetmcEvidence,fsApi=fs}={}){
 if(argv.length!==2)throw Error('Usage: node scripts/collect-tsetmc-evidence-v162.cjs <8-25-digit insCode> <output-directory>');
 const [code,outDir]=argv;
 if(!/^\d{8,25}$/.test(code)||!/[^0]/.test(code))throw Error('Invalid instrument code');
 if(!outDir||outDir==='/'||outDir==='.')throw Error('Choose a dedicated output directory');
 const result=await collector(code);
 if(result.status!=='CAPTURED_FOR_MANUAL_REVIEW')throw Error('Capture unavailable: '+result.reason);
 const dir=path.resolve(outDir);
 await fsApi.mkdir(dir,{recursive:true,mode:0o700});
 const prefix='tsetmc-'+code+'-'+result.collectedAt.replace(/[:.]/g,'-');
 const files={};
 for(const kind of ['daily','adjustments']){
  const filename=prefix+'-'+kind+'.json',item=result.responses[kind];
  await fsApi.writeFile(path.join(dir,filename),item.rawBodyUtf8,{flag:'wx',mode:0o600});
  files[kind]={filename,url:item.url,sha256:item.sha256,
   sizeBytes:item.sizeBytes,rowCount:item.rowCount,contentType:item.contentType};
 }
 const manifest={
  status:'CAPTURED_FOR_MANUAL_REVIEW',insCode:code,collectedAt:result.collectedAt,
  host:result.host,files,
  sourceAuthenticated:false,priceBasisVerified:false,capitalActionsVerified:false,
  entryEligible:false,tradingSignalsEnabled:false,
  note:result.note};
 const manifestFile=prefix+'-manifest.json';
 await fsApi.writeFile(path.join(dir,manifestFile),JSON.stringify(manifest,null,2)+'\n',
  {flag:'wx',mode:0o600});
 return {manifestFile,dir,manifest};
}
if(require.main===module){
 run().then(x=>{process.stdout.write(JSON.stringify({status:x.manifest.status,
  directory:x.dir,manifest:x.manifestFile})+'\n');}).catch(e=>{
  process.stderr.write(String(e?.message||e)+'\n');process.exitCode=1;
 });
}
module.exports={run};
