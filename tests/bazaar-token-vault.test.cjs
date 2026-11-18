'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const {encryptPurchaseToken,decryptPurchaseToken}=require('../server/bazaar-token-vault.cjs');
const secret=Buffer.alloc(32,7).toString('base64url');
const context={orderId:'ord_'+'a'.repeat(32),providerPaymentId:'b'.repeat(64)};
const token='bazaar-purchase-token-123456789';
test('purchase token vault encrypts and decrypts only with matching order context',async()=>{
 const sealed=await encryptPurchaseToken(token,{secret,...context});
 assert.equal(sealed.version,'v1');assert.notEqual(sealed.ciphertext,token);
 assert.equal(await decryptPurchaseToken(sealed,{secret,...context}),token);
});
test('purchase token vault uses randomized nonces',async()=>{
 const a=await encryptPurchaseToken(token,{secret,...context});
 const b=await encryptPurchaseToken(token,{secret,...context});
 assert.notEqual(a.nonce,b.nonce);assert.notEqual(a.ciphertext,b.ciphertext);
});
test('purchase token vault rejects tampering, wrong order and wrong key',async()=>{
 const sealed=await encryptPurchaseToken(token,{secret,...context});
 await assert.rejects(decryptPurchaseToken(sealed,{secret,orderId:'ord_'+'c'.repeat(32),providerPaymentId:context.providerPaymentId}),/TOKEN_DECRYPTION_FAILED/);
 await assert.rejects(decryptPurchaseToken(sealed,{secret:Buffer.alloc(32,8).toString('base64url'),...context}),/TOKEN_DECRYPTION_FAILED/);
 const raw=Buffer.from(sealed.ciphertext.replace(/-/g,'+').replace(/_/g,'/'),'base64');
 raw[0]^=0x01;
 const altered={...sealed,ciphertext:raw.toString('base64url')};
 await assert.rejects(decryptPurchaseToken(altered,{secret,...context}),/TOKEN_DECRYPTION_FAILED|TOKEN_CIPHERTEXT_INVALID/);
});
test('purchase token vault fails closed for missing keys, malformed tokens and context',async()=>{
 await assert.rejects(encryptPurchaseToken(token,{orderId:context.orderId,providerPaymentId:context.providerPaymentId}),/TOKEN_ENCRYPTION_KEY_INVALID/);
 await assert.rejects(encryptPurchaseToken('short',{secret,...context}),/PURCHASE_TOKEN_INVALID/);
 await assert.rejects(encryptPurchaseToken(token,{secret,orderId:'bad',providerPaymentId:context.providerPaymentId}),/TOKEN_CONTEXT_INVALID/);
});
