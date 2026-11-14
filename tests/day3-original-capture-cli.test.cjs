'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const CLI=path.resolve(__dirname,'../scripts/review-day3-original-capture.cjs');
const insCode='46348559193224090',time='2026-11-10T09:47:49.485Z';
function localFixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'day3-review-'));
 const daily=Buffer.from(JSON.stringify({closingPriceDaily:[
  {insCode:insCode,dEven:20261109,pClosing:4670,zTotTran:0},
  {insCode:insCode,dEven:20261108,pClosing:4540,zTotTran:99}]}));
 const adjustments=Buffer.from(JSON.stringify({priceAdjust:[
  {insCode:insCode,dEven:20260803,pClosing:1000,pClosingNotAdjusted:1100}]}));
 const prefix='tsetmc-'+insCode+'-'+time.replace(/[:.]/g,'-');
 const meta=(name,bytes,rowCount)=>({
  filename:prefix+'-'+name+'.json',
  url:'https://cdn.tsetmc.com/api/ClosingPrice/'+
   (name==='daily'?'GetClosingPriceDailyList/'+insCode+'/500':'GetPriceAdjustList/'+insCode),
  sizeBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),
  rowCount,contentType:'application/json'});
 const manifest={status:'CAPTURED_FOR_MANUAL_REVIEW',insCode,collectedAt:time,
  host:'https://cdn.tsetmc.com',captureScope:'BOUNDED_DAILY_TOP_500',dailyTop:500,
  files:{daily:meta('daily',daily,2),adjustments:meta('adjustments',adjustments,1)},
  sourceAuthenticated:false,priceBasisVerified:false,capitalActionsVerified:false,
  entryEligible:false,tradingSignalsEnabled:false};
 for(const [name,bytes] of [['manifest',Buffer.from(JSON.stringify(manifest))],
  ['daily',daily],['adjustments',adjustments]])fs.writeFileSync(path.join(dir,name+'.json'),bytes);
 return {dir,args:['manifest.json','daily.json','adjustments.json'].map(name=>path.join(dir,name)).concat('20261110')};
}
function call(args){return spawnSync(process.execPath,[CLI,...args],{encoding:'utf8'});}
test('CLI reads original-style files with strict partial-only status',t=>{
 const f=localFixture();t.after(()=>fs.rmSync(f.dir,{recursive:true,force:true}));
 const run=call(f.args);
 assert.equal(run.status,0,run.stderr);
 const result=JSON.parse(run.stdout);
 assert.equal(result.status,'REAL_DATA_REVIEW_PARTIAL');
 assert.equal(result.latestDailyDate,'20261109');
 assert.equal(result.expectedDatePublished,false);
 assert.equal(result.fullHistoryCaptured,false);
 assert.equal(result.day3FinalAccepted,false);
 assert.equal(result.tradingSignalsEnabled,false);
 assert.equal(result.noTradeRows,1);
 assert.equal(result.unknownTradeCountRows,0);
 assert.equal(JSON.stringify(result).includes(f.dir),false);
});
test('CLI rejects corrupted originals and returns nonzero',t=>{
 const f=localFixture();t.after(()=>fs.rmSync(f.dir,{recursive:true,force:true}));
 fs.appendFileSync(path.join(f.dir,'daily.json'),' ');
 const run=call(f.args);
 assert.equal(run.status,2);
 assert.equal(JSON.parse(run.stdout).captureStatus,'CAPTURE_NOT_VERIFIED');
});
test('CLI fails closed on missing files and prints no path',()=>{
 const run=call(['/private/secret-manifest.json','daily.json','adjustments.json','20261110']);
 assert.equal(run.status,2);
 assert.match(run.stderr,/EVIDENCE_REVIEW_FAILED/);
 assert.doesNotMatch(run.stderr,/private\/secret-manifest/);
});


test('CLI accepts 1MiB+ full-available-history artifact but keeps acceptance false',t=>{
 const f=localFixture();t.after(()=>fs.rmSync(f.dir,{recursive:true,force:true}));
 const manifestPath=path.join(f.dir,'manifest.json'),dailyPath=path.join(f.dir,'daily.json');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const rows=Array.from({length:8000},(_,i)=>{
  const day=new Date(Date.UTC(2001,0,1+i));
  return {insCode,dEven:Number(day.toISOString().slice(0,10).replace(/-/g,'')),
   pClosing:1000+i,zTotTran:1,padding:'x'.repeat(160)};
 });
 const daily=Buffer.from(JSON.stringify({closingPriceDaily:rows}));
 assert.ok(daily.length>1024*1024&&daily.length<8*1024*1024);
 manifest.captureScope='RAW_TOP_0_ALL_AVAILABLE_REQUEST_NOT_INDEPENDENTLY_FULL_HISTORY';
 manifest.dailyTop=0;manifest.requestedAllAvailableHistory=true;manifest.fullHistoryVerified=false;
 manifest.files.daily.url=manifest.files.daily.url.replace(/\/500$/,'/0');
 manifest.files.daily.sizeBytes=daily.length;manifest.files.daily.rowCount=rows.length;
 manifest.files.daily.sha256=createHash('sha256').update(daily).digest('hex');
 fs.writeFileSync(dailyPath,daily);fs.writeFileSync(manifestPath,JSON.stringify(manifest));
 const result=call(f.args);
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.capturedDailyRows,8000);
 assert.equal(report.fullHistoryCaptured,false);
 assert.equal(report.day3FinalAccepted,false);
 assert.equal(report.sourceAuthenticated,false);
});
