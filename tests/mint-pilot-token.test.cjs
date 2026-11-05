'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const {issuePilotToken}=require('../server/mint-pilot-token.cjs');
const SECRET='a_strong_minimum_32_bytes_random_pilot_secret_test_only_12345';
test('offline operator token is verifiable by private Cloudflare Worker pilot gate',async()=>{
 const {verifyPilotToken}=await import('../server/worker-api.mjs');
 const nowMs=Date.UTC(2026,10,5,9,0,0);
 const t=issuePilotToken({subject:'pilot:user-123',secret:SECRET,nowMs,ttlSeconds:900});
 assert.equal(await verifyPilotToken('Bearer '+t,SECRET,nowMs+300000),'pilot:user-123');
 assert.equal(await verifyPilotToken('Bearer '+t,SECRET,nowMs+901000),null);
 assert.equal(await verifyPilotToken('Bearer '+t,SECRET+'bad',nowMs),null);
 assert.notEqual(issuePilotToken({subject:'pilot:user-123',secret:SECRET,nowMs}),t);
});
test('token issuance rejects short keys, injection subjects and excessive lifetimes',()=>{
 assert.throws(()=>issuePilotToken({subject:'x',secret:'tiny'}),/کلید/);
 assert.throws(()=>issuePilotToken({subject:'a b',secret:SECRET}),/شناسه/);
 assert.throws(()=>issuePilotToken({subject:'x',secret:SECRET,ttlSeconds:86400}),/اعتبار/);
 assert.throws(()=>issuePilotToken({subject:'x',secret:SECRET,ttlSeconds:1}),/اعتبار/);
});
