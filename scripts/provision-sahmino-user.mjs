#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {hashPassword,normalizeUsername}=require('../server/password-auth.cjs');

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
const q=value=>"'"+String(value).replace(/'/g,"''")+"'";
let sql;
if(payload.userId!==undefined){
 if(typeof payload.userId!=='string'||payload.userId.length<1||payload.userId.length>128||Array.from(payload.userId).some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127))
  throw new Error('Existing userId must be a non-empty internal ID of at most 128 characters.');
 sql=`UPDATE sahamban_users
SET username_normalized=${q(username)},password_salt=${q(credentials.salt)},
 password_hash=${q(credentials.hash)},password_iterations=${credentials.iterations}
WHERE id=${q(payload.userId)} AND status='ACTIVE'
 AND (username_normalized IS NULL OR username_normalized=${q(username)});`;
}else{
 const userId='usr_'+randomBytes(16).toString('hex');
 const createdAt=new Date().toISOString();
 sql=`INSERT INTO sahamban_users
(id,email_normalized,auth_subject,created_at,status,username_normalized,password_salt,password_hash,password_iterations)
VALUES (${q(userId)},NULL,NULL,${q(createdAt)},'ACTIVE',${q(username)},${q(credentials.salt)},${q(credentials.hash)},${credentials.iterations});`;
}
process.stdout.write('-- Execute against the intended D1 database only; verify that exactly one row changes.\n'+sql+'\n');
