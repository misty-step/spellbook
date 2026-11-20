import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

process.env.SITE_COMMIT ??= 'a'.repeat(40);
const { buildSkillIndex } = await import('../src/lib/skill-index-build.mjs');

const REVISION = 'b'.repeat(40);
const CATALOG_SHA = 'c'.repeat(40);
const SUBDIR_SHA = 'd'.repeat(40);
const roots = [];
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

const gitBlob = (text) => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const skill = (name, body) => `---\nname: ${name}\ndescription: ${name} description.\n---\n${body}\n`;
const catalogA = { name: 'catalog-a', source: { source: 'github', repo: 'acme/skills', sha: CATALOG_SHA } };
const catalogB = { name: 'catalog-b', source: { source: 'git-subdir', url: 'https://github.com/acme/mono.git', path: 'plugins/b', sha: SUBDIR_SHA } };
const upstream = {
  [`acme/skills@${CATALOG_SHA}`]: {
    'README.md': '# Acme\n',
    'skills/alpha/SKILL.md': skill('alpha', 'Catalog body.'),
    'skills/alpha/REFERENCE.md': 'Supporting detail is not judged.\n',
    'skills/group/nested/SKILL.md': skill('nested', 'Nested skills are not discovered.'),
  },
  [`acme/mono@${SUBDIR_SHA}`]: {
    'plugins/b/.claude-plugin/plugin.json': JSON.stringify({ name: 'catalog-b', skills: './extra' }),
    'plugins/b/skills/delta/SKILL.md': skill('delta', 'Default path body.'),
    'plugins/b/extra/epsilon/SKILL.md': skill('epsilon', 'Declared path body.'),
    'plugins/other/skills/unrelated/SKILL.md': skill('unrelated', 'Another plugin in the same repository.'),
  },
};

function github(repositories) {
  const requests = [];
  async function fetch(url) {
    requests.push(url);
    const tree = /^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/git\/trees\/([0-9a-f]{40})\?recursive=1$/.exec(url);
    const raw = /^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([0-9a-f]{40})\/(.+)$/.exec(url);
    const match = tree ?? raw;
    const files = match ? repositories[`${match[1]}@${match[2]}`] : undefined;
    if (tree && files) {
      const entries = Object.entries(files).map(([file, text]) => ({ path: file, mode: '100644', type: 'blob', sha: gitBlob(text) }));
      return new Response(JSON.stringify({ sha: '0'.repeat(40), truncated: false, tree: entries }));
    }
    const text = raw ? files?.[raw[3].split('/').map(decodeURIComponent).join('/')] : undefined;
    return text === undefined ? new Response('Not Found', { status: 404 }) : new Response(text);
  }
  return { fetch, requests };
}

function fixture() {
  const scratch = process.env.TMPDIR ?? path.join(homedir(), '.cache/tmp');
  mkdirSync(scratch, { recursive: true });
  const base = mkdtempSync(path.join(scratch, 'skill-index-'));
  roots.push(base);
  const root = path.join(base, 'repo');
  const put = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  const catalog = (...plugins) => put('.claude-plugin/marketplace.json', JSON.stringify({
    name: 'mistystack', owner: { name: 'Fixture' }, plugins: [{ name: 'mistystack', source: './' }, ...plugins],
  }));
  put('skills/alpha/SKILL.md', skill('alpha', 'Repository body.'));
  catalog(catalogA, catalogB);
  const build = (fetch) => buildSkillIndex({ root, revision: REVISION, cacheDir: path.join(base, 'cache'), fetch });
  return { base, put, catalog, build };
}

test('indexes repository and pinned catalog skills with provenance and invocation', async () => {
  const { build } = fixture();
  const remote = github(upstream);
  const index = await build(remote.fetch);
  const entry = (id) => index.skills.find((candidate) => candidate.id === id);
  assert.equal(index.revision, REVISION);
  assert.deepEqual(index.skills.map((candidate) => candidate.id), [
    'catalog-a:alpha', 'catalog-b:delta', 'catalog-b:epsilon', 'mistystack:alpha',
  ]);
  assert.deepEqual(entry('catalog-a:alpha'), {
    id: 'catalog-a:alpha', name: 'alpha', pack: 'catalog-a', pin: CATALOG_SHA, description: 'alpha description.',
    core: 'Catalog body.', coreBytes: 13, coreTruncated: false,
    source: { pack: 'catalog-a', pin: CATALOG_SHA, repository: 'https://github.com/acme/skills', path: 'skills/alpha/SKILL.md' },
    invoke: { skill: '/skill:alpha', install: 'claude plugin install catalog-a@mistystack' },
    url: `https://github.com/acme/skills/blob/${CATALOG_SHA}/skills/alpha/SKILL.md`,
  });
  assert.deepEqual(entry('catalog-b:epsilon').source, { pack: 'catalog-b', pin: SUBDIR_SHA, repository: 'https://github.com/acme/mono', path: 'plugins/b/extra/epsilon/SKILL.md' });
  assert.deepEqual(entry('mistystack:alpha').invoke, { skill: '/skill:alpha', install: null });
  assert.equal(entry('mistystack:alpha').url, `https://github.com/misty-step/mistystack/blob/${REVISION}/skills/alpha/SKILL.md`);
  assert.deepEqual(remote.requests.filter((url) => /REFERENCE\.md|nested|unrelated/.test(url)), []);
});

test('caps judged core text at 8000 UTF-8 bytes on a code point boundary', async () => {
  const { put, build } = fixture();
  put('skills/alpha/SKILL.md', skill('alpha', `${'a'.repeat(7998)}€ beyond the cap`));
  const index = await build(github(upstream).fetch);
  const alpha = index.skills.find((candidate) => candidate.id === 'mistystack:alpha');
  assert.equal(index.coreTextLimitBytes, 8000);
  assert.deepEqual(
    { core: alpha.core, coreBytes: alpha.coreBytes, coreTruncated: alpha.coreTruncated },
    { core: 'a'.repeat(7998), coreBytes: 7998, coreTruncated: true },
  );
});

test('builds offline from the pin-scoped cache and refuses unusable cache entries', async () => {
  const { base, catalog, build } = fixture();
  const offline = async () => {
    throw new Error('network unavailable');
  };
  const online = await build(github(upstream).fetch);
  assert.equal(JSON.stringify(await build(offline)), JSON.stringify(online));

  const alpha = upstream[`acme/skills@${CATALOG_SHA}`]['skills/alpha/SKILL.md'];
  writeFileSync(path.join(base, 'cache', 'github.com', 'acme', 'skills', CATALOG_SHA, 'blobs', gitBlob(alpha)), 'tampered');
  await assert.rejects(build(offline), /acme\/skills@c{40}: cannot read skills\/alpha\/SKILL\.md and no usable cache: .*network unavailable/);

  const moved = '2'.repeat(40);
  catalog({ ...catalogA, source: { ...catalogA.source, sha: moved } });
  await assert.rejects(build(offline), new RegExp(`acme/skills@${moved}: cannot read pinned source tree and no usable cache: .*network unavailable`));
});

test('fails loudly for an unpinned or unreadable catalog source', async () => {
  const { catalog, build } = fixture();
  catalog({ ...catalogA, source: { source: 'github', repo: 'acme/skills' } });
  await assert.rejects(build(github(upstream).fetch), /catalog-a: catalog source must pin an exact 40-character commit sha/);
  catalog(catalogA);
  await assert.rejects(build(github({}).fetch), /acme\/skills@c{40}: cannot read pinned source tree and no usable cache: .*HTTP 404/);
});
