'use strict';
// Transport failures are UNVERIFIED, never valid market evidence.
const NETWORK_CODES=new Set([
 'UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT',
 'UND_ERR_SOCKET','UND_ERR_ABORTED','ECONNRESET','ETIMEDOUT','EAI_AGAIN',
 'ECONNREFUSED','ENETUNREACH','EHOSTUNREACH','ENOTFOUND','ABORT_ERR'
]);
function networkFailureCode(error){
 let current=error;
 for(let i=0;i<5&&current&&typeof current==='object';i++,current=current.cause){
  if(typeof current.code==='string'&&NETWORK_CODES.has(current.code))return current.code;
  if(current.name==='AbortError'||current.name==='TimeoutError')return current.name;
 }
 return null;
}
module.exports={networkFailureCode};
