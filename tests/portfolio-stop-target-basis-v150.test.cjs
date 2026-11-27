'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('app.js','utf8');
function extract(name,next){
 const start=source.indexOf('function '+name+'(');
 assert.notEqual(start,-1,'missing '+name);
 const end=next?source.indexOf('function '+next+'(',start):source.indexOf('\nconst portfolioDemo=',start);
 assert.ok(end>start,'missing end for '+name);
 return source.slice(start,end);
}
function fakeElement(){
 return {textContent:'',value:'',style:{},children:[],
  appendChild(x){this.children.push(x);return x;},
  append(...xs){this.children.push(...xs);},
  replaceChildren(...xs){this.children=[...xs];}};
}
function harness(raw){
 const els={
  portfolioData:fakeElement(),portfolioCapital:fakeElement(),portfolioRiskCap:fakeElement(),
  portfolioStress:fakeElement(),portfolioConcentration:fakeElement(),portfolioSort:fakeElement(),
  portfolioSummary:fakeElement(),portfolioDetails:fakeElement()
 };
 els.portfolioData.value=raw;els.portfolioCapital.value='100000';els.portfolioRiskCap.value='5';
 els.portfolioStress.value='10';els.portfolioConcentration.value='30';els.portfolioSort.value='value';
 const context={Number,Set,Math,Error,Intl,String,Object,Array,JSON,document:{createElement:()=>fakeElement()},
  $:id=>els[id],fmt:value=>String(Number(value.toFixed?value.toFixed(2):value)),
  portfolioSnapshot:()=>({stable:true}),latestPortfolioReport:null,portfolioReportSnapshot:null};
 vm.createContext(context);
 vm.runInContext([
  "function portfolioNumber(v,line){const digits=String(v).trim().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬،,\\s]/g,'').replace(/٫/g,'.');const val=Number(digits);if(digits===''||!Number.isFinite(val))throw Error('عدد نامعتبر در سطر '+line);if(Number.isInteger(val)&&!Number.isSafeInteger(val))throw Error('عدد خارج از دقت امن محاسبات مالی در سطر '+line);return val;}",
  extract('parsePortfolio','portfolioRewardRisk'),
  extract('portfolioRewardRisk','reportPortfolio'),
  extract('reportPortfolio',null)
 ].join('\n'),context);
 return {context,els};
}

test('stop and target are validated against average buy, not current market price',()=>{
 const {context}=harness('پایین,10,100,80,90,120\nبالا,5,100,130,90,120');
 const rows=context.parsePortfolio(context.$('portfolioData').value);
 assert.equal(rows.length,2);
 assert.equal(rows[0].stopBreached,true);
 assert.equal(rows[1].targetReached,true);
 assert.equal(rows[0].atRisk,0);
 assert.equal(rows[0].upside,400);
 assert.equal(rows[1].atRisk,200);
 assert.equal(rows[1].upside,0);
});

test('comma-group fallback parser also uses average buy as the reference',()=>{
 const {context}=harness('پایین,10,1,000,800,900,1,200');
 const rows=context.parsePortfolio(context.$('portfolioData').value);
 assert.equal(rows[0].stopBreached,true);
 assert.equal(rows[0].targetReached,false);
});

test('invalid stop or target relative to buy remains rejected',()=>{
 for(const raw of ['نماد,10,100,110,100,120','نماد,10,100,110,90,100']){
  const {context}=harness(raw);
  assert.throws(()=>context.parsePortfolio(raw),/حد ضرر کمتر از میانگین خرید و حد سود بیشتر از میانگین خرید/);
 }
});

test('report surfaces stop breaches and target hits without negative risk or upside values',()=>{
 const {context,els}=harness('پایین,10,100,80,90,120\nبالا,5,100,130,90,120');
 context.reportPortfolio();
 assert.match(els.portfolioSummary.textContent,/عبور از حد ضرر در 1 نماد: پایین/);
 assert.match(els.portfolioSummary.textContent,/رسیدن به حد سود در 1 نماد: بالا/);
 const table=els.portfolioDetails.children[0];
 assert.ok(table);
 const rendered=JSON.stringify(table.children.map(row=>row.children.map(cell=>cell.textContent)));
 assert.match(rendered,/عبور از حد ضرر/);
 assert.match(rendered,/رسیدن به حد سود/);
 assert.match(rendered,/"0"/);
});
