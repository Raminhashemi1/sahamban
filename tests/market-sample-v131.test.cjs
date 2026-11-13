'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const audit=require('../signal-audit-v131.js');
const market=require('../market-sample-v131.js');
globalThis.SahambanTechnicalV50=require('../technical-indicators-v50.js');
globalThis.SahambanDecisionV129=require('../decision-support-v129.js');
globalThis.SahambanDiscoveryV130=require('../external-screener-v130.js');
globalThis.SahambanSignalAuditV131=audit;
function series(n=150){const end=new Date(Date.UTC(2026,10,3));return Array.from({length:n},(_,i)=>{const d=new Date(end);d.setUTCDate(d.getUTCDate()-(n-i-1));return {date:d.toISOString().slice(0,10).replaceAll('-',''),close:1000+3*i+Math.sin(i*1.7)*12};});}
test('historical events are strictly post-signal, do not overlap, and do not leak future closes',()=>{
 const original=globalThis.SahambanDecisionV129;
 const seen=[];
 globalThis.SahambanDecisionV129={analyze(q,args){const last=q.history.at(-1);assert.equal(last.date,args.today);seen.push(q.history.length);return {code:q.history.length===61||q.history.length===64||q.history.length===83?'ENTRY_CANDIDATE':'WAIT',score:90};}};
 try{const h=series(),result=audit.audit({symbol:'ساختگی',history:h,historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED'});assert.equal(result.count,2);assert.deepEqual(seen.slice(0,3),[60,61,72]);assert.equal(result.events[0].signalDate,h[60].date);assert.equal(result.events[0].entryDate,h[61].date);assert.equal(result.events[0].exitDate,h[71].date);assert.equal(result.events[1].signalDate,h[82].date);assert.ok(result.events[1].entryDate>result.events[0].exitDate);assert.equal(result.events[0].returnPct,(h[71].close/h[61].close-1)*100);assert.ok(!result.adequateSample);}finally{globalThis.SahambanDecisionV129=original;}
});
test('audit rejects too-short, invalid and nonchronological histories',()=>{
 assert.throws(()=>audit.audit({symbol:'نماد',history:series(90),historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED'}),/۱۱۰/);
 const h=series();h[8].date=h[7].date;assert.throws(()=>audit.audit({symbol:'نماد',history:h,historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED'}),/تاریخ/);
 const k=series();k[20].close=0;assert.throws(()=>audit.audit({symbol:'نماد',history:k,historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED'}),/قیمت/);
});
test('market sampling picks at most six distinct exact instruments; duplicates are not repeated',()=>{
 const feed={tradeTop:[{instrument:{lVal18AFC:'فولاد',insCode:'123456789012'}},{instrument:{lVal18AFC:'فولاد',insCode:'123456789012'}},...Array.from({length:15},(_,i)=>({instrument:{lVal18AFC:'نماد'+i,insCode:String(300000000000+i)}}))]};
 assert.equal(market.candidates(feed).length,6);assert.equal(market.candidates(feed)[0].symbol,'فولاد');
 assert.throws(()=>market.candidates({tradeTop:[]}),/یافت نشد/);
 assert.throws(()=>market.candidates(feed,{limit:10}),/حداکثر/);
});
test('opt-in market sample makes one top-list request and no more than six history requests; rejects stale data',async()=>{
 const h=series().map(x=>({dEven:Number(x.date),pClosing:x.close}));
 let urls=[];const feed={tradeTop:Array.from({length:19},(_,i)=>({instrument:{lVal18AFC:'نماد'+i,insCode:String(300000000000+i)}}))};
 const fetcher=async url=>{urls.push(url);return {ok:true,headers:{get:()=> 'application/json'},json:async()=>url.includes('GetTradeTop')?feed:{closingPriceDaily:h}};};
 const done=[];const result=await market.sample({fetcher,today:'20261103',onProgress:(a,b)=>done.push([a,b])});
 assert.equal(result.poolSize,19);assert.equal(result.sampled,6);assert.equal(urls.length,7);assert.equal(result.results.length,6);assert.ok(result.results.every(x=>x.ok));assert.deepEqual(done.at(-1),[6,6]);assert.equal(globalThis.localStorage,undefined);
 urls=[];const stale=await market.sample({fetcher:async url=>{urls.push(url);return {ok:true,headers:{get:()=> 'application/json'},json:async()=>url.includes('GetTradeTop')?feed:{closingPriceDaily:h.map(x=>({...x,dEven:x.dEven-10000}))}};},today:'20261103',limit:2});
 assert.equal(urls.length,3);assert.ok(stale.results.every(x=>!x.ok));assert.match(stale.results[0].error,/قدیمی/);
});

test('long-listed stock histories above 2500 records still yield last 250 verified observations',()=>{
 const end=Date.UTC(2026,10,3);
 const rows=Array.from({length:3500},(_,i)=>({dEven:Number(new Date(end-(3499-i)*86400000).toISOString().slice(0,10).replaceAll('-','')),pClosing:1000+i}));
 const quote=globalThis.SahambanDiscoveryV130.parseHistory({closingPriceDaily:rows},{symbol:'قدیمی',insCode:'123456789012'});
 assert.equal(quote.history.length,250);assert.equal(quote.history.at(-1).date,'20261103');assert.equal(quote.history.at(0).close,4250);
});
