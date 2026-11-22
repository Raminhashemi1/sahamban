'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');

function run(payload){
 return spawnSync(process.execPath,['scripts/provision-sahmino-user.mjs'],{
  input:JSON.stringify(payload),encoding:'utf8',timeout:10000
 });
}
function parsed(result){assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}
test('existing account provisioning rotates password and emits ten one-time recovery codes',()=>{
 const password='A secure test password 2026!';
 const result=parsed(run({userId:'legacy-user-42',username:'۰۹۱۲۳۴۵۶۷۸۹',password}));
 assert.match(result.sql,/UPDATE sahamban_users/);
 assert.match(result.sql,/WHERE id='legacy-user-42' AND status='ACTIVE'/);
 assert.match(result.sql,/DELETE FROM sahmino_recovery_codes/);
 assert.equal((result.sql.match(/INSERT INTO sahmino_recovery_codes/g)||[]).length,10);
 assert.equal(result.recoveryCodes.length,10);
 assert.equal(new Set(result.recoveryCodes).size,10);
 for(const code of result.recoveryCodes)assert.match(code,/^[A-F0-9]{6}(?:-[A-F0-9]{6}){3}$/);
 assert.doesNotMatch(result.sql,new RegExp(password));
 assert.doesNotMatch(result.sql,/password_hash='[A-Z]/);
});
test('new account provisioning emits a fresh internal ID and recovery-code digests',()=>{
 const result=parsed(run({username:'09123456789',password:'A secure test password 2026!'}));
 assert.match(result.sql,/INSERT INTO sahamban_users/);
 assert.match(result.sql,/usr_[a-f0-9]{32}/);
 assert.equal(result.recoveryCodes.length,10);
 assert.doesNotMatch(result.sql,new RegExp(result.recoveryCodes[0].replace(/-/g,'')));
});
test('provisioning rejects malformed existing account identifiers and weak passwords',()=>{
 assert.notEqual(run({userId:'',username:'09123456789',password:'A secure test password 2026!'}).status,0);
 assert.notEqual(run({username:'09123456789',password:'weak'}).status,0);
});
