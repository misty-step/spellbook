#!/usr/bin/env node
import {mkdir,open,lstat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {observation,question,digest} from './contract.mjs';
const directory=process.env.FRICTION_OUTBOX || homedir()+'/.local/state/misty/friction';
async function input() {
  let text='';
  for await(const chunk of process.stdin) {text+=chunk; if(Buffer.byteLength(text)>16384) throw Error('input too large');}
  return JSON.parse(text);
}
async function once(key) {
  const guards=resolve(directory,'guards');
  for(const path of [directory,guards]) {
    await mkdir(path,{recursive:true,mode:0o700});
    const stat=await lstat(path);
    if(!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw Error('private guard directory required');
  }
  try {const f=await open(resolve(guards,digest(key)), 'wx',0o600); await f.sync(); await f.close(); return true;}
  catch(e) {if(e.code==='EEXIST') return false; throw e;}
}
try {
 const [action,harness]=process.argv.slice(2), data=await input();
 if(action==='capture') {
  const record=observation({...data,model:process.env.FRICTION_MODEL || data.model});
  if(record) {
   const module=process.env.FRICTION_STORAGE_MODULE;
   const {putObservation}=await import(module ? pathToFileURL(resolve(module)).href : './outbox.mjs');
   await putObservation(record,directory); console.log(JSON.stringify({id:record.id}));
  }
 } else if(action==='hook' || action==='ask') {
  if(process.env.FRICTION_DISABLED==='1' || data.stop_hook_active || data.hook_event_name==='SessionEnd' || (harness==='antigravity' && data.fullyIdle!==true)) process.exit(0);
  const session=data.session_id || data.sessionId || data.conversationId;
  if(typeof session!=='string' || !session || session.length>300) throw Error('missing session id');
  const agent=data.agent_id || data.agentId || 'main';
  if(!await once([harness,session,agent])) process.exit(0);
  const template={answer:true,harness,session,boundary:'completion:'+agent,project:process.env.FRICTION_PROJECT||data.cwd||data.workspacePaths?.[0]||'unknown',model:process.env.FRICTION_MODEL||data.modelName||'unknown',collection:process.env.FRICTION_COLLECTION||'business',evidence:'run:'+session,impact:'<concrete consequence>',text:'<concrete positive answer>'};
  const reason=`Privately reflect once: ${question} If no, write nothing. If yes, write one JSON line (replace placeholders) to: node ${JSON.stringify(resolve(process.argv[1]))} capture. Input: ${JSON.stringify(template)}. Do not put the reflection in the user response. Capture is best effort: finish even if it fails; do not retry reflection or invoke another agent. Never include secrets or transcript bodies.`;
  console.log(JSON.stringify({decision:harness==='antigravity'?'continue':'block',reason}));
 } else throw Error('use capture | hook HARNESS | ask HARNESS (JSON stdin)');
} catch(e) {
 // A hook must fail open; never request another continuation after a capture error.
 if(process.argv[2]==='hook') {process.stderr.write('friction hook skipped\n');}
 else {process.stderr.write('friction: rejected or unavailable input/storage\n');process.exitCode=1;}
}
