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
vm.runInContext(['portfolioNumber','parsePortfolio','portfolioRewardRisk','marketDateCheck','portfolioCsvCell','validatePortfolioBackup'].map(extract).join('\n'),context);
test('JavaScript parses',()=>{new vm.Script(app);new vm.Script(sw);});
test('App script and service worker version match',()=>{
 const v=html.match(/app\.js\?v=(\d+)/)?.[1];
 assert.ok(v);assert.ok(sw.includes('app.js?v='+v));assert.ok(sw.includes('sahamban-static-v'+v));
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
test('Own cache cleanup never targets other apps',()=>assert.ok(sw.includes("k.startsWith('sahamban-static-')&&k!==CACHE")));
console.log('SUCCESS: '+count+' smoke checks');
