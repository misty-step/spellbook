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
 await storageStub(env.FRICTION_STORAGE_MODULE);
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

async function storageStub(path) {
 await writeFile(path,`
  import {writeFile} from 'node:fs/promises';
  export async function putObservation(record,directory) {
   try {await writeFile(directory+'/'+record.id+'.json',JSON.stringify(record),{flag:'wx'});}
   catch(e) {if(e.code!=='EEXIST') throw e;}
  }
 `);
}

import piFriction from '../../adapters/friction/pi/index.ts';

test('Pi native agent_end: positive, clean, stable retry, persistent guard and failure',async(t)=>{
 const directory=await mkdtemp(tmpdir()+'/friction-pi-');
 const original={...process.env};
 process.env.FRICTION_OUTBOX=directory;
 process.env.FRICTION_STORAGE_MODULE=directory+'/storage-stub.mjs';
 delete process.env.FRICTION_MODEL; delete process.env.FRICTION_DISABLED;
 const run=(action,body)=>spawnSync(process.execPath,[cli,action,'pi'],{
  input:JSON.stringify(body),encoding:'utf8',env:process.env});
 try {
  await storageStub(process.env.FRICTION_STORAGE_MODULE);
  const handlers={},sent=[];
  piFriction({on:(name,handler)=>handlers[name]=handler,
   sendMessage:(message,options)=>sent.push({message,options})});
  assert.deepEqual(Object.keys(handlers),['agent_end']);
  const ctx=session=>({cwd:'scratch',model:{provider:'test',id:'model'},
   sessionManager:{getSessionId:()=>session}});
  // Any attempt to inspect event messages/transcripts fails this test.
  const event=new Proxy({}, {get:()=>{throw Error('must not read messages');}});
  await handlers.agent_end(event,ctx('pi-seeded'));
  assert.equal(sent.length,1);
  assert.equal(sent[0].message.display,false);
  assert.deepEqual(sent[0].options,{triggerTurn:true,deliverAs:'followUp'});
  const template=JSON.parse(sent[0].message.content.split('Input: ')[1].split('. Do not put')[0]);
  assert.equal(template.harness,'pi');
  assert.equal(template.session,'pi-seeded');
  assert.equal(template.model,'test/model');
  const answer={...template,impact:'Blocked the requested check',
   text:'The referenced configuration file was missing.'};
  const first=run('capture',answer),retry=run('capture',answer);
  assert.equal(first.status,0); assert.equal(retry.status,0);
  assert.deepEqual(JSON.parse(first.stdout),JSON.parse(retry.stdout));
  await handlers.agent_end(event,ctx('pi-seeded'));
  // Reconstruct the extension: no in-memory flag can satisfy the guard.
  piFriction({on:(name,handler)=>handlers[name]=handler,
   sendMessage:message=>sent.push({message})});
  await handlers.agent_end(event,ctx('pi-seeded'));
  assert.equal(sent.length,1);
  await handlers.agent_end(event,ctx('pi-clean'));
  assert.equal(sent.length,2);
  assert.equal(run('capture',{answer:false,harness:'pi'}).status,0);
  delete process.env.FRICTION_STORAGE_MODULE;
  await handlers.agent_end(event,ctx('pi-failure'));
  assert.equal(run('capture',{...answer,session:'pi-failure'}).status,1);
  await handlers.agent_end(event,ctx('pi-failure'));
  assert.equal(sent.length,3);
  process.env.FRICTION_DISABLED='1';
  await handlers.agent_end(event,ctx('pi-disabled'));
  assert.equal(sent.length,3);
  const records=(await readdir(directory)).filter(x=>x.endsWith('.json'));
  assert.equal(records.length,1);
  const saved=JSON.parse(await readFile(directory+'/'+records[0],'utf8'));
  assert.equal(saved.harness,'pi'); assert.equal(saved.id,JSON.parse(first.stdout).id);
  assert.equal((await readdir(directory+'/guards')).length,3);
  t.diagnostic(JSON.stringify({kind:'contract-only',seeded:{count:1,id:saved.id},clean:{count:0,ids:[]},retry:{total:1,additional:0,id:saved.id}}));
 } finally {
  for(const key of Object.keys(process.env)) if(!(key in original)) delete process.env[key];
  Object.assign(process.env,original);
  await rm(directory,{recursive:true,force:true});
 }
});

