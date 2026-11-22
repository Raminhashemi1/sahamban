#!/usr/bin/env node
import { randomBytes, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {hashPassword,normalizeUsername,createRecoveryCodes}=require('../server/password-auth.cjs');

const input=await new Promise((resolve,reject)=>{
 let data='';
 process.stdin.setEncoding('utf8');
 process.stdin.on('data',chunk=>{data+=chunk;if(data.length>4096)reject(new Error('Input too large'));});
 process.stdin.on('end',()=>resolve(data));
});
let payload;
try{payload=JSON.parse(input);}catch{throw new Error('Provide one JSON object on stdin with username, password, and optional existing userId.');}
const username=normalizeUsername(payload?.username);
if(!username)throw new Error('Username must be an Iranian mobile number.');
const credentials=await hashPassword(payload?.password);
const recoveryCodes=createRecoveryCodes(10);
const q=value=>"'"+String(value).replace(/'/g,"''")+"'";
const stamp=new Date().toISOString();
let userId,upsert;
if(payload.userId!==undefined){
 if(typeof payload.userId!=='string'||payload.userId.length<1||payload.userId.length>128||Array.from(payload.userId).some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127))
  throw new Error('Existing userId must be a non-empty internal ID of at most 128 characters.');
 userId=payload.userId;
 upsert=`UPDATE sahamban_users
SET username_normalized=${q(username)},password_salt=${q(credentials.salt)},
 password_hash=${q(credentials.hash)},password_iterations=${credentials.iterations}
WHERE id=${q(userId)} AND status='ACTIVE'
 AND (username_normalized IS NULL OR username_normalized=${q(username)});
`;
}else{
 userId='usr_'+randomBytes(16).toString('hex');
 upsert=`INSERT INTO sahamban_users
(id,email_normalized,auth_subject,created_at,status,username_normalized,password_salt,password_hash,password_iterations)
VALUES (${q(userId)},NULL,NULL,${q(stamp)},'ACTIVE',${q(username)},${q(credentials.salt)},${q(credentials.hash)},${credentials.iterations});
`;
}
const recoveryRows=recoveryCodes.map((code,index)=>{
 const digest=createHash('sha256').update(code.replace(/-/g,''),'utf8').digest('hex');
 return `INSERT INTO sahmino_recovery_codes(id,user_id,code_hash,created_at)
 SELECT ${q('rcv_'+randomBytes(16).toString('hex'))},${q(userId)},${q(digest)},${q(stamp)}
 WHERE EXISTS(SELECT 1 FROM sahamban_users WHERE id=${q(userId)} AND username_normalized=${q(username)} AND status='ACTIVE');`;
});
const sql=`${upsert}
DELETE FROM sahmino_recovery_codes WHERE user_id=${q(userId)}
 AND EXISTS(SELECT 1 FROM sahamban_users WHERE id=${q(userId)} AND username_normalized=${q(username)} AND status='ACTIVE');
${recoveryRows.join('\n')}`;
process.stdout.write(JSON.stringify({
 instructions:'Execute the sql field against the intended D1 database and securely save the recoveryCodes now. They are shown only once and cannot be retrieved later.',
 sql,
 recoveryCodes
},null,2)+'\n');
