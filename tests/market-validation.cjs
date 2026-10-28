'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf('async function verifyWatchQuote(');
const end=app.indexOf('\n}\n',start);
assert.ok(start>=0&&end>start,'quote validator not found');
const source=app.slice(start,end+3);
const today=new Date();
const day=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');
const date=day(today);
const old=new Date(today);old.setDate(old.getDate()-15);
const oldDate=day(old);
const info={dEven:Number(date),pClosing:2100};
let response={closingPriceDaily:[{dEven:Number(date),pClosing:2100}]};
let fail=false;
const context={
 fmt:n=>String(n),
 marketDateCheck:raw=>{
  const x=String(raw);
  if(!/^\d{8}$/.test(x))return {ok:false,text:'invalid date'};
  const yr=Number(x.slice(0,4)),m=Number(x.slice(4,6)),d=Number(x.slice(6,8));
  const stamp=new Date(Date.UTC(yr,m-1,d));
  const now=new Date();
  const age=Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-stamp.getTime())/86400000);
  return {ok:stamp.getUTCFullYear()===yr&&stamp.getUTCMonth()===m-1&&stamp.getUTCDate()===d&&age>=0&&age<=7,text:'date check'};
 },
 tseFetch:async path=>{assert.match(path,/GetClosingPriceDailyList/);if(fail)throw Error('offline');return response;},
 String,Number,Math,Array,Date,RegExp
};
vm.createContext(context);
vm.runInContext(source,context);
let count=0;
async function check(name,fn){await fn();console.log('PASS '+name);count++;}
const verify=(i,p)=>context.verifyWatchQuote('46348559193224090',i,p);
(async()=>{
 await check('Matched date and price are verified',async()=>assert.equal((await verify(info,2100)).ok,true));
 await check('Mismatched date blocks verification',async()=>{
  response={closingPriceDaily:[{dEven:Number(oldDate),pClosing:2100}]};
  assert.equal((await verify(info,2100)).ok,false);
 });
 await check('Mismatched price blocks verification',async()=>{
  response={closingPriceDaily:[{dEven:Number(date),pClosing:2300}]};
  assert.equal((await verify(info,2100)).ok,false);
 });
 await check('Stale quote blocks verification even when history matches',async()=>{
  response={closingPriceDaily:[{dEven:Number(oldDate),pClosing:2100}]};
  assert.equal((await verify({dEven:Number(oldDate)},2100)).ok,false);
 });
 await check('History request failure blocks verification',async()=>{
  fail=true;assert.equal((await verify(info,2100)).ok,false);fail=false;
 });
 await check('Missing and malformed history blocks verification',async()=>{
  response={closingPriceDaily:[]};assert.equal((await verify(info,2100)).ok,false);
  response={closingPriceDaily:[{dEven:0,pClosing:'invalid'}]};assert.equal((await verify(info,2100)).ok,false);
 });
 console.log('SUCCESS: '+count+' market validation scenarios');
})().catch(e=>{console.error(e);process.exitCode=1;});
