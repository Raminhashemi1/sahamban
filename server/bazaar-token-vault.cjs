'use strict';
// AES-256-GCM envelope encryption for provider credentials that must be used
// server-side later (e.g. a Bazaar purchase token for cancellation).
// Never log plaintext, key material, nonce or ciphertext. Key is a base64url
// encoded 32-byte secret supplied through Worker secret storage.
const VERSION='v1';
const B64=/^[A-Za-z0-9_-]+$/;
function decodeKey(value){
 if(typeof value!=='string'||!B64.test(value)||value.length!==43)throw new Error('TOKEN_ENCRYPTION_KEY_INVALID');
 const raw=Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0));
 if(raw.length!==32)throw new Error('TOKEN_ENCRYPTION_KEY_INVALID');
 return raw;
}
function encode(bytes){
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decode(value){
 if(typeof value!=='string'||!B64.test(value)||value.length<1||value.length>8192)throw new Error('TOKEN_CIPHERTEXT_INVALID');
 const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function aad(context){
 if(!context||typeof context!=='object'||typeof context.orderId!=='string'||
  !/^ord_[a-f0-9]{32}$/.test(context.orderId)||typeof context.providerPaymentId!=='string'||
  !/^[a-f0-9]{64}$/.test(context.providerPaymentId))throw new Error('TOKEN_CONTEXT_INVALID');
 return new TextEncoder().encode(VERSION+'|cafebazaar|'+context.orderId+'|'+context.providerPaymentId);
}
async function keyFor(secret){
 const raw=decodeKey(secret);
 return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function encryptPurchaseToken(token,{secret,orderId,providerPaymentId}={}){
 if(typeof token!=='string'||token.length<16||token.length>4096||/\s/.test(token))throw new Error('PURCHASE_TOKEN_INVALID');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad({orderId,providerPaymentId}),tagLength:128},
  await keyFor(secret),new TextEncoder().encode(token));
 return Object.freeze({version:VERSION,nonce:encode(iv),ciphertext:encode(new Uint8Array(encrypted))});
}
async function decryptPurchaseToken(envelope,{secret,orderId,providerPaymentId}={}){
 if(!envelope||envelope.version!==VERSION)throw new Error('TOKEN_ENVELOPE_VERSION_UNSUPPORTED');
 const iv=decode(envelope.nonce),ciphertext=decode(envelope.ciphertext);
 if(iv.length!==12||ciphertext.length<17)throw new Error('TOKEN_ENVELOPE_INVALID');
 try{
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad({orderId,providerPaymentId}),tagLength:128},
   await keyFor(secret),ciphertext);
  const token=new TextDecoder('utf-8',{fatal:true}).decode(plain);
  if(token.length<16||token.length>4096||/\s/.test(token))throw new Error('PURCHASE_TOKEN_INVALID');
  return token;
 }catch(_){throw new Error('TOKEN_DECRYPTION_FAILED');}
}
module.exports=Object.freeze({encryptPurchaseToken,decryptPurchaseToken});
