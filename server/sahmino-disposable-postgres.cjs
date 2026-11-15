'use strict';
// Staging-only PostgreSQL adapter. Never auto-connect, deploy or grant entitlement.
// Caller provides the pg.Pool constructor; package is installed ONLY in CI.
const {STAGING_READ_SQL}=require('./sahmino-staging-snapshot-reader.cjs');
function createDisposablePostgresQuery({Pool,env={}}={}){
 if(typeof Pool!=='function')throw new TypeError('POSTGRES_POOL_REQUIRED');
 if(env.PGHOST!=='127.0.0.1'||env.PGDATABASE!=='sahmino_synthetic_ci'||
  env.PGPORT!=='5432'||env.PGUSER!=='sahmino_ci'||
  typeof env.PGPASSWORD!=='string'||env.PGPASSWORD.length<8)
  throw new Error('REFUSE_NON_DISPOSABLE_POSTGRES');
 const pool=new Pool({host:'127.0.0.1',port:5432,database:'sahmino_synthetic_ci',
  user:'sahmino_ci',password:env.PGPASSWORD,
  max:2,connectionTimeoutMillis:1500,idleTimeoutMillis:2000,
  options:'-c default_transaction_read_only=on',
  application_name:'sahmino_synthetic_ci_read_only'});
 let closed=false;
 async function query(sql,params){
  if(closed)throw new Error('STAGING_POOL_CLOSED');
  if(sql!==STAGING_READ_SQL||!Array.isArray(params)||params.length!==1||
   typeof params[0]!=='string'||
   !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params[0]))
   throw new Error('STAGING_SELECT_ONLY');
  return pool.query(sql,params);
 }
 async function close(){if(!closed){closed=true;await pool.end();}}
 return Object.freeze({query,close,simulationOnly:true});
}
module.exports=Object.freeze({createDisposablePostgresQuery});