test('Codex native SubagentStop and Misty completion: isolated guards, attribution, clean and retry',async()=>{
 const directory=await mkdtemp(tmpdir()+'/friction-codex-');
 const env={...process.env,FRICTION_OUTBOX:directory,FRICTION_STORAGE_MODULE:directory+'/storage-stub.mjs'};
 delete env.FRICTION_MODEL; delete env.FRICTION_DISABLED;
 const run=(action,body)=>spawnSync(process.execPath,[cli,action,'codex'],{input:JSON.stringify(body),encoding:'utf8',env});
 const template=result=>JSON.parse(JSON.parse(result.stdout).reason.split('Input: ')[1].split('. Do not put')[0]);
 try {
  await storageStub(env.FRICTION_STORAGE_MODULE);
  const adapter=JSON.parse(await readFile(new URL('../../adapters/friction/codex.json',import.meta.url),'utf8'));
  assert.deepEqual(adapter.hooks.SubagentStop,adapter.hooks.Stop);
  const child={session_id:'parent-session',agent_id:'child-session',hook_event_name:'SubagentStop',model:'gpt-6.1-sol',transcript_path:'/must-not-read',agent_transcript_path:'/must-not-read',last_assistant_message:'must not copy'};
  const brief=template(run('hook',child));
  assert.equal(brief.session,'child-session'); assert.equal(brief.boundary,'completion:child-session');
  assert.equal(brief.model,'gpt-6.1-sol'); assert.equal(brief.evidence,'run:child-session');
  const answer={...brief,text:'The required workspace check command was missing.',impact:'Could not verify the workspace'};
  const first=run('capture',answer),retry=run('capture',answer);
  assert.equal(first.status,0); assert.deepEqual(JSON.parse(first.stdout),JSON.parse(retry.stdout));
  assert.equal(run('hook',child).stdout,'');
  assert.equal(run('hook',{session_id:'parent-session',hook_event_name:'SubagentStop'}).stdout,'');
  const parent={session_id:'parent-session',hook_event_name:'Stop'};
  assert(run('hook',parent).stdout); assert.equal(run('hook',parent).stdout,'');
  assert.equal(run('hook',{...child,stop_hook_active:true,agent_id:'recursion'}).stdout,'');
  const clean={...child,session_id:'clean-child',agent_id:'clean-child'};
  assert(run('hook',clean).stdout); assert.equal(run('capture',{answer:false}).stdout,'');
  // Entry journey calls the same ask boundary: no new layer or storage path.
  const entry=template(run('ask',{session_id:'misty-seeded'}));
  assert.equal(run('capture',{...answer,...entry,text:answer.text,impact:answer.impact}).status,0);
  assert.equal(run('ask',{session_id:'misty-seeded'}).stdout,'');
  assert(run('ask',{session_id:'misty-clean'}).stdout); assert.equal(run('capture',{answer:false}).status,0);
  delete env.FRICTION_STORAGE_MODULE;
  assert(run('hook',{...child,session_id:'failed',agent_id:'failed'}).stdout);
  assert.equal(run('capture',{...answer,session:'failed'}).status,1);
  assert.equal(run('hook',{...child,session_id:'failed',agent_id:'failed'}).stdout,'');
  const records=await Promise.all((await readdir(directory)).filter(x=>x.endsWith('.json')).map(x=>readFile(directory+'/'+x,'utf8').then(JSON.parse)));
  assert.equal(records.length,2);
  assert.equal(records.filter(x=>x.session==='child-session').length,1);
  assert.equal(records.filter(x=>x.session==='misty-seeded').length,1);
 } finally {await rm(directory,{recursive:true,force:true});}
});
