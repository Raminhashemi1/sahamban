'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const {normalizeUsername,hashPassword,verifyPassword}=require('../server/password-auth.cjs');

test('normalizes Iranian phone usernames across Persian, Arabic and Latin digits',()=>{
 assert.equal(normalizeUsername('09123456789'),'+989123456789');
 assert.equal(normalizeUsername('۰۹۱۲۳۴۵۶۷۸۹'),'+989123456789');
 assert.equal(normalizeUsername('٠٩١٢٣٤٥٦٧٨٩'),'+989123456789');
 assert.equal(normalizeUsername('+98 912 345 6789'),'+989123456789');
 assert.equal(normalizeUsername('00989123456789'),'+989123456789');
});
test('normalizes ordinary usernames and rejects malformed or ambiguous values',()=>{
 assert.equal(normalizeUsername('Ramin.User_1'),'ramin.user_1');
 for(const v of ['', 'ab', 'has space', 'user/name', 'x'.repeat(65), '۱۲۳']) assert.equal(normalizeUsername(v),null);
});
test('PBKDF2 password hashes are salted, bounded and verified without storing plaintext',async()=>{
 const a=await hashPassword('Correct horse battery 42!');
 const b=await hashPassword('Correct horse battery 42!');
 assert.notEqual(a,b);
 assert.match(a,/^pbkdf2-sha256\\$600000\\$[a-f0-9]{32}\\$[a-f0-9]{64}$/);
 assert.equal(await verifyPassword('Correct horse battery 42!',a),true);
 assert.equal(await verifyPassword('Incorrect horse battery 42!',a),false);
 assert.equal(await verifyPassword('short',a),false);
 await assert.rejects(()=>hashPassword('short'),/12 to 128/);
});
test('malformed or unsupported hashes fail closed after dummy PBKDF2 work',async()=>{
 assert.equal(await verifyPassword('Correct horse battery 42!','not-a-hash'),false);
 assert.equal(await verifyPassword('x'.repeat(129),'not-a-hash'),false);
});
