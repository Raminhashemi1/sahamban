'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('broker-import.js','utf8');
function harness(){
 const nodes=new Map();
 function element(id=''){
  if(nodes.has(id))return nodes.get(id);
  const obj={id,files:[],value:'',textContent:'',disabled:false,hidden:false,style:{},children:[],
   events:new Map(),addEventListener(name,fn){this.events.set(name,fn);},
   replaceChildren(){this.children=[];},append(child){this.children.push(child);},
   scrollIntoView(){},dispatchEvent(){}};
  nodes.set(id,obj);return obj;
 }
 const document={getElementById:element,createElement:()=>element('new-'+nodes.size)};
 const storage=new Map();
 const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))};
 const window={dispatchEvent(){},confirm(){return true;}};
 vm.runInNewContext(code,{document,localStorage,window,CustomEvent:class{constructor(name,options){this.type=name;this.detail=options.detail;}},
  console,Intl,TextDecoder,Number,String,Set,Map,Date,Blob,URL,Promise,Array,Error,BigInt});
 const fire=(id,type='click')=>{const fn=element(id).events.get(type);assert.ok(fn,id+' '+type);return fn();};
 return {element,fire,storage,window};
}
function deferred(){
 let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
test('an older CSV read cannot overwrite a newly selected broker file',async()=>{
 const h=harness(),first=deferred(),input=h.element('brokerFile');
 input.files=[{name:'first.csv',size:80,text:()=>first.promise}];
 const p1=h.fire('brokerFile','change');
 assert.equal(h.element('brokerMapping').hidden,true);
 input.files=[{name:'second.csv',size:80,text:async()=> 'symbol,qty,buy,current\nجدید,3,100,120'}];
 await h.fire('brokerFile','change');
 const good=h.element('brokerStatus').textContent;
 assert.match(good,/فایل خوانده شد/);
 assert.equal(h.element('brokerMapping').hidden,false);
 assert.ok(h.element('brokerSymbolCol').children.some(x=>x.textContent.includes('symbol')));
 first.resolve('ticker,qty,buy,current\nقدیمی,3,10,12');
 await p1;
 assert.equal(h.element('brokerStatus').textContent,good);
 assert.equal(h.element('brokerMapping').hidden,false);
 assert.ok(h.element('brokerSymbolCol').children.some(x=>x.textContent.includes('symbol')));
 assert.ok(!h.element('brokerSymbolCol').children.some(x=>x.textContent.includes('ticker')));
});
test('clearing file selection invalidates outstanding CSV read and previous confirmation',async()=>{
 const h=harness(),pending=deferred(),file=h.element('brokerFile');
 file.files=[{name:'delayed.csv',size:40,text:()=>pending.promise}];
 const old=h.fire('brokerFile','change');
 file.files=[];
 await h.fire('brokerFile','change');
 pending.resolve('symbol,qty,buy,current\nغلط,1,10,20');await old;
 assert.equal(h.element('brokerMapping').hidden,true);
 assert.equal(h.element('brokerReview').hidden,true);
 assert.equal(h.element('brokerApply').disabled,true);
 assert.match(h.element('brokerStatus').textContent,/فایلی انتخاب نشده/);
});
test('loading stored holdings wins against a pending old file import',async()=>{
 const h=harness(),pending=deferred(),file=h.element('brokerFile');
 file.files=[{name:'delayed.csv',size:40,text:()=>pending.promise}];
 const old=h.fire('brokerFile','change');
 h.storage.set('sahamban-broker-holdings-v1',JSON.stringify({version:2,holdings:[{
  symbol:'ذخیره',quantity:2,buy:100,current:120}]}));
 h.fire('brokerLoad');
 assert.equal(h.element('brokerReview').hidden,false);
 const msg=h.element('brokerStatus').textContent;
 pending.resolve('symbol,qty,buy,current\nغلط,1,10,20');await old;
 assert.equal(h.element('brokerStatus').textContent,msg);
 assert.equal(h.element('brokerReview').hidden,false);
 assert.equal(h.element('brokerMapping').hidden,true);
});
test('stale failed reads cannot replace newer successful result or show private exception',async()=>{
 const h=harness(),first=deferred(),file=h.element('brokerFile');
 file.files=[{name:'first.csv',size:100,text:()=>first.promise}];
 const stale=h.fire('brokerFile','change');
 file.files=[{name:'new.csv',size:50,text:async()=> 'symbol,qty,buy,current\nجدید,1,10,20'}];
 await h.fire('brokerFile','change');
 first.reject(Error('PRIVATE_FILENAME_SHOULD_NOT_APPEAR'));
 await stale;
 assert.doesNotMatch(h.element('brokerStatus').textContent,/PRIVATE_FILENAME/);
 assert.equal(h.element('brokerMapping').hidden,false);
});

test('corrupt saved holdings are not displayed and original local bytes are preserved',()=>{
 const badCases=[
  {version:2,holdings:[{symbol:'نماد',quantity:2,buy:-1,current:130}]},
  {version:2,holdings:[{symbol:'نماد',quantity:'3',buy:100,current:130}]},
  {version:2,holdings:[{symbol:'نماد',quantity:2,buy:100,current:130},{symbol:' نماد ',quantity:3,buy:120,current:140}]},
  {version:2,holdings:[{symbol:'نماد',quantity:9007199254740991,buy:2,current:3}]},
  {version:2,holdings:[{symbol:'نماد',quantity:1,buy:100,current:130},{symbol:'دیگر',quantity:1,buy:9007199254740900,current:9007199254740900}]},
  {version:999,holdings:[{symbol:'نماد',quantity:1,buy:100,current:130}]}
 ];
 for(const bad of badCases){
  const h=harness(),raw=JSON.stringify(bad);
  h.storage.set('sahamban-broker-holdings-v1',raw);
  h.fire('brokerLoad');
  assert.equal(h.element('brokerReview').hidden,true);
  assert.equal(h.element('brokerApply').disabled,true);
  assert.equal(h.element('brokerRisk').disabled,true);
  assert.equal(h.storage.get('sahamban-broker-holdings-v1'),raw);
  assert.match(h.element('brokerStatus').textContent,/نامعتبر|معتبر نیست|محدوده/);
 }
});
test('valid v1 legacy holdings are displayed with toman-to-rial conversion but never rewritten',()=>{
 const h=harness(),old={version:1,holdings:[{symbol:'ونوین',quantity:2,buy:100,current:120}]},raw=JSON.stringify(old);
 h.storage.set('sahamban-broker-holdings-v1',raw);
 h.fire('brokerLoad');
 assert.equal(h.element('brokerReview').hidden,false);
 assert.equal(h.element('brokerApply').disabled,true);
 assert.equal(h.storage.get('sahamban-broker-holdings-v1'),raw);
 const rows=h.element('brokerRows').children;
 assert.equal(rows.length,1);
 assert.equal(rows[0].children.length,5);
 assert.ok(rows[0].children.some(c=>String(c.textContent).includes('۱٬۰۰۰')));
});
test('backup export refuses invalid persisted holdings without deleting saved bytes',()=>{
 const h=harness(),raw=JSON.stringify({version:2,holdings:[{symbol:'نماد',quantity:0,buy:100,current:120}]});
 h.storage.set('sahamban-broker-holdings-v1',raw);
 h.fire('brokerExportBackup');
 assert.equal(h.storage.get('sahamban-broker-holdings-v1'),raw);
 assert.match(h.element('brokerStatus').textContent,/پشتیبان‌گیری انجام نشد/);
});

test('read-only load cannot destroy a valid previous recovery snapshot',()=>{
 const h=harness(),old={version:2,holdings:[{symbol:'قدیمی',quantity:1,buy:100,current:110}]},
  current={version:2,holdings:[{symbol:'جدید',quantity:2,buy:200,current:220}]};
 const prior=JSON.stringify(old),now=JSON.stringify(current);
 h.storage.set('sahamban-broker-holdings-v1-previous',prior);
 h.storage.set('sahamban-broker-holdings-v1',now);
 h.fire('brokerLoad');
 assert.equal(h.element('brokerApply').disabled,true);
 h.fire('brokerApply');
 assert.equal(h.storage.get('sahamban-broker-holdings-v1'),now);
 assert.equal(h.storage.get('sahamban-broker-holdings-v1-previous'),prior);
});
test('restore valid older snapshot only after user confirmation and preserve snapshot',()=>{
 const h=harness(),current=JSON.stringify({version:2,holdings:[{symbol:'فعلی',quantity:2,buy:200,current:220}]}),
 prior=JSON.stringify({version:1,holdings:[{symbol:'قبلی',quantity:3,buy:100,current:125}]});
 h.storage.set('sahamban-broker-holdings-v1',current);
 h.storage.set('sahamban-broker-holdings-v1-previous',prior);
 h.window.confirm=()=>false;
 h.fire('brokerRestorePrevious');
 assert.equal(h.storage.get('sahamban-broker-holdings-v1'),current);
 assert.equal(h.storage.get('sahamban-broker-holdings-v1-previous'),prior);
 h.window.confirm=()=>true;
 h.fire('brokerRestorePrevious');
 assert.equal(h.storage.get('sahamban-broker-holdings-v1'),prior);
 assert.equal(h.storage.get('sahamban-broker-holdings-v1-previous'),prior);
 assert.equal(h.element('brokerRows').children.length,1);
 assert.equal(h.element('brokerApply').disabled,true);
 assert.equal(h.element('brokerRisk').disabled,false);
 assert.match(h.element('brokerStatus').textContent,/بازیابی شد/);
});
test('restore rejects corrupt previous snapshot without changing current holdings',()=>{
 for(const bad of ['not JSON',JSON.stringify({version:2,holdings:[{symbol:'نماد',quantity:0,buy:10,current:11}]})]){
  const h=harness(),current=JSON.stringify({version:2,holdings:[{symbol:'فعلی',quantity:2,buy:200,current:220}]});
  h.storage.set('sahamban-broker-holdings-v1',current);
  h.storage.set('sahamban-broker-holdings-v1-previous',bad);
  h.fire('brokerRestorePrevious');
  assert.equal(h.storage.get('sahamban-broker-holdings-v1'),current);
  assert.equal(h.storage.get('sahamban-broker-holdings-v1-previous'),bad);
  assert.equal(h.element('brokerRisk').disabled,true);
  assert.match(h.element('brokerStatus').textContent,/بازیابی انجام نشد/);
 }
});
test('restore safely rejects storage write errors and keeps prior bytes unchanged',()=>{
 const h=harness(),current=JSON.stringify({version:2,holdings:[{symbol:'فعلی',quantity:2,buy:200,current:220}]}),
 previous=JSON.stringify({version:2,holdings:[{symbol:'قبلی',quantity:1,buy:100,current:110}]});
 h.storage.set('sahamban-broker-holdings-v1',current);
 h.storage.set('sahamban-broker-holdings-v1-previous',previous);
 // vm fixture uses Map-backed storage; a failed write leaves both snapshots intact.
 const original=h.storage.set.bind(h.storage);
 h.storage.set=(key,value)=>{if(key==='sahamban-broker-holdings-v1')throw Error('QUOTA_FAIL');return original(key,value);};
 h.fire('brokerRestorePrevious');
 assert.equal(h.storage.get('sahamban-broker-holdings-v1'),current);
 assert.equal(h.storage.get('sahamban-broker-holdings-v1-previous'),previous);
 assert.match(h.element('brokerStatus').textContent,/بازیابی انجام نشد/);
});
