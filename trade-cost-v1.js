'use strict';
/* Read-only upper-bound estimate for ordinary shares/rights in TSE and IFB.
 * Rates and caps transcribed from the edition-49 ceiling schedule (1405/04/27),
 * checked 1405/06/10 at https://idbr.ir/fees. Reconfirm latest official circular
 * and broker rounding/discounts before production use. No orders or account access.
 */
const RATE_SCHEDULE=Object.freeze({version:'IR securities fee ceiling, edition 49 (1405/04/27)',checkedDate:'1405/06/10',source:'https://idbr.ir/fees',instrumentType:'SHARE_OR_RIGHT',BUY:Object.freeze([
 Object.freeze({key:'brokerage',rate:0.00304,capRial:300000000}),Object.freeze({key:'exchange',rate:0.000256,capRial:300000000}),Object.freeze({key:'depository',rate:0.000096,capRial:160000000}),Object.freeze({key:'technology',rate:0.00008,capRial:80000000}),Object.freeze({key:'regulator',rate:0.00024,capRial:100000000})]),SELL:Object.freeze([
 Object.freeze({key:'brokerage',rate:0.00304,capRial:300000000}),Object.freeze({key:'exchange',rate:0.000256,capRial:300000000}),Object.freeze({key:'depository',rate:0.000144,capRial:240000000}),Object.freeze({key:'technology',rate:0.00012,capRial:120000000}),Object.freeze({key:'regulator',rate:0.00024,capRial:100000000}),Object.freeze({key:'saleTax',rate:0.005,capRial:null})])});
function positiveSafeInteger(v,n){if(!Number.isSafeInteger(v)||v<=0)throw new RangeError(n+' must be a positive safe integer');}
function safeAmount(v,n){if(!Number.isSafeInteger(v)||v<0)throw new RangeError(n+' exceeds safe integer precision');return v;}
function calculateOrderCosts({side,quantity,priceRial,instrumentType='SHARE_OR_RIGHT'}={}){
 if(side!=='BUY'&&side!=='SELL')throw new TypeError('side must be BUY or SELL');
 if(instrumentType!=='SHARE_OR_RIGHT')throw new TypeError('only ordinary shares and rights are supported');
 positiveSafeInteger(quantity,'quantity');positiveSafeInteger(priceRial,'priceRial');
 const grossRial=safeAmount(quantity*priceRial,'grossRial');
 const components=RATE_SCHEDULE[side].map(x=>{const uncappedRial=Math.round(grossRial*x.rate);const amountRial=x.capRial===null?uncappedRial:Math.min(uncappedRial,x.capRial);return Object.freeze({key:x.key,rate:x.rate,capRial:x.capRial,amountRial});});
 const feesRial=safeAmount(components.reduce((s,x)=>s+x.amountRial,0),'feesRial');
 const settlementRial=side==='BUY'?safeAmount(grossRial+feesRial,'settlementRial'):grossRial-feesRial;
 if(settlementRial<0)throw new RangeError('fees exceed sale proceeds');
 return Object.freeze({side,instrumentType,quantity,priceRial,grossRial,components:Object.freeze(components),feesRial,settlementRial,schedule:RATE_SCHEDULE.version,note:'Ceiling-rate estimate; broker discounts, rounding and latest official circular must be checked. No order is placed.'});
}
function calculateRoundTrip({quantity,buyPriceRial,sellPriceRial,instrumentType='SHARE_OR_RIGHT'}={}){
 const buy=calculateOrderCosts({side:'BUY',quantity,priceRial:buyPriceRial,instrumentType});const sell=calculateOrderCosts({side:'SELL',quantity,priceRial:sellPriceRial,instrumentType});
 const realizedPnlRial=sell.settlementRial-buy.settlementRial;safeAmount(Math.abs(realizedPnlRial),'realizedPnlRial');return Object.freeze({buy,sell,realizedPnlRial,profitable:realizedPnlRial>0});
}
module.exports=Object.freeze({RATE_SCHEDULE,calculateOrderCosts,calculateRoundTrip});