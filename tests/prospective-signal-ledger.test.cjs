'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {recordProspectiveRun:record,VERSION}=require('../server/prospective-signal-ledger.cjs');
const fixed=require('../server/fixed-rule-evaluator.cjs');
const schema=fs.readFileSync('server/d1-schema.sql','utf8');
const day='20261104',stamp='2026-11-04T11:00:00.000Z';
const history=Array.from({length:60},(_,i)=>({
 date:new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10).replaceAll('-',''),close:100+i
}));
history[59]={date:day,close:159};
// Synthetic fixture for the already-attested branch of the trusted server gate; not real market evidence.
const quote=s=>({symbol:s,historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',history:history.map(x=>({...x}))});
function harness(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');sql.exec(schema);
 const db={
  prepare(source){return {bind(...params){return {source,params}}}},
  async batch(stmts){
   sql.exec('BEGIN');try{
    const r=stmts.map(x=>{const out=sql.prepare(x.source).run(...x.params);return {success:true,meta:{changes:out.changes}}});
    sql.exec('COMMIT');return r;
   }catch(e){sql.exec('ROLLBACK');throw e;}
  }
 };
 const options={marketDate:day,capturedAt:stamp,sourceId:'official-test-source',
  universe:['AAA','BBB','CCC'],snapshots:['AAA','BBB','CCC'].map(quote),
  verifyMarketData:async()=>true,
  makeId:()=> 'run-1'};
 const count=t=>sql.prepare('SELECT count(*) n FROM '+t).get().n;
 return {sql,db,options,count};
}
test('all selected symbols including WAIT are recorded; changes and deletion refused',async()=>{
 const h=harness(),r=await record(h.db,h.options);
 assert.equal(r.ruleVersion,VERSION);assert.equal(r.evaluatedCount,3);
 assert.equal(r.predictiveSkillValidated,false);assert.equal(h.count('prospective_signal_events'),3);
 const rows=h.sql.prepare('SELECT signal_code,length(history_digest) n FROM prospective_signal_events ORDER BY symbol').all();
 const expected=fixed.evaluate(quote('AAA'),{today:day,maxAgeDays:0});
 assert.ok(rows.every(x=>x.signal_code===expected.code));
 assert.equal(h.sql.prepare('SELECT rule_source_digest FROM prospective_signal_runs').get().rule_source_digest,fixed.ruleSourceSha256);
 assert.ok(rows.every(x=>x.n===64));
 assert.throws(()=>h.sql.prepare("UPDATE prospective_signal_events SET signal_code='WAIT'").run(),/PROSPECTIVE_IMMUTABLE/);
 assert.throws(()=>h.sql.prepare('DELETE FROM prospective_signal_runs').run(),/PROSPECTIVE_IMMUTABLE/);
});
test('unattested historical price basis is recorded as unavailable, never as a trade signal',async()=>{
 const h=harness();
 h.options.snapshots[0].historyPriceBasisEvidence='NOT_ESTABLISHED';
 delete h.options.snapshots[1].historyPriceBasisEvidence;
 h.options.snapshots[2].historyPriceBasisEvidence='SELF_ATTESTED';
 const result=await record(h.db,h.options);
 assert.equal(result.unavailableCount,3);
 assert.equal(result.evaluatedCount,0);
 const rows=h.sql.prepare('SELECT status,signal_code,history_digest FROM prospective_signal_events').all();
 assert.equal(rows.length,3);
 assert.ok(rows.every(r=>r.status==='DATA_UNAVAILABLE'&&r.signal_code===null&&r.history_digest===null));
});
test('missing history is recorded as unavailable rather than excluded',async()=>{
 const h=harness();h.options.snapshots[1].history=[];
 const result=await record(h.db,h.options);
 assert.equal(result.unavailableCount,1);
 const row=h.sql.prepare("SELECT status,signal_code FROM prospective_signal_events WHERE symbol='BBB'").get();
 assert.equal(row.status,'DATA_UNAVAILABLE');assert.equal(row.signal_code,null);
});
test('untrusted source, incomplete universe, and next-day captures never write',async()=>{
 for(const alter of [
  o=>({...o,verifyMarketData:async()=>false}),
  o=>({...o,verifyMarketData:null}),
  o=>({...o,capturedAt:'2026-11-05T11:00:00.000Z'}),
  o=>({...o,snapshots:o.snapshots.slice(1)}),
  o=>({...o,universe:['AAA','AAA','CCC']}),
  o=>({...o,snapshots:[o.snapshots[0],o.snapshots[0],o.snapshots[2]]})
 ]){
  const h=harness();await assert.rejects(record(h.db,alter(h.options)));
  assert.equal(h.count('prospective_signal_events'),0);
 }
});
test('browser-supplied and injected fake scores cannot override the server-fixed rule engine',async()=>{
 const h=harness();
 h.options.snapshots.forEach(q=>{q.code='GUARANTEED_PROFIT';q.score=100;});
 h.options.calculateDecision=async()=>({code:'GUARANTEED_PROFIT',score:100});
 const r=await record(h.db,h.options);
 assert.equal(r.unavailableCount,0);assert.equal(r.evaluatedCount,3);
 assert.equal(r.ruleSourceSha256,fixed.ruleSourceSha256);
 const codes=h.sql.prepare('SELECT signal_code FROM prospective_signal_events').all().map(x=>x.signal_code);
 assert.ok(codes.every(x=>x!=='GUARANTEED_PROFIT'));
});
test('duplicate backfilled same-day record rolls back; original history cannot be overwritten',async()=>{
 const h=harness();await record(h.db,h.options);
 await assert.rejects(record(h.db,{...h.options,makeId:()=> 'run-2'}),/ATOMIC_PROSPECTIVE_RECORD_FAILED/);
 assert.equal(h.count('prospective_signal_runs'),1);assert.equal(h.count('prospective_signal_events'),3);
});
test('failure within a batch rolls back all observations and parent record',async()=>{
 const h=harness(),batch=h.db.batch;
 h.db.batch=async statements=>{
  statements.splice(2,0,h.db.prepare('INSERT INTO deliberately_missing_table VALUES(1)').bind());
  return batch(statements);
 };
 await assert.rejects(record(h.db,h.options),/ATOMIC_PROSPECTIVE_RECORD_FAILED/);
 assert.equal(h.count('prospective_signal_runs'),0);assert.equal(h.count('prospective_signal_events'),0);
});
