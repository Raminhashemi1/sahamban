'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-status-dashboard-v73.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const el=(text='')=>({textContent:text,children:[],append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=[...xs]}});
const flatten=n=>[n.textContent||'',...(n.children||[]).map(flatten)].join(' ');
function run(positions,funds){const panel=el(),listeners={};const document={getElementById:id=>id==='portfolioStatusDashboardV73'?panel:null,createElement:()=>el()};vm.runInNewContext(src,{document,window:{addEventListener:(event,cb)=>(listeners[event]??=[]).push(cb)},Intl,Number,String,Set,Error,Array});const push=(event,detail)=>listeners[event][0]({detail});if(funds!==undefined)push('sahamban:verified-fund-nav-premium-v63',{quotes:funds});if(positions!==undefined)push('sahamban:verified-portfolio-concentration-v68',{positions});return {text:flatten(panel),push,view:()=>flatten(panel)};}
const holdings=[{symbol:'عیار',quantity:7,price:100,marketDate:'20261030'},{symbol:'فولاد',quantity:3,price:100,marketDate:'20261030'}];
const nav=[{symbol:'عیار',price:100,assetClass:'fund_etf',fundNavChecked:true,marketDate:'20261030',fundNavDate:'20261030',fundNav:90},{symbol:'فولاد',price:100,assetClass:'equity',marketDate:'20261030'}];
test('v73 summarizes largest position and concurrent top three downside',()=>{const x=run(holdings,nav).text;assert.match(x,/۷۰٪/);assert.match(x,/۱۰٪ افت ارزش کل/);assert.match(x,/وزن عیار/);assert.match(x,/۱ صندوق با NAV/);});
test('v73 never invents NAV and protects against mismatched event snapshots',()=>{const x=run(holdings,[{...nav[0],marketDate:'20261029'},nav[1]]).text;assert.match(x,/داشبورد قابل اتکا نیست/);});
test('v73 treats absent or mismatched NAV as unknown',()=>{const x=run(holdings,[{...nav[0],fundNav:null},nav[1]]).text;assert.match(x,/حباب نامشخص/);assert.match(x,/۱ مورد نامعتبر/);});
test('v73 invalidates old portfolio after new NAV event',()=>{const r=run(holdings,nav);r.push('sahamban:verified-fund-nav-premium-v63',{quotes:nav});assert.match(r.view(),/در انتظار دریافت و تأیید قیمت/);});
test('v73 rejects duplicate holdings or unsafe values',()=>{assert.match(run([holdings[0],holdings[0]],nav).text,/داشبورد قابل اتکا نیست/);assert.match(run([{...holdings[0],quantity:Number.MAX_SAFE_INTEGER}],nav).text,/داشبورد قابل اتکا نیست/);});
test('v73 is integrated and offline cached',()=>{assert.match(html,/portfolioStatusDashboardV73/);assert.match(html,/portfolio-status-dashboard-v73\.js\?v=73\.0/);assert.match(sw,/portfolio-status-dashboard-v73\.js\?v=73\.0/);});
