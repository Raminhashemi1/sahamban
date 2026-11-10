'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../scripts/collect-tsetmc-evidence-v162.cjs');
test('CLI writes two fixed raw files and the manifest only after successful capture',async()=>{
 const writes=[],dirs=[];
 const fakeFs={mkdir:async(p,opts)=>dirs.push({p,opts}),writeFile:async(p,data,opts)=>writes.push({p,data,opts})};
 const collector=async()=>({status:'CAPTURED_FOR_MANUAL_REVIEW',collectedAt:'2026-11-09T12:00:00.000Z',host:'https://cdn.tsetmc.com',
  responses:{daily:{rawBodyUtf8:'{"closingPriceDaily":[]}',sizeBytes:24,sha256:'a'.repeat(64),rowCount:0,url:'https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/123456789012345/0',contentType:'application/json'},
   adjustments:{rawBodyUtf8:'{"priceAdjust":[]}',sizeBytes:18,sha256:'b'.repeat(64),rowCount:0,url:'https://cdn.tsetmc.com/api/ClosingPrice/GetPriceAdjustList/123456789012345',contentType:'application/json'}},
  note:'review-only'});
 const r=await run(['123456789012345','/tmp/test-tsetmc-collection'],{collector,fsApi:fakeFs});
 assert.equal(writes.length,3);
 assert.equal(dirs.length,1);
 assert.ok(writes.every(x=>x.opts.flag==='wx'&&x.opts.mode===0o600));
 assert.equal(r.manifest.entryEligible,false);
 assert.equal(r.manifest.sourceAuthenticated,false);
 assert.equal(r.manifest.files.daily.sha256,'a'.repeat(64));
 assert.ok(writes[2].p.endsWith('-manifest.json'));
 assert.equal(JSON.parse(writes[2].data).files.adjustments.sha256,'b'.repeat(64));
});
test('CLI refuses malformed codes and never writes files after fetch failure',async()=>{
 let writes=0,calls=0;
 const fsApi={mkdir:async()=>writes++,writeFile:async()=>writes++};
 const collector=async()=>{calls++;return {status:'COLLECTION_INSUFFICIENT',reason:'NETWORK_OR_STREAM_ERROR'}};
 await assert.rejects(run(['../../123','/tmp/x'],{collector,fsApi}),/Invalid instrument code/);
 assert.equal(calls,0);
 await assert.rejects(run(['123456789012345','/tmp/x'],{collector,fsApi}),/Capture unavailable/);
 assert.equal(writes,0);
});
