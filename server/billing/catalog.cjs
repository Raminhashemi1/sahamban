'use strict';
const PLANS=Object.freeze([
 Object.freeze({id:'SAHAMBAN_PRO_30D',days:30}),
 Object.freeze({id:'SAHAMBAN_PRO_60D',days:60}),
 Object.freeze({id:'SAHAMBAN_PRO_90D',days:90}),
 Object.freeze({id:'SAHAMBAN_PRO_180D',days:180}),
 Object.freeze({id:'SAHAMBAN_PRO_365D',days:365})
]);
const BY_ID=new Map(PLANS.map(p=>[p.id,p]));
function getPlan(id){return BY_ID.get(id)||null;}
module.exports=Object.freeze({PLANS,getPlan});
