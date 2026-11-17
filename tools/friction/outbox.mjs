// Local-only schema-1 outbox, compatible with Supercortex friction storage.
import {mkdir,lstat,open,link,unlink,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
export async function putObservation(record,directory) {
 await mkdir(directory,{recursive:true,mode:0o700});
 const stat=await lstat(directory);
 if(!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw Error('private outbox required');
 const target=join(directory,record.id+'.json'), temp=join(directory,'.'+randomUUID());
 const file=await open(temp,'wx',0o600);
 try {
  await file.writeFile(JSON.stringify(record)+'\n'); await file.sync(); await file.close();
  try {await link(temp,target);}
  catch(e) {
   if(e.code!=='EEXIST') throw e;
   const existing=await lstat(target);
   if(!existing.isFile() || existing.isSymbolicLink() || (existing.mode & 0o077) || existing.size>16384) throw Error('invalid existing record');
   const saved=JSON.parse(await readFile(target,'utf8'));
   if(saved.id!==record.id) throw Error('invalid existing identity');
  }
  const dir=await open(directory,'r'); try {await dir.sync();} finally {await dir.close();}
 } finally {await file.close(); await unlink(temp).catch(()=>{});}
}
