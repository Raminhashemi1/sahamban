'use strict';
const PLANS=Object.freeze([
 Object.freeze({id:'SAHAMBAN_PRO_30D',days:30,priceRial:1500000}),
 Object.freeze({id:'SAHAMBAN_PRO_60D',days:60,priceRial:2850000}),
 Object.freeze({id:'SAHAMBAN_PRO_90D',days:90,priceRial:4050000}),
 Object.freeze({id:'SAHAMBAN_PRO_180D',days:180,priceRial:7650000}),
 Object.freeze({id:'SAHAMBAN_PRO_365D',days:365,priceRial:14600000})
]);
const BY_ID=new Map(PLANS.map(p=>[p.id,p]));
function getPlan(id){return BY_ID.get(id)||null;}
module.exports=Object.freeze({PLANS,getPlan});
