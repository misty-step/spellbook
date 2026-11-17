import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import type {ExtensionAPI} from '@mariozechner/pi-coding-agent';

const cli=fileURLToPath(new URL('../../../tools/friction/cli.mjs',import.meta.url));

// Pi 0.73.1: agent_end is once per user prompt, not once per tool turn.
export default function friction(pi: ExtensionAPI) {
  pi.on('agent_end', async (_event,ctx) => {
    try {
      const body={
        session_id:ctx.sessionManager.getSessionId(),
        cwd:ctx.cwd,
        modelName:ctx.model ? ctx.model.provider+'/'+ctx.model.id : 'unknown',
      };
      const stdout=await new Promise<string>((resolve,reject)=>{
        const child=execFile(process.execPath,[cli,'hook','pi'],
          {timeout:5000,maxBuffer:16384},(error,stdout)=>{
            if(error) reject(error); else resolve(stdout);
          });
        child.stdin?.on('error',()=>{});
        child.stdin?.end(JSON.stringify(body));
      });
      if(!stdout.trim()) return;
      const {reason}=JSON.parse(stdout);
      if(typeof reason==='string') {
        pi.sendMessage({customType:'misty-friction',content:reason,display:false},
          {triggerTurn:true,deliverAs:'followUp'});
      }
    } catch {
      // Fail open. The CLI claims the persistent guard before any continuation.
    }
  });
}
