'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const api=require('../technical-indicators-v50.js');
test('v50 parses and exposes a pure indicator API',()=>{new vm.Script(fs.readFileSync('technical-indicators-v50.js','utf8'));assert.equal(typeof api.sma,'function');assert.equal(typeof api.rsi,'function');assert.equal(typeof api.macd,'function');});
test('SMA aligns outputs and uses a rolling window',()=>{assert.deepEqual(api.sma([1,2,3,4,5],3),[null,null,2,3,4]);});
test('EMA seeds with the initial simple average',()=>{assert.deepEqual(api.ema([1,2,3,4],3),[null,null,2,3]);});
test('RSI handles rising, falling and flat series',()=>{assert.equal(api.rsi([1,2,3,4,5],3)[3],100);assert.equal(api.rsi([5,4,3,2,1],3)[3],0);assert.equal(api.rsi([5,5,5,5,5],3)[3],50);});
test('MACD validates periods and aligns signal/histogram',()=>{const r=api.macd(Array.from({length:50},(_,i)=>100+i));assert.equal(r.macd.length,50);assert.equal(r.signal.length,50);assert.equal(r.histogram.length,50);assert.equal(r.macd[24],null);assert.notEqual(r.signal[33],null);assert.ok(Number.isFinite(r.histogram[33]));assert.throws(()=>api.macd([1,2,3],12,12,9),/سریع/);});
test('invalid, empty and non-positive historical prices fail closed',()=>{assert.throws(()=>api.sma([],2),/حداقل/);assert.throws(()=>api.rsi([10,0,12],2),/مثبت/);assert.throws(()=>api.ema([1,2,3],0),/دوره/);assert.throws(()=>api.sma([1,Infinity,2],2),/معتبر/);});
test('short history remains unavailable instead of fabricating indicator values',()=>{assert.deepEqual(api.sma([10,11],3),[null,null]);assert.deepEqual(api.rsi([10,11],14),[null,null]);const m=api.macd([10,11,12]);assert.ok(m.macd.every(v=>v===null));assert.ok(m.signal.every(v=>v===null));});
test('indicator engine has no network or local storage side effects',()=>{const src=fs.readFileSync('technical-indicators-v50.js','utf8');assert.doesNotMatch(src,/\bfetch\s*\(/);assert.doesNotMatch(src,/localStorage\s*\./);});

test('v50 mobile panel is wired to the verified quote flow and offline cache',()=>{const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),pilot=fs.readFileSync('portfolio-pilot-v61.js','utf8'),ui=fs.readFileSync('technical-analysis-v50.js','utf8');assert.match(html,/id="technicalAnalysisV50"/);assert.match(html,/id="professionalRiskV49"/);assert.match(html,/professional-risk-v49\.js\?v=49/);assert.match(sw,/professional-risk-v49\.js\?v=49/);assert.match(html,/app\.js\?v=50/);assert.match(sw,/app\.js\?v=50/);assert.match(html,/technical-indicators-v50\.js\?v=50/);assert.match(html,/technical-analysis-v50\.js\?v=50\.20/);assert.match(sw,/sahamban-static-v69-0/);assert.match(sw,/technical-indicators-v50\.js\?v=50/);assert.match(sw,/portfolio-pilot-v51\.html/);assert.match(sw,/portfolio-pilot-v51\.js\?v=51\.1/);assert.match(sw,/technical-analysis-v50\.js\?v=50\.20/);assert.match(pilot,/sahamban:verified-historical-quotes-v50/);assert.match(pilot,/GetClosingPriceDailyList/);assert.match(pilot,/history\.slice\(-250\)/);assert.ok(pilot.includes("if(!/^\\d{8}$/.test(date)"));assert.match(ui,/SahambanTechnicalV50\.calculate/);assert.match(ui,/sahamban:verified-historical-quotes-v50/);assert.doesNotMatch(ui,/\bfetch\s*\(/);assert.doesNotMatch(ui,/localStorage\s*\./);});
test('historical analysis is not derived from imported file prices or demo rows',()=>{const html=fs.readFileSync('index.html','utf8'),ui=fs.readFileSync('technical-analysis-v50.js','utf8');assert.match(html,/قیمت‌های فایل کارگزاری به‌تنهایی برای تحلیل استفاده نمی‌شوند/);assert.match(ui,/تاریخچه معتبر برای این نماد/);assert.match(html,/برای تحلیل تاریخی دکمه زیر را جداگانه بزنید/);});

test('technical selector activates from visible portfolio symbols without treating imported prices as history',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const ui=fs.readFileSync('technical-analysis-v50.js','utf8');
 const elements={};
 class Element{
  constructor(){this.disabled=false;this.value='';this.textContent='';this.children=[];this.listeners={};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  replaceChildren(){this.children=[];}
  append(child){this.children.push(child);}
 }
 const document={getElementById:id=>elements[id]||(elements[id]=new Element()),createElement:()=>new Element()};
 const handlers={};
 const window={SahambanTechnicalV50:api,addEventListener:(name,fn)=>{handlers[name]=fn;}};
 vm.runInNewContext(ui,{document,window,Intl,Number,Array,Map,String});
 const selector=elements.technicalSymbolV50,result=elements.technicalResultV50,status=elements.technicalStatusV50;
 selector.disabled=true; // Mirror the HTML's initial disabled attribute.
 assert.equal(selector.disabled,true);
 handlers['sahamban:portfolio-symbols-v50']({detail:{symbols:['فولاد','خودرو','فولاد']}});
 assert.equal(selector.disabled,false);
 assert.deepEqual(selector.children.map(x=>x.value),['فولاد','خودرو']);
 assert.match(selector.children[0].textContent,/تاریخچه تأییدشده دریافت نشده/);
 assert.match(result.textContent,/تاریخچه معتبر/);
 assert.match(status.textContent,/هنوز تاریخچه/);
 handlers['sahamban:verified-historical-quotes-v50']({detail:{quotes:[{symbol:'فولاد',marketDate:'20260101',history:Array.from({length:40},(_,i)=>({date:String(20250101+i),close:100+i}))}]}});
 assert.equal(selector.disabled,false);
 assert.equal(selector.children[0].textContent,'فولاد');
 assert.match(result.textContent,/تعداد نقاط تاریخی معتبر/);
});

test('broker import visible rows publish symbol names to technical selector without sending prices',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync('broker-import.js','utf8');
 assert.match(source,/function publishVisibleSymbols\(items\)/);
 assert.match(source,/sahamban:portfolio-symbols-v50/);
 assert.match(source,/publishVisibleSymbols\(preview\.filter\(p=>!p\.issue\)\)/);
 assert.match(source,/publishVisibleSymbols\(preview\);/);
 assert.match(source,/detail:\{symbols\}/);
 assert.doesNotMatch(source,/sahamban:portfolio-symbols-v50[^\n]*price|sahamban:portfolio-symbols-v50[^\n]*current/);
});
