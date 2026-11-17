import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observation} from './contract.mjs';
const input={answer:true,harness:'codex',session:'s',boundary:'end',project:'p',model:'unknown',collection:'business',evidence:'run:s',impact:'wasted a minute',text:'The missing file prevented the check.'};
test('positive only; normalized deterministic IDs; reject secrets and bounds',()=>{
 assert.equal(observation({...input,answer:false}),null);
 assert.equal(observation({...input,text:'no'}),null);
 assert(observation({...input,text:'cat /home/user/m1194-evidence/intentionally-missing-config.txt failed: No such file or directory.'}));
 assert.equal(observation(input).id,observation({...input,text:' The missing  file prevented the check. ',timestamp:'2026-11-17T00:00:00Z'}).id);
 for(const text of ['yes','a'.repeat(2001),'token=syntheticpasswordvalue']) assert.throws(()=>observation({...input,text}));
 assert.throws(()=>observation({...input,collection:'other'}));
});
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('./cli.mjs',import.meta.url));
test('one prompt across turns and failure; independent subagent; advisory SessionEnd',async()=>{
 const directory=await mkdtemp(tmpdir()+'/friction-guard-');
 const hook=(body,harness='claude')=>spawnSync(process.execPath,[cli,'hook',harness],{input:JSON.stringify(body),encoding:'utf8',env:{...process.env,FRICTION_OUTBOX:directory}});
 try {
  const body={session_id:'session',hook_event_name:'Stop'};
  assert.equal(JSON.parse(hook(body).stdout).decision,'block');
  assert.equal(hook(body).stdout,'');
  assert.equal(hook({...body,stop_hook_active:true,agent_id:'skip'}).stdout,'');
  assert.equal(JSON.parse(hook({...body,agent_id:'child'}).stdout).decision,'block');
  assert.equal(hook({...body,hook_event_name:'SessionEnd',agent_id:'end'}).stdout,'');
  assert.equal((await readdir(directory+'/guards')).length,2);
  assert.equal(JSON.parse(hook({conversationId:'agy',fullyIdle:true},'antigravity').stdout).decision,'continue');
  assert.equal(hook({conversationId:'agy',fullyIdle:true},'antigravity').stdout,'');
 } finally {await rm(directory,{recursive:true,force:true});}
});

test('concurrent hook claims emit one prompt',async()=>{
 const directory=await mkdtemp(tmpdir()+'/friction-race-');
 try {
  const results=await Promise.all(Array.from({length:8},()=>new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[cli,'hook','codex'],{env:{...process.env,FRICTION_OUTBOX:directory}});let out='';
   child.stdout.on('data',x=>out+=x);child.on('error',reject);child.on('close',()=>resolve(out));
   child.stdin.end(JSON.stringify({session_id:'concurrent',hook_event_name:'Stop'}));
  })));
  assert.equal(results.filter(Boolean).length,1);
 } finally {await rm(directory,{recursive:true,force:true});}
});

test('Prime completion brief: positive capture, clean silence, stable retry and guard',async()=>{
 const directory=await mkdtemp(tmpdir()+'/friction-prime-');
 const env={...process.env,FRICTION_OUTBOX:directory};
 // No pre-existing storage fixture exists in this suite. Inject a test-only
 // ID-keyed sink through the same external module boundary as production.
 env.FRICTION_STORAGE_MODULE=directory+'/storage-stub.mjs';
 await writeFile(env.FRICTION_STORAGE_MODULE,`
  import {writeFile} from 'node:fs/promises';
  export async function putObservation(record,directory) {
   try {await writeFile(directory+'/'+record.id+'.json',JSON.stringify(record),{flag:'wx'});}
   catch(e) {if(e.code!=='EEXIST') throw e;}
  }
 `);
 delete env.FRICTION_MODEL;
 const run=(args,body)=>spawnSync(process.execPath,[cli,...args],{input:JSON.stringify(body),encoding:'utf8',env});
 try {
  const brief=run(['ask','prime'],{session_id:'prime-seeded'});
  assert.equal(brief.status,0);
  const template=JSON.parse(JSON.parse(brief.stdout).reason.split('Input: ')[1].split('. Do not put')[0]);
  assert.equal(template.harness,'prime');
  const answer={...template,impact:'Blocked the requested check',text:'The referenced configuration file was missing.'};
  const first=run(['capture'],answer), retry=run(['capture'],answer);
  assert.equal(first.status,0); assert.equal(retry.status,0);
  assert.deepEqual(JSON.parse(first.stdout),JSON.parse(retry.stdout));
  assert.equal(run(['ask','prime'],{session_id:'prime-seeded'}).stdout,'');
  const clean=run(['ask','prime'],{session_id:'prime-clean'});
  assert(clean.stdout);
  assert.equal(run(['capture'],{answer:false,harness:'prime'}).status,0);
  const records=(await readdir(directory)).filter(x=>x.endsWith('.json'));
  assert.equal(records.length,1);
  const saved=JSON.parse(await readFile(directory+'/'+records[0],'utf8'));
  assert.equal(saved.harness,'prime'); assert.equal(saved.id,JSON.parse(first.stdout).id);
 } finally {await rm(directory,{recursive:true,force:true});}
});

test('missing external storage rejects capture without clearing the Prime prompt guard',async()=>{
 const directory=await mkdtemp(tmpdir()+'/friction-no-storage-');
 const env={...process.env,FRICTION_OUTBOX:directory}; delete env.FRICTION_STORAGE_MODULE;
 const run=(action,body)=>spawnSync(process.execPath,[cli,action,'prime'],{input:JSON.stringify(body),encoding:'utf8',env});
 try {
  assert(run('ask',{session_id:'failure'}).stdout);
  const result=run('capture',{...input,harness:'prime'});
  assert.equal(result.status,1); assert.match(result.stderr,/unavailable input\/storage/);
  assert.equal(run('ask',{session_id:'failure'}).stdout,'');
  assert.deepEqual((await readdir(directory)).filter(x=>x.endsWith('.json')),[]);
 } finally {await rm(directory,{recursive:true,force:true});}
});
