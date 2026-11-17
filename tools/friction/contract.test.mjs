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
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
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
