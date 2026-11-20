'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');

function run(payload){
 return spawnSync(process.execPath,['scripts/provision-sahmino-user.mjs'],{
  input:JSON.stringify(payload),encoding:'utf8',timeout:10000
 });
}
test('provisioning existing backfilled account emits a guarded update and no plaintext password',()=>{
 const password='A secure test password 2026!';
 const result=run({userId:'legacy-user-42',username:'۰۹۱۲۳۴۵۶۷۸۹',password});
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/UPDATE sahamban_users/);
 assert.match(result.stdout,/WHERE id='legacy-user-42' AND status='ACTIVE'/);
 assert.match(result.stdout,/password_hash='[a-f0-9]{64}'/);
 assert.match(result.stdout,/password_salt='[a-f0-9]{32}'/);
 assert.doesNotMatch(result.stdout,new RegExp(password));
 assert.doesNotMatch(result.stdout,/INSERT INTO sahamban_users/);
});
test('provisioning a new account emits a fresh internal ID insert',()=>{
 const password='A secure test password 2026!';
 const result=run({username:'09123456789',password});
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/INSERT INTO sahamban_users/);
 assert.match(result.stdout,/usr_[a-f0-9]{32}/);
 assert.match(result.stdout,/,'[a-f0-9]{64}',310000/);
 assert.doesNotMatch(result.stdout,new RegExp(password));
});
test('provisioning rejects malformed existing account identifiers and weak passwords',()=>{
 assert.notEqual(run({userId:'',username:'09123456789',password:'A secure test password 2026!'}).status,0);
 assert.notEqual(run({username:'09123456789',password:'weak'}).status,0);
});
