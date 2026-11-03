'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
globalThis.SahambanTechnicalV50=require('../technical-indicators-v50.js');
globalThis.SahambanDecisionV129=require('../decision-support-v129.js');
const api=require('../external-screener-v130.js');
const today='20261103';
const history=Array.from({length:100},(_,i)=>{const d=new Date(Date.UTC(2026,10,3));d.setUTCDate(d.getUTCDate()-(99-i));return {dEven:Number(d.toISOString().slice(0,10).replaceAll('-','')),pClosing:1000+i*2+Math.sin(i)*14};});
const search=(symbol,code='123456789012')=>({instrumentSearch:[{lVal18AFC:symbol,insCode:code}]});
function stub({ambiguous=false,short=false,stale=false}={}){
 const calls=[];
 const fetcher=async url=>{
  calls.push(url);
  const isSearch=url.includes('GetInstrumentSearch');
  const sym=decodeURIComponent(url.split('/').at(-1));
  const body=isSearch?(ambiguous?{instrumentSearch:[{lVal18AFC:sym,insCode:'123456789012'},{lVal18AFC:sym,insCode:'999999999999'}]}:search(sym)):{closingPriceDaily:(short?history.slice(-12):history).map(x=>stale?{...x,dEven:Number(String(x.dEven).replace(/^2026/, '2025'))}:x)};
  return {ok:true,headers:{get:()=> 'application/json'},json:async()=>body};
 };
 return {fetcher,calls};
}
test('symbols are trimmed, normalized and limited without contacting the market',()=>{
 assert.deepEqual(api.parseNames('فولاد، شستا').map(x=>x.symbol),['فولاد','شستا']);
 assert.throws(()=>api.parseNames('شستا،شستا'),/تکراری/);
 assert.throws(()=>api.parseNames(Array(9).fill('نماد').map((x,i)=>x+i).join(',')),/۸/);
 assert.throws(()=>api.parseNames(''),/۱ تا ۸/);
});
test('unique exact identity required, no arbitrary duplicate selection',()=>{
 assert.deepEqual(api.parseExactIdentity(search('فولاد'),'فولاد'),{insCode:'123456789012',symbol:'فولاد'});
 assert.throws(()=>api.parseExactIdentity({instrumentSearch:[{lVal18AFC:'فولاد',insCode:'123456789012'},{lVal18AFC:'فولاد',insCode:'987654321987'}]},'فولاد'),/چند شناسه/);
});
test('historical-only screening returns bounded result and never touches local holdings',async()=>{
 const {fetcher,calls}=stub();
 const result=await api.screen('فولاد،شستا',{fetcher,today});
 assert.equal(result.length,2);
 assert.ok(result.every(r=>r.ok));
 assert.ok(result.every(r=>r.report.score>=0&&r.report.score<=100));
 assert.equal(calls.length,4);assert.ok(calls.every(x=>x.startsWith('https://cdn.tsetmc.com/api/')));
 assert.equal(globalThis.localStorage,undefined);
});
test('ambiguous symbols, short and stale histories produce explicit exclusions',async()=>{
 for(const [opts,pattern] of [[{ambiguous:true},/چند شناسه/],[{short:true},/۶۰/],[{stale:true},/قدیمی/]]){
  const {fetcher}=stub(opts),out=await api.screen('فولاد',{fetcher,today});
  assert.equal(out[0].ok,false);assert.match(out[0].error,pattern);
 }
});
test('historical duplicate dates are rejected before scoring',()=>{
 const data={closingPriceDaily:history.map(x=>({...x}))};data.closingPriceDaily[5].dEven=data.closingPriceDaily[4].dEven;
 assert.throws(()=>api.parseHistory(data,{symbol:'فولاد',insCode:'123456789012'}),/تکراری/);
});
