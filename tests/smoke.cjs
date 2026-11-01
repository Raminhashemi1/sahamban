'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function extract(name){
 const start=app.indexOf('function '+name+'(');
 assert.ok(start>=0,'function missing: '+name);
 const tail=app.slice(start);
 const next=tail.indexOf('\n}\n');
 assert.ok(next>0,'function end missing: '+name);
 return tail.slice(0,next+3);
}
const context=vm.createContext({fmt:n=>String(n),Intl,Date});
vm.runInContext(['portfolioNumber','parsePortfolio','portfolioRewardRisk','marketDateCheck','portfolioCsvCell','validatePortfolioBackup','convertLegacyPortfolio','refreshPortfolioSaveState'].map(extract).join('\n'),context);
const brokerImport=fs.readFileSync('broker-import.js','utf8');
const portfolioLive=fs.readFileSync('portfolio-pilot-v61.js','utf8');
test('JavaScript parses',()=>{new vm.Script(app);new vm.Script(sw);new vm.Script(brokerImport);new vm.Script(portfolioLive);});
const persianUi=fs.readFileSync('persian-ui.js','utf8');
test('Rial-only portfolio examples and Persian numerical display are wired',()=>{
 new vm.Script(persianUi);
 assert.ok(html.includes('فولاد,1000,5000,5400,4700,6500'));
 assert.ok(app.includes("const portfolioDemo='فولاد,1000,5000,5400,4700,6500"));
 assert.ok(html.includes('./persian-ui.js?v=48'));
 assert.ok(sw.includes('./persian-ui.js?v=48'));
 assert.ok(!app.includes(' تومان')&&!app.includes('_toman'));
});
test('Legacy toman backup is converted to rial without mutating source',()=>{
 const legacy={version:1,data:'فولاد,100,200,250,150,300',capital:'50000',riskCap:'5',stress:'10',concentration:'30'};
 const converted=context.validatePortfolioBackup(legacy);
 assert.equal(converted.version,2);
 assert.equal(converted.data,'فولاد,100,2000,2500,1500,3000');
 assert.equal(converted.capital,'500000');
 assert.equal(legacy.data,'فولاد,100,200,250,150,300');
});
test('Broker import is local-only with separate storage and offline Excel parser',()=>{
 assert.ok(html.includes('id="brokerFile"')&&html.includes('id="brokerReview"')&&html.includes('id="brokerApply"'));
 assert.ok(html.includes('broker-import.js?v='));
 assert.ok(brokerImport.includes("sahamban-broker-holdings-v1"));
 assert.ok(brokerImport.includes("new DecompressionStream('deflate-raw')"));
 assert.ok(!brokerImport.includes('cdn.jsdelivr.net')&&!brokerImport.includes('fetch('));
 assert.ok(brokerImport.includes("STORAGE+'-previous'"));
});
test('App script and service worker version match',()=>{
 const v=html.match(/app\.js\?v=(\d+)/)?.[1];
 assert.ok(v);assert.ok(sw.includes('app.js?v='+v));assert.ok(sw.includes('sahamban-static-v68'));
 assert.ok(sw.includes('portfolio-pilot-v61.js?v=61.6'));
  assert.ok(sw.includes('portfolio-pilot-v51.html'));
  assert.ok(sw.includes('portfolio-pilot-v51.js?v=51.1'));
 assert.ok(sw.includes('technical-analysis-v50.js?v=50.20'));
});
test('Real broker holdings valuation is read-only with independent quote validation',()=>{
 assert.ok(html.includes('id="livePortfolioSection"'));
 assert.ok(html.includes('portfolio-pilot-v61.js?v=61.6'));
 assert.ok(html.includes('portfolioInsightsV613'));
 assert.ok(portfolioLive.includes('شاخص تمرکز HHI'));
 assert.ok(portfolioLive.includes('بهترین بازده'));
 assert.ok(portfolioLive.includes('آزمون تنش سبد'));
 assert.ok(portfolioLive.includes('پوشش و کیفیت داده قیمت'));
 assert.ok(portfolioLive.includes('قیمت پایانی'));
 assert.ok(portfolioLive.includes('آخرین معامله'));
 assert.ok(portfolioLive.includes('[5,10,15,20]'));
 assert.ok(!portfolioLive.includes('localStorage.setItem(HOLDINGS_KEY'));
 assert.ok(sw.includes('portfolio-pilot-v61.js?v=61.6'));
 assert.ok(portfolioLive.includes("sahamban-broker-holdings-v1"));
 assert.ok(portfolioLive.includes("GetClosingPriceDailyList"));
 assert.ok(portfolioLive.includes('const checks=await Promise.all(candidates.map(async candidate=>')); 
 assert.ok(portfolioLive.includes('چند شناسه برای '));
 assert.ok(html.includes('id="instrumentMappingPanel"'));
 assert.ok(portfolioLive.includes("sahamban-instrument-mappings-v1"));
 assert.ok(portfolioLive.includes('انتخاب ذخیره‌شده '));
 assert.ok(portfolioLive.includes("sahamban:portfolio-symbols-v50',{detail:{symbols:quotes.map(q=>q.symbol)}}"));
 assert.ok(!portfolioLive.includes("sahamban:verified-historical-quotes-v50',{detail:{quotes:quotes.map"));
 assert.ok(portfolioLive.includes("const historyButton=$('technicalHistoryAllV50')"));
 assert.ok(portfolioLive.includes("sahamban:verified-historical-quotes-v50',{detail:{quotes}}"));
 assert.ok(html.includes('technical-analysis-v50.js?v=50.20'));

 assert.ok(portfolioLive.includes('تأیید و ذخیره انتخاب'));
 assert.ok(!portfolioLive.includes("localStorage.setItem(HOLDINGS_KEY")&&!portfolioLive.includes("localStorage.removeItem(HOLDINGS_KEY"));
 assert.ok(!portfolioLive.includes('localStorage.setItem(HOLDINGS_KEY')&&!portfolioLive.includes('localStorage.removeItem(HOLDINGS_KEY')&&!portfolioLive.includes('localStorage.clear('));
 assert.ok(brokerImport.includes("buy=num(row[+ids[2]])*factor"));
});
test('No duplicated HTML ids and no missing JS ids',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const match of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),match[1]+' missing');
});
test('PWA manifest has name, start URL and icons',()=>{assert.ok(manifest.name);assert.ok(manifest.start_url);assert.ok(manifest.icons.length>=2);});
test('Portfolio example calculates nominal value and stop risk',()=>{
 const p=context.parsePortfolio('فولاد,1000,500,540,470,650\nخودرو,2000,280,260,235,320');
 assert.equal(p.reduce((a,x)=>a+x.value,0),1060000);
 assert.equal(p.reduce((a,x)=>a+x.atRisk,0),120000);
});
test('Portfolio rejects invalid risk and duplicate symbols',()=>{
 assert.throws(()=>context.parsePortfolio('فولاد,100,500,540,550,650'));
 assert.throws(()=>context.parsePortfolio('فولاد,100,500,540,470,650\nفولاد,100,500,540,470,650'));
});
test('Portfolio handles Persian decimal separators',()=>assert.equal(context.portfolioNumber('۱۲٫۵',1),12.5));
test('Reward-to-risk zero division safely handled',()=>assert.equal(context.portfolioRewardRisk(500,0),null));
test('Market date rejects invalid, old and future dates',()=>{
 assert.equal(context.marketDateCheck('20260230').ok,false);
 assert.equal(context.marketDateCheck('20000101').ok,false);
 const future=new Date();future.setDate(future.getDate()+2);
 const date=[future.getFullYear(),String(future.getMonth()+1).padStart(2,'0'),String(future.getDate()).padStart(2,'0')].join('');
 assert.equal(context.marketDateCheck(date).ok,false);
});
test('Market alarms require independently validated quotes',()=>{
 assert.ok(app.includes('if(freshness.ok&&verification.ok&&(price<=stop||price>=target))'));
 assert.ok(app.includes('if(verification.ok&&(price<=x.stop||price>=x.target))'));
});
test('CSV spreadsheet formula injection neutralised',()=>{
 for(const x of ['=1+1','+SUM(A1:A2)','@HYPERLINK(A1)'])assert.ok(context.portfolioCsvCell(x).startsWith('"\''));
});
test('CSV negative numeric losses remain numeric',()=>{
 assert.equal(context.portfolioCsvCell(-1250),'"-1250"');
 assert.equal(context.portfolioCsvCell('-SUM(1)'),'"\'-SUM(1)"');
});
test('Backup validation blocks corrupted or dangerous settings',()=>{
 const valid={version:1,data:'فولاد,1000,500,540,470,650',capital:'1000000',riskCap:'5',stress:'10',concentration:'30'};
 assert.equal(context.validatePortfolioBackup(valid).concentration,'30');
 assert.throws(()=>context.validatePortfolioBackup({...valid,riskCap:'120'}));
 assert.throws(()=>context.validatePortfolioBackup({...valid,concentration:'-1'}));
 assert.throws(()=>context.validatePortfolioBackup({...valid,data:'فولاد,0,500,540,470,650'}));
});
test('Portfolio rejects excessive arithmetic',()=>{
 assert.throws(()=>context.parsePortfolio('الف,9007199254740991,1e300,1e300,1e299,1e301'));
});
test('Aggregate overflow rejected before storage and backup import',()=>{
 const large=Array.from({length:30},(_,i)=>'نماد'+i+',1,1e306,1e307,1e306,1.1e307').join('\\n');
 assert.throws(()=>context.parsePortfolio(large));
 assert.throws(()=>context.validatePortfolioBackup({version:1,data:large,capital:'',riskCap:'5',stress:'10',concentration:'30'}));
});
test('Saved status rejects corrupted local portfolio',()=>{
 const record={version:2,data:'فولاد,1000,500,540,470,650',capital:'1000000',riskCap:'5',stress:'10',concentration:'30'};
 const status={textContent:''};
 context.$=()=>status;
 context.PORTFOLIO_STORAGE_KEY='sahamban-portfolio-local-v1';
 context.portfolioSnapshot=()=>({data:record.data,capital:record.capital,riskCap:record.riskCap,stress:record.stress,concentration:record.concentration});
 context.localStorage={getItem:()=>JSON.stringify({...record,concentration:'-5'})};
 context.refreshPortfolioSaveState();
 assert.match(status.textContent,/مشخص نیست/);
 context.localStorage={getItem:()=>JSON.stringify(record)};
 context.refreshPortfolioSaveState();
 assert.match(status.textContent,/ذخیره شده‌اند/);
});
test('Own cache cleanup never targets other apps',()=>assert.ok(sw.includes("k.startsWith('sahamban-static-')&&k!==CACHE")));
console.log('SUCCESS: '+count+' smoke checks');

// Execute v53 weekend quote regression tests in the existing smoke CI workflow.
require('./pilot-v53-weekend.test.cjs');

require('./pilot-v54-live.test.cjs');

require('./pilot-v55-quote.test.cjs');

require('./pilot-v56-display.test.cjs');

require('./pilot-v57-freshness.test.cjs');

require('./pilot-v58-price-basis.test.cjs');

require('./pilot-v59-freshness.test.cjs');

require('./pilot-v60-mobile.test.cjs');

require('./pilot-v61-coverage.test.cjs');

require('./home-portfolio-v61-entry.test.cjs');
