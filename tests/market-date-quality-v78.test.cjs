'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('market-date-quality-v78.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function boot(){
 const listeners={},nodes=[];
 const parent={append(x){nodes.push(x)}};
 const document={getElementById(id){return id==='portfolioDiagnosticV74'?parent:null;},createElement(){return {textContent:'',setAttribute(){}}}};
 vm.runInNewContext(src,{document,window:{addEventListener:(key,fn)=>((listeners[key]??=[]).push(fn))},Date,Intl,Object,Number,String,Array,Math});
 return {emit:(key,detail)=>(listeners[key]||[]).forEach(fn=>fn({detail})),text:()=>nodes[0].textContent};
}
const start='sahamban:portfolio-refresh-status-v76',data='sahamban:verified-portfolio-concentration-v68';
const tehran=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('');};
test('v78 labels today and prior-day quotes separately',()=>{
 const a=boot();a.emit(start,{status:'started'});a.emit(data,{positions:[{marketDate:tehran()}]});assert.match(a.text(),/امروز تهران/);
 const d=new Date(Date.UTC(+tehran().slice(0,4),+tehran().slice(4,6)-1,+tehran().slice(6,8))-86400000);
 const yesterday=[d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,'0'),String(d.getUTCDate()).padStart(2,'0')].join('');
 a.emit(start,{status:'started'});a.emit(data,{positions:[{marketDate:tehran()},{marketDate:yesterday}]});assert.match(a.text(),/روزهای قبل/);
});
test('v78 rejects future, impossible and overly old dates',()=>{
 for(const date of ['20260230','20991231','20200101']){const a=boot();a.emit(start,{status:'started'});a.emit(data,{positions:[{marketDate:date}]});assert.match(a.text(),/نامعتبر/);}
});
test('v78 never treats stale events as current and stores or fetches nothing',()=>{
 const a=boot();a.emit(data,{positions:[{marketDate:tehran()}]});assert.match(a.text(),/آزمایش نشده/);
 a.emit(start,{status:'started'});a.emit(start,{status:'failed'});assert.match(a.text(),/تأیید نشد/);
 assert.doesNotMatch(src,/\bfetch\s*\(|localStorage|sessionStorage|navigator\.clipboard/);
});
test('v78 is versioned and precached',()=>{
 assert.match(html,/market-date-quality-v78\.js\?v=78\.0/);
 assert.match(sw,/market-date-quality-v78\.js\?v=78\.0/);
 assert.match(sw,/sahamban-static-v89-0/);
});
