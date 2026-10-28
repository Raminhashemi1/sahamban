'use strict';
// Persian numerals in the UI; numerical values read by calculations remain canonical.
(()=>{
 const persian=s=>String(s).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[+d]);
 const latin=s=>String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g,'.').replace(/٬/g,'');
 for(const input of document.querySelectorAll('input[type="number"], textarea#portfolioData, textarea#historyText, input#marketCode, input#watchCode')){
  const initial=input.value;
  if(input.tagName==='INPUT')input.type='text';
  input.inputMode='decimal';input.autocomplete='off';
  const proto=input.tagName==='INPUT'?HTMLInputElement.prototype:HTMLTextAreaElement.prototype;
  const desc=Object.getOwnPropertyDescriptor(proto,'value');
  Object.defineProperty(input,'value',{configurable:true,get(){return latin(desc.get.call(this));},set(v){desc.set.call(this,persian(v));}});
  input.value=initial;
  input.addEventListener('input',()=>{
   const raw=desc.get.call(input),shown=persian(raw);
   if(shown!==raw){
    const start=input.selectionStart,end=input.selectionEnd;
    desc.set.call(input,shown);
    try{input.setSelectionRange(start,end)}catch(e){}
   }
  });
 }
 const skip=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
 function localize(root){
  if(!root||!root.isConnected)return;
  if(root.nodeType===3){
   const parent=root.parentElement;
   if(parent&&skip.has(parent.tagName))return;
   const value=root.nodeValue;
   if(/[0-9]/.test(value))root.nodeValue=persian(value);
  }else if(root.nodeType===1&&!skip.has(root.tagName)){
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
   for(const n of nodes)localize(n);
  }
 }
 localize(document.body);
 const observer=new MutationObserver(records=>{
  for(const rec of records){
   if(rec.type==='characterData')localize(rec.target);
   else for(const node of rec.addedNodes)localize(node);
  }
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
})();
