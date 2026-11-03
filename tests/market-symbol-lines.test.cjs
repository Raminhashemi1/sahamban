'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('market-connectivity-test.html','utf8');
const match=html.match(/const defaultSymbols=\[[\s\S]*?\];\n\$\('symbols-input'\)\.value=defaultSymbols\.join\('[^']*'\);\nfunction readSymbols\(\)\{[\s\S]*?\n\}/);
assert.ok(match,'symbol input and readSymbols function must exist');
const norm=html.match(/const norm=s=>[^\n]+;/)?.[0];
assert.ok(norm,'symbol normalizer must exist');
function setup(){
 const input={value:''};
 const ctx={$:name=>name==='symbols-input'?input:null};
 vm.createContext(ctx);
 vm.runInContext(norm+'\n'+match[0]+'\nthis.readSymbols=readSymbols;this.defaults=defaultSymbols;',ctx);
 return {input,readSymbols:ctx.readSymbols,defaults:ctx.defaults};
}
test('default 19 symbols are separated by real newlines',()=>{
 const {input,readSymbols,defaults}=setup();
 assert.equal(defaults.length,19);
 assert.equal(input.value.split('\n').length,19);
 assert.equal(readSymbols().length,19);
});
test('line-separated input does not split Arabic or Persian names containing n',()=>{
 const {input,readSymbols}=setup();
 input.value='فولاد\nونوین\nعیار';
 assert.deepEqual(Array.from(readSymbols()),['فولاد','ونوین','عیار']);
});
test('handles comma, tab and semicolon delimiters without silent corruption',()=>{
 const {input,readSymbols}=setup();
 input.value='فولاد،ذوب\tعیار;ونوین';
 assert.deepEqual(Array.from(readSymbols()),['فولاد','ذوب','عیار','ونوین']);
});
test('rejects duplicated symbols after Arabic/Persian normalization',()=>{
 const {input,readSymbols}=setup();
 input.value='ونیرو\nونيرو';
 assert.throws(()=>readSymbols(),/تکراری/);
});
