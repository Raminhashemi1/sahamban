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
try{payload=JSON.parse(input);}catch{throw new Error('Provide one JSON object on stdin with username and password.');}
const username=normalizeUsername(payload?.username);
if(!username)throw new Error('Username must be an Iranian mobile number.');
const credentials=await hashPassword(payload?.password);
const userId='usr_'+randomBytes(16).toString('hex');
const createdAt=new Date().toISOString();
const q=value=>"'"+String(value).replace(/'/g,"''")+"'";
const sql=`INSERT INTO sahamban_users
(id,email_normalized,auth_subject,created_at,status,username_normalized,password_salt,password_hash,password_iterations)
VALUES (${q(userId)},NULL,NULL,${q(createdAt)},'ACTIVE',${q(username)},${q(credentials.salt)},${q(credentials.hash)},${credentials.iterations});`;
process.stdout.write('-- Execute this statement against the intended D1 database only.\n'+sql+'\n');
