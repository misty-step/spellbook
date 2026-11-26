import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const repoRoot = process.env.STACK_REPO_ROOT || fileURLToPath(new URL('../../../', import.meta.url));
export const canonical = 'https://stack.mistystep.io';
const commit = process.env.SITE_COMMIT || process.env.GITHUB_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('Site commit must be a full Git SHA.');
export const release = Object.freeze({
  commit,
  version: JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version,
  builtAt: new Date().toISOString(),
  canonical,
});
export const repositoryUrl = 'https://github.com/misty-step/spellbook';
export const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');
export const blobUrl = (path) => `${repositoryUrl}/blob/${commit}/${encodePath(path)}`;
