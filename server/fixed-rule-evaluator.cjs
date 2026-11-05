'use strict';
/*
 * Trusted Node-only adapter for the EXACT checked-in v50/v129 algorithms.
 * Never accepts browser-calculated signals or weights. The vm context is
 * for isolating module globals, not a sandbox for untrusted JavaScript.
 * Both scripts are locally checked-in, versioned source code.
 */
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {Script,createContext}=require('node:vm');
const base=join(__dirname,'..');
const technicalSource=readFileSync(join(base,'technical-indicators-v50.js'),'utf8');
const decisionSource=readFileSync(join(base,'decision-support-v129.js'),'utf8');
const ruleSourceSha256=createHash('sha256')
 .update('Sahamban trusted fixed-rule v1\0').update(technicalSource)
 .update('\0').update(decisionSource).digest('hex');
const context=createContext({module:{exports:{}}});
new Script(technicalSource,{filename:'technical-indicators-v50.js'})
 .runInContext(context,{timeout:2000});
context.module={exports:{}};
new Script(decisionSource,{filename:'decision-support-v129.js'})
 .runInContext(context,{timeout:2000});
const rules=context.module.exports;
if(typeof rules.analyze!=='function')throw Error('FIXED_RULES_NOT_AVAILABLE');
function evaluate(snapshot,options){
 return rules.analyze(snapshot,options);
}
module.exports=Object.freeze({evaluate,ruleSourceSha256,
 ruleVersion:'decision-support-v129-fixed'});
