'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {rank,quality}=require('../candidate-ranking-v133.js');
const make=(symbol,score,median=1000000,risk=8,code='ENTRY_CANDIDATE',count=20)=>({ok:true,symbol,report:{code,score,last:1000,stop:1000*(1-risk/100)},quote:{historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',history:Array.from({length:100},(_,i)=>({date:String(i),close:1000,tradedValue:i>=100-count?median:null}))}});
test('requires verified traded-value coverage, candidate status and structural stop',()=>{
 assert.match(quality(make('کم‌داده',90,1e6,8,'ENTRY_CANDIDATE',14)).reason,/پوشش کافی/);
 assert.equal(quality(make('کافی',90,1e6,8,'ENTRY_CANDIDATE',15)).eligible,true);
 assert.equal(quality(make('صبر',100,1e6,8,'WAIT')).eligible,false);
 const noStop=make('بدون حد',90);noStop.report.stop=1500;assert.equal(quality(noStop).eligible,false);
 assert.equal(quality({ok:false,symbol:'خطا'}).eligible,false);
});
test('ordering uses technical score then lower stop distance then median traded value; no historical performance input',()=>{
 const rows=[make('ب',90,20e6,12),make('الف',95,1e6,17),make('د',90,80e6,7),make('ج',90,10e6,7),make('ناقص',99,1e6,5,'ENTRY_CANDIDATE',3)];
 const output=rank(rows);
 assert.deepEqual(output.ranked.map(x=>x.symbol),['الف','د','ج','ب']);
 assert.equal(output.excluded.length,1);assert.equal(output.ranked[0].rank,1);
 rows[0].historical={meanNetReturnPct:9000};assert.deepEqual(rank(rows).ranked.map(x=>x.symbol),['الف','د','ج','ب']);
});
test('missing market values does not fabricate eligible ranks and input size is bounded',()=>{
 const rows=Array.from({length:5},(_,i)=>make('نماد'+i,100,1e6,5,'ENTRY_CANDIDATE',0));
 const r=rank(rows);assert.equal(r.ranked.length,0);assert.equal(r.excluded.length,5);
 assert.throws(()=>rank(Array(41).fill(rows[0])),/۴۰/);
});

test('unattested or missing historical price basis can never receive an entry rank',()=>{
 const x=make('مبهم',99);x.quote.historyPriceBasisEvidence='NOT_ESTABLISHED';
 const missing=make('بدون-برچسب',99);delete missing.quote.historyPriceBasisEvidence;
 for(const item of [x,missing]){const out=rank([item]);assert.equal(out.ranked.length,0);assert.match(out.excluded[0].reason,/مبنای تعدیل/);}
});
