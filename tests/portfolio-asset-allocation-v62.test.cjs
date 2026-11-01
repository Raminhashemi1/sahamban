'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-asset-allocation-v62.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(text=''){return {textContent:text,children:[],style:{},dataset:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]},querySelectorAll(sel){return sel==='td'?this.cells||[]:sel==='tr'?this.rows||[]:[]}}}
function deepText(node){return [node.textContent||'',...(node.children||[]).map(deepText)].join(' ');}
function run(values,quotes){
 const panel=el(),body=el();body.rows=values.map(([symbol,value])=>{const row=el();row.cells=[el(symbol),el('1'),el('1'),el('1'),el(String(value))];return row});
 const listeners={};const document={getElementById:id=>id==='riskAssetAllocationV62'?panel:id==='livePortfolioRows'?body:null,createElement:()=>el()};
 vm.runInNewContext(src,{document,window:{addEventListener:(n,fn)=>(listeners[n]??=[]).push(fn)},Intl,Number,String,Math,Error,Object});
 listeners['sahamban:verified-portfolio-asset-types-v62'][0]({detail:{quotes}});
 return panel;
}
test('v62 classifies only verified categories and reports value-weighted allocation',()=>{
 const p=run([['عیار',600],['فولاد',300],['حق',100]],[{symbol:'عیار',assetClass:'fund_etf'},{symbol:'فولاد',assetClass:'equity'},{symbol:'حق',assetClass:'preemptive_right'}]);
 const text=deepText(p);
 assert.match(text,/صندوق قابل معامله/);assert.match(text,/سهام شرکت/);assert.match(text,/حق تقدم/);assert.match(text,/پوشش طبقه‌بندی قطعی: ۱۰۰٪/);
});
test('v62 leaves unknown assets unclassified and reports incomplete coverage',()=>{
 const p=run([['عیار',600],['فولاد',400]],[{symbol:'عیار',assetClass:'unknown'},{symbol:'فولاد',assetClass:'equity'}]);
 assert.match(deepText(p),/پوشش طبقه‌بندی قطعی: ۴۰٪/);
 assert.match(p.children.map(x=>x.textContent).join(' '),/هنوز نامشخص/);
});
test('v62 fails closed on missing symbol classification',()=>{
 const p=run([['عیار',600],['فولاد',400]],[{symbol:'عیار',assetClass:'fund_etf'}]);
 assert.match(p.textContent,/پوشش طبقه‌بندی با فهرست سبد یکسان نیست/);
});
test('v62 page and offline cache include the module and new cache namespace',()=>{
 assert.match(html,/id="riskAssetAllocationV62"/);assert.match(html,/portfolio-asset-allocation-v62\.js\?v=62\.0/);
 assert.match(sw,/sahamban-static-v81-0/);assert.match(sw,/portfolio-asset-allocation-v62\.js\?v=62\.0/);
});
