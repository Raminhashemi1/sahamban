'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('module-finder-v94.js','utf8');
const css=fs.readFileSync('module-finder-v94.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
function element(tag){
 return {tag,children:[],attributes:{},hidden:false,textContent:'',value:'',listeners:{},
  append(...children){this.children.push(...children)},
  setAttribute(k,v){this.attributes[k]=v},
  addEventListener(k,cb){this.listeners[k]=cb},
  insertAdjacentElement(position,node){this.inserted=node},
  focus(){this.focused=true},
  querySelector(){return null}
 };
}
function boot(){
 const names=['سبد من','ورود دارایی‌ها','ریسک سبد','تحلیل تکنیکال','اطلاعات بورس','حجم معامله','هشدار چند نماد','هشدار قیمت','کنترل ریسک پیشرفته','تاریخچه بازار'];
 const cards=names.map(name=>{
  const card=element('div'),link=element('a');
  link.querySelector=selector=>{const node=element(selector);node.textContent=selector==='strong'?name:'توضیح';return node;};
  card.querySelector=()=>link;return card;
 });
 const home=element('section'),grid=element('nav');grid.querySelectorAll=()=>cards;
 const document={getElementById:id=>id==='sahambanHubV87'?home:id==='sahambanModulesV87'?grid:null,createElement:element};
 vm.runInNewContext(js,{document});
 const finder=grid.inserted,input=finder.children[1].children[0],clear=finder.children[1].children[1],status=finder.children[2];
 return {cards,input,clear,status};
}
test('search filters modules using Persian orthography and common novice terms',()=>{
 const a=boot();assert.equal(a.cards.filter(x=>!x.hidden).length,10);
 a.input.value='nav';a.input.listeners.input();
 assert.equal(a.cards.filter(x=>!x.hidden).length,1);assert.equal(a.cards[0].hidden,false);
 a.input.value='فايل کارگزاري';a.input.listeners.input();
 assert.equal(a.cards.filter(x=>!x.hidden).length,1);assert.equal(a.cards[1].hidden,false);
 a.input.value='هیچ نتیجه';a.input.listeners.input();
 assert.equal(a.cards.filter(x=>!x.hidden).length,0);
 assert.match(a.status.textContent,/پیدا نشد/);
 a.clear.listeners.click();assert.equal(a.cards.filter(x=>!x.hidden).length,10);assert.equal(a.input.focused,true);
});
test('module finder remains read-only, accessible and precached',()=>{
 new vm.Script(js);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|innerHTML|sendBeacon/);
 assert.match(js,/aria-live/);assert.match(js,/Escape/);assert.match(css,/:focus-visible/);
 assert.match(css,/min-height:44px/);assert.match(css,/\[hidden\]/);
 assert.match(html,/module-finder-v94\.js\?v=94\.0/);
 assert.match(html,/module-finder-v94\.css\?v=94\.0/);
 assert.match(sw,/module-finder-v94\.js\?v=94\.0/);
 assert.match(sw,/module-finder-v94\.css\?v=94\.0/);
});
