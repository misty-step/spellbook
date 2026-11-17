import {createHash} from 'node:crypto';
export const question = 'Did anything about the system annoy or hinder you?';
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const normalize = text => text.normalize('NFKC').trim().replace(/\s+/gu, ' ');
// Conservative local gate, not a claim that arbitrary prose can be proven secret-free.
export function secretScan(text) {
  return /-----BEGIN .*PRIVATE KEY-----|\b(?:sk|ghp|gho|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}|\b(?:password|passwd|secret|token|api[_ -]?key)\s*[:=]\s*\S{6,}|\bBearer\s+\S+|\b[A-Za-z0-9+_=]{48,}\b/i.test(text);
}
function field(value, name, max=200) {
  if(typeof value !== 'string' || !value.trim() || value.length > max || /[\r\n\x00]/.test(value)) throw Error('invalid '+name);
  return value.trim();
}
export function observation(input) {
  if(input.answer === false || /^(no|none|nothing)[.!]?$/i.test((input.text || '').trim())) return null;
  if(input.answer !== true) throw Error('explicit positive answer required');
  const text = normalize(field(input.text, 'text', 2000));
  if(text.length < 16 || /^(yes|something)[.!]?$/i.test(text)) throw Error('concrete observation required');
  const record = {schema:1};
  for(const key of ['harness','session','boundary','project','model','evidence','impact']) record[key]=field(input[key],key,key==='impact'?500:300);
  if(!['business','personal'].includes(input.collection)) throw Error('invalid collection');
  record.collection=input.collection; record.text=text;
  // Evidence is a pointer, not a transcript or an arbitrary attachment.
  if(!/^(?:https?:\/\/|[\w./~-]+[:/#]|[\w.-]+\/)/.test(record.evidence)) throw Error('evidence pointer required');
  record.timestamp=input.timestamp || new Date().toISOString();
  if(!/^\d{4}-\d\d-\d\dT.*Z$/.test(record.timestamp) || !Number.isFinite(Date.parse(record.timestamp))) throw Error('UTC timestamp required');
  if(secretScan(Object.values(record).join(' '))) throw Error('secret scan rejected observation');
  record.id=digest([record.harness,record.session,record.boundary,text]);
  return record;
}
