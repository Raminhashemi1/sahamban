'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-daily-summary-v83.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const el=(tag='')=>({tag,textContent:'',children:[],href:'',value:'',hidden:false,handlers:{},setAttribute(name,value){this[name]=value},addEventListener(n,f){this.handlers[n]=f},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x}});
function run(){
 const panel=el(),listeners={},document={getElementById:id=>id==='portfolioDailySummaryV83'?panel:null,createElement:tag=>el(tag)};
 vm.runInNewContext(src,{document,window:{addEventListener:(name,f)=>(listeners[name]??=[]).push(f)},Intl,Number,String,Array,Map,Set,Date,Error});
 const flat=x=>[x.textContent,...x.children.map(flat)].join(' ');
 const find=(node,match)=>match(node)?node:node.children.map(x=>find(x,match)).find(Boolean);return {send:(name,detail)=>(listeners[name]||[]).forEach(f=>f({detail})),text:()=>flat(panel),panel,find:match=>find(panel,match)};
}
const nav='sahamban:verified-fund-nav-premium-v63',pos='sahamban:verified-portfolio-concentration-v68',refresh='sahamban:portfolio-refresh-status-v76';
const quotes=[{symbol:'عیار',price:100,marketDate:'20261101'},{symbol:'فولاد',price:200,marketDate:'20261101'}];
const positions=[{symbol:'عیار',quantity:9,price:100,marketDate:'20261101'},{symbol:'فولاد',quantity:2,price:200,marketDate:'20261101'}];
test('v83 shows total, count, time and quick prices only after a completed verification',()=>{
 const a=run();
 a.send(refresh,{status:'started',reason:'none'});
 a.send(nav,{quotes});a.send(pos,{positions});
 assert.doesNotMatch(a.text(),/۱٬۳۰۰/);
 a.send(refresh,{status:'completed',reason:'none'});
 assert.match(a.text(),/۱٬۳۰۰/);assert.match(a.text(),/۲/);
 assert.match(a.text(),/ساعت دستگاه/);assert.match(a.text(),/فهرست سریع/);
 assert.equal(a.panel.children.some(x=>x.href==='#livePortfolioTable'),true);
});
test('v83 fails closed on mismatched and incomplete snapshots',()=>{
 const a=run();a.send(refresh,{status:'started'});a.send(nav,{quotes:[...quotes]});a.send(pos,{positions:[{...positions[0],price:101},positions[1]]});a.send(refresh,{status:'completed'});
 assert.match(a.text(),/تطبیق کامل/);assert.doesNotMatch(a.text(),/۱٬۳۰۰/);
 const b=run();b.send(refresh,{status:'started'});b.send(nav,{quotes:quotes.slice(0,1)});b.send(pos,{positions});b.send(refresh,{status:'completed'});
 assert.match(b.text(),/تطبیق کامل/);
});
test('v83 clears previous values on a new refresh and failed requests',()=>{
 const a=run();a.send(refresh,{status:'started'});a.send(nav,{quotes});a.send(pos,{positions});a.send(refresh,{status:'completed'});
 a.send(refresh,{status:'started'});assert.doesNotMatch(a.text(),/۱٬۳۰۰/);
 a.send(refresh,{status:'failed'});assert.match(a.text(),/نتیجه قبلی پاک/);
});
test('v83 does not access storage or network, and is offline bundled',()=>{
 assert.doesNotMatch(src,/localStorage|sessionStorage|fetch\(|XMLHttpRequest/);
 assert.match(html,/id="portfolioDailySummaryV83"/);assert.match(html,/portfolio-daily-summary-v83\.js\?v=83\.3/);
 assert.match(sw,/portfolio-daily-summary-v83\.js\?v=83\.3/);assert.match(sw,/sahamban-static-v103-0/);
});

test('v84 sorts quick quote rows by market value and searches locally without changing totals',()=>{
 const a=run();a.send(refresh,{status:'started'});a.send(nav,{quotes});a.send(pos,{positions});a.send(refresh,{status:'completed'});
 const list=a.find(x=>x.tag==='ul');assert.ok(list);assert.match(a.text(),/عیار/);assert.match(list.children[0].children[0].textContent,/عیار/);
 const input=a.find(x=>x.tag==='input');assert.ok(input);assert.equal(input.type,'search');
 input.value='فولاد';input.handlers.input();
 assert.equal(list.children[0].hidden,true);assert.equal(list.children[1].hidden,false);
 assert.match(a.text(),/۱٬۳۰۰/);
 input.value='نماد-ناموجود';input.handlers.input();
 assert.equal(list.children.every(x=>x.hidden),true);
 assert.match(a.text(),/پیدا نشد/);
});
test('v84 search control is reset on a failed or new refresh',()=>{
 const a=run();a.send(refresh,{status:'started'});a.send(nav,{quotes});a.send(pos,{positions});a.send(refresh,{status:'completed'});
 assert.ok(a.find(x=>x.tag==='input'));
 a.send(refresh,{status:'started'});assert.equal(a.find(x=>x.tag==='input'),undefined);
 a.send(refresh,{status:'failed'});assert.match(a.text(),/نتیجه قبلی پاک/);
});

test('v85 displays market price, holding value and weight as separate readable card lines',()=>{
 const a=run();a.send(refresh,{status:'started'});a.send(nav,{quotes});a.send(pos,{positions});a.send(refresh,{status:'completed'});
 const list=a.find(x=>x.tag==='ul');
 assert.equal(list.children.length,2);
 const ayar=list.children[0],foolad=list.children[1];
 assert.equal(ayar.className,'portfolio-mobile-quote-v85');
 assert.match(ayar.children[0].textContent,/عیار.*۱۰۰ ریال/);
 assert.match(ayar.children[1].textContent,/ارزش دارایی: ۹۰۰ ریال/);
 assert.match(ayar.children[1].textContent,/وزن سبد:/);
 assert.match(ayar.children[2].textContent,/20261101/);
 assert.match(foolad.children[1].textContent,/۴۰۰ ریال/);
 assert.match(a.text(),/۱٬۳۰۰/);
});

test('v86 previews five cards without nested scroll and expands all verified results',()=>{
 const a=run();
 const sixQuotes=Array.from({length:7},(_,i)=>({symbol:'نماد'+i,price:100+i,marketDate:'20261101'}));
 const sixPositions=sixQuotes.map((q,i)=>({symbol:q.symbol,quantity:10-i,price:q.price,marketDate:q.marketDate}));
 a.send(refresh,{status:'started'});a.send(nav,{quotes:sixQuotes});a.send(pos,{positions:sixPositions});a.send(refresh,{status:'completed'});
 const list=a.find(x=>x.tag==='ul'),button=a.find(x=>x.tag==='button');
 assert.equal(list.children.length,7);
 assert.equal(list.children.filter(li=>!li.hidden).length,5);
 assert.equal(button.hidden,false);assert.equal(button.textContent,'نمایش همه ۷ نماد');
 button.handlers.click();assert.equal(list.children.filter(li=>!li.hidden).length,7);
 assert.equal(button.textContent,'نمایش فقط ۵ نماد اول');
 button.handlers.click();assert.equal(list.children.filter(li=>!li.hidden).length,5);
});
test('v86 searches all symbols including initially hidden cards and resets view',()=>{
 const a=run();
 const qs=Array.from({length:7},(_,i)=>({symbol:'نماد'+i,price:100+i,marketDate:'20261101'}));
 const ps=qs.map((q,i)=>({symbol:q.symbol,quantity:10-i,price:q.price,marketDate:q.marketDate}));
 a.send(refresh,{status:'started'});a.send(nav,{quotes:qs});a.send(pos,{positions:ps});a.send(refresh,{status:'completed'});
 const list=a.find(x=>x.tag==='ul'),button=a.find(x=>x.tag==='button'),input=a.find(x=>x.tag==='input');
 input.value='نماد6';input.handlers.input();
 assert.equal(list.children.filter(li=>!li.hidden).length,1);
 assert.match(list.children.find(li=>!li.hidden).children[0].textContent,/نماد6/);
 assert.equal(button.hidden,true);
 input.value='';input.handlers.input();
 assert.equal(list.children.filter(li=>!li.hidden).length,5);
 assert.equal(button.hidden,false);
 a.send(refresh,{status:'started'});assert.equal(a.find(x=>x.tag==='button'),undefined);
});
test('v86 list removes nested scroll and keeps card display',()=>{
 assert.match(html,/#portfolioDailySummaryV83 details ul\{max-height:none;overflow:visible\}/);
 assert.match(html,/portfolio-quote-toggle-v86/);
});
