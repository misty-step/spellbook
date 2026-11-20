import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { encodePath, release, repoRoot, repositoryUrl } from './release.mjs';

export const INDEX_VERSION = 1;
export const CORE_TEXT_LIMIT_BYTES = 8000;
export const MARKETPLACE = '.claude-plugin/marketplace.json';

const GITHUB = 'https://github.com';
const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const USER_AGENT = 'mistystack-skill-index';
const REQUEST_TIMEOUT_MS = 30_000;
const SHA = /^[0-9a-f]{40}$/;
const REPOSITORY = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?$/;
const PLUGIN_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,62}[A-Za-z0-9])?$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const encoder = new TextEncoder();
const utf8 = new TextDecoder('utf-8', { fatal: true });
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const blobUrl = (repository, pin, file) => `${repository}/blob/${pin}/${encodePath(file)}`;
const gitBlobSha = (bytes) => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const pinLabel = ({ owner, repo, sha }) => `${owner}/${repo}@${sha}`;
const describe = (error) => `${error.message}${error.cause ? `: ${error.cause.message ?? error.cause}` : ''}`;

export async function writeAtomic(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, data);
  await rename(temporary, file);
}

export function capUtf8(text, limit = CORE_TEXT_LIMIT_BYTES) {
  const bytes = encoder.encode(text);
  if (bytes.length <= limit) return { text, bytes: bytes.length, truncated: false };
  let end = limit;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
  return { text: utf8.decode(bytes.subarray(0, end)), bytes: end, truncated: true };
}

export function parseSkill(text, label, directoryName) {
  const match = FRONTMATTER.exec(text);
  if (!match) throw new Error(`${label}: missing YAML frontmatter`);
  const yaml = parseDocument(match[1]);
  if (yaml.errors.length) throw new Error(`${label}: frontmatter: ${yaml.errors[0].message}`);
  const data = yaml.toJS();
  if (!isRecord(data)) throw new Error(`${label}: frontmatter must be a mapping`);
  if (data.enabled === false) return null;
  const name = (typeof data.name === 'string' && data.name.trim()) || directoryName;
  if (!name || /[\\/]/.test(name)) throw new Error(`${label}: invalid skill name ${JSON.stringify(name)}`);
  if (typeof data.description !== 'string' || !data.description.trim()) throw new Error(`${label}: description must be a nonempty string`);
  const body = text.slice(match[0].length).trim();
  if (!body) throw new Error(`${label}: SKILL.md body is empty`);
  return { name, description: data.description.trim(), body };
}

function skillEntry({ name, description, body }, { pack, pin, repository, path: file }, url, install) {
  const core = capUtf8(body);
  return {
    id: `${pack}:${name}`, name, pack, pin, description,
    core: core.text, coreBytes: core.bytes, coreTruncated: core.truncated,
    source: { pack, pin, repository, path: file },
    invoke: { skill: `/skill:${name}`, install },
    url,
  };
}

function githubRepository(value, label) {
  const shorthand = typeof value === 'string' ? value.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '') : '';
  const match = REPOSITORY.exec(shorthand);
  if (!match || match[2] === '.' || match[2] === '..') throw new Error(`${label}: source must name a GitHub repository, got ${JSON.stringify(value)}`);
  return { owner: match[1], repo: match[2] };
}

function pluginRoot(value, label) {
  const root = typeof value === 'string' ? path.posix.normalize(value.trim()).replace(/\/+$/, '') : '';
  if (!root || root === '.' || path.posix.isAbsolute(root) || root.split('/').includes('..')) {
    throw new Error(`${label}: git-subdir path must be a directory inside the repository, got ${JSON.stringify(value)}`);
  }
  return root;
}

function catalogPlugins(catalog) {
  if (!isRecord(catalog) || typeof catalog.name !== 'string' || !catalog.name || !Array.isArray(catalog.plugins)) {
    throw new Error(`${MARKETPLACE}: invalid catalog`);
  }
  const local = [];
  const plugins = [];
  const names = new Set();
  for (const plugin of catalog.plugins) {
    if (!isRecord(plugin) || typeof plugin.name !== 'string' || !PLUGIN_NAME.test(plugin.name)) {
      throw new Error(`${MARKETPLACE}: invalid plugin name ${JSON.stringify(plugin?.name)}`);
    }
    const label = `${MARKETPLACE}: ${plugin.name}`;
    if (names.has(plugin.name.toLowerCase())) throw new Error(`${label}: duplicate plugin name`);
    names.add(plugin.name.toLowerCase());
    const { source } = plugin;
    if (source === './') {
      local.push(plugin.name);
      continue;
    }
    if (!isRecord(source) || !['github', 'git-subdir'].includes(source.source)) {
      throw new Error(`${label}: unsupported source ${JSON.stringify(source)}; the skill index reads this repository ("./") and github or git-subdir sources`);
    }
    if (typeof source.sha !== 'string' || !SHA.test(source.sha)) throw new Error(`${label}: catalog source must pin an exact 40-character commit sha`);
    const repository = githubRepository(source.source === 'github' ? source.repo : source.url, label);
    plugins.push({ name: plugin.name, ...repository, sha: source.sha, root: source.source === 'git-subdir' ? pluginRoot(source.path, label) : '' });
  }
  if (local.length !== 1) throw new Error(`${MARKETPLACE}: expected exactly one plugin sourced from this repository ("./")`);
  return { marketplace: catalog.name, pack: local[0], plugins };
}

async function repositorySkills(root, pack, revision) {
  const directories = (await readdir(path.join(root, 'skills')))
    .filter((directory) => !directory.startsWith('.') && existsSync(path.join(root, 'skills', directory, 'SKILL.md')))
    .sort();
  if (!directories.length) throw new Error('skills/: no SKILL.md found');
  const skills = await Promise.all(directories.map(async (directory) => {
    const file = `skills/${directory}/SKILL.md`;
    let text;
    try { text = utf8.decode(await readFile(path.join(root, file))); }
    catch (error) { throw new Error(`${file}: ${error.message}`); }
    const skill = parseSkill(text, file, directory);
    if (!skill) return null;
    const source = { pack, pin: revision, repository: repositoryUrl, path: file };
    return skillEntry(skill, source, blobUrl(repositoryUrl, revision, file), null);
  }));
  return skills.filter(Boolean);
}

function treeFrom(entries) {
  const tree = new Map();
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.mode !== 'string' || !SHA.test(entry.sha ?? '')) return undefined;
    tree.set(entry.path, { mode: entry.mode, sha: entry.sha });
  }
  return tree;
}

function sourceStore({ cacheDir, fetch: fetcher, token }) {
  const trees = new Map();
  const pinDirectory = (pin) => path.join(cacheDir, 'github.com', pin.owner, pin.repo, pin.sha);

  async function request(url, headers) {
    let response;
    try { response = await fetcher(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }); }
    catch (error) { throw new Error(`GET ${url}: ${describe(error)}`); }
    if (!response.ok) {
      await response.body?.cancel();
      const limited = response.headers.get('x-ratelimit-remaining') === '0' ? ' (GitHub API rate limit; set GITHUB_TOKEN or build from a warm cache)' : '';
      throw new Error(`GET ${url}: HTTP ${response.status}${limited}`);
    }
    return response;
  }

  async function cachedTree(file, pin) {
    try {
      const cached = JSON.parse(await readFile(file, 'utf8'));
      if (isRecord(cached) && cached.repository === `${pin.owner}/${pin.repo}` && cached.commit === pin.sha && Array.isArray(cached.entries)) {
        return treeFrom(cached.entries);
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
    return undefined;
  }

  async function fetchTree(pin) {
    const url = `${API}/repos/${pin.owner}/${pin.repo}/git/trees/${pin.sha}?recursive=1`;
    const response = await request(url, {
      Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': USER_AGENT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    let listing;
    try { listing = await response.json(); }
    catch (error) { throw new Error(`GET ${url}: ${describe(error)}`); }
    if (!isRecord(listing) || !Array.isArray(listing.tree)) throw new Error(`GET ${url}: unexpected tree response`);
    if (listing.truncated) throw new Error(`GET ${url}: tree listing is truncated`);
    return listing.tree.filter((entry) => entry?.type === 'blob')
      .map(({ path: file, mode, sha }) => ({ path: file, mode, sha }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  function tree(pin) {
    const key = pinLabel(pin);
    if (!trees.has(key)) {
      trees.set(key, (async () => {
        const file = path.join(pinDirectory(pin), 'tree.json');
        const cached = await cachedTree(file, pin);
        if (cached) return cached;
        let entries;
        try { entries = await fetchTree(pin); }
        catch (error) { throw new Error(`${key}: cannot read pinned source tree and no usable cache: ${error.message}`); }
        const listing = treeFrom(entries);
        if (!listing) throw new Error(`${key}: tree listing has malformed entries`);
        await writeAtomic(file, `${JSON.stringify({ repository: `${pin.owner}/${pin.repo}`, commit: pin.sha, entries })}\n`);
        return listing;
      })());
    }
    return trees.get(key);
  }

  async function text(pin, listing, file) {
    const entry = listing.get(file);
    if (!entry) throw new Error(`${pinLabel(pin)}: ${file} is missing`);
    if (entry.mode === '120000') throw new Error(`${pinLabel(pin)}: ${file} is a symlink; the index reads regular files only`);
    const cacheFile = path.join(pinDirectory(pin), 'blobs', entry.sha);
    let bytes;
    try { bytes = await readFile(cacheFile); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!bytes || gitBlobSha(bytes) !== entry.sha) {
      const url = `${RAW}/${pin.owner}/${pin.repo}/${pin.sha}/${encodePath(file)}`;
      try { bytes = new Uint8Array(await (await request(url, { 'User-Agent': USER_AGENT })).arrayBuffer()); }
      catch (error) { throw new Error(`${pinLabel(pin)}: cannot read ${file} and no usable cache: ${error.message}`); }
      if (gitBlobSha(bytes) !== entry.sha) throw new Error(`${pinLabel(pin)}: ${file} does not match pinned blob ${entry.sha}`);
      await writeAtomic(cacheFile, bytes);
    }
    try { return utf8.decode(bytes); }
    catch { throw new Error(`${pinLabel(pin)}: ${file} is not valid UTF-8`); }
  }

  return { tree, text };
}

const skillPaths = (value) => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [])
  .map((entry) => entry.trim()).filter(Boolean);

function within(root, declared) {
  if (path.posix.isAbsolute(declared)) return undefined;
  const resolved = path.posix.normalize(`${root || '.'}/${declared}`).replace(/\/+$/, '');
  const directory = resolved === '.' ? '' : resolved;
  if (directory === '..' || directory.startsWith('../')) return undefined;
  return !root || directory === root || directory.startsWith(`${root}/`) ? directory : undefined;
}

async function pluginSkills(plugin, store, marketplace) {
  const pin = { owner: plugin.owner, repo: plugin.repo, sha: plugin.sha };
  const label = `${MARKETPLACE}: ${plugin.name} (${pinLabel(pin)}${plugin.root ? ` ${plugin.root}` : ''})`;
  const listing = await store.tree(pin);
  const inRoot = (relative) => (plugin.root ? `${plugin.root}/${relative}` : relative);
  const exists = (directory) => !directory || [...listing.keys()].some((file) => file.startsWith(`${directory}/`));
  if (!exists(plugin.root)) throw new Error(`${label}: plugin path is missing at the pinned commit`);
  const json = async (relative) => {
    const file = inRoot(relative);
    if (!listing.has(file)) return null;
    const raw = await store.text(pin, listing, file);
    try { return JSON.parse(raw); }
    catch (error) { throw new Error(`${label}: ${file}: ${error.message}`); }
  };
  const manifest = await json('.claude-plugin/plugin.json');
  const catalog = await json(MARKETPLACE);
  const entry = Array.isArray(catalog?.plugins) ? catalog.plugins.find((candidate) => isRecord(candidate) && candidate.name === plugin.name && candidate.source === './') : undefined;
  const selection = isRecord(entry) ? entry : null;
  const declared = [...skillPaths(isRecord(manifest) ? manifest.skills : undefined), ...skillPaths(selection?.skills)];
  const directories = declared.length && selection ? [] : [inRoot('skills')];
  for (const entry of declared) {
    const directory = within(plugin.root, entry);
    if (directory === undefined) throw new Error(`${label}: skills path ${entry} leaves the plugin`);
    if (!exists(directory)) throw new Error(`${label}: declared skills path ${entry} is missing`);
    if (!directories.includes(directory)) directories.push(directory);
  }
  const files = new Set();
  for (const directory of directories) {
    const prefix = directory ? `${directory}/` : '';
    if (listing.has(`${prefix}SKILL.md`)) files.add(`${prefix}SKILL.md`);
    for (const [file, entry] of listing) {
      if (!file.startsWith(prefix)) continue;
      const [child, next, ...deeper] = file.slice(prefix.length).split('/');
      if (child.startsWith('.')) continue;
      if (next === undefined && entry.mode === '120000') throw new Error(`${label}: ${file} is a symlink that a tree listing cannot follow`);
      if (next === 'SKILL.md' && deeper.length === 0) files.add(file);
    }
  }
  const repository = `${GITHUB}/${pin.owner}/${pin.repo}`;
  const install = `claude plugin install ${plugin.name}@${marketplace}`;
  const skills = (await Promise.all([...files].sort().map(async (file) => {
    const directory = path.posix.dirname(file);
    const fallback = directory === (plugin.root || '.') ? undefined : path.posix.basename(directory);
    const skill = parseSkill(await store.text(pin, listing, file), `${label}: ${file}`, fallback);
    return skill && skillEntry(skill, { pack: plugin.name, pin: pin.sha, repository, path: file }, blobUrl(repository, pin.sha, file), install);
  }))).filter(Boolean);
  if (!skills.length) throw new Error(`${label}: no skills found`);
  return skills;
}

export async function buildSkillIndex({ root = repoRoot, revision = release.commit, cacheDir, fetch = globalThis.fetch, token } = {}) {
  if (typeof revision !== 'string' || !SHA.test(revision)) throw new Error('Skill index revision must be a full Git commit SHA');
  if (!cacheDir) throw new Error('Skill index cacheDir is required');
  let catalog;
  try { catalog = JSON.parse(await readFile(path.join(root, MARKETPLACE), 'utf8')); }
  catch (error) { throw new Error(`${MARKETPLACE}: ${error.message}`); }
  const { marketplace, pack, plugins } = catalogPlugins(catalog);
  const store = sourceStore({ cacheDir, fetch, token });
  const groups = await Promise.all([
    repositorySkills(root, pack, revision),
    ...plugins.map((plugin) => pluginSkills(plugin, store, marketplace)),
  ]);
  const skills = groups.flat().sort(byId);
  for (let index = 1; index < skills.length; index += 1) {
    if (skills[index].id === skills[index - 1].id) throw new Error(`Duplicate skill id ${skills[index].id}`);
  }
  return { version: INDEX_VERSION, revision, coreTextLimitBytes: CORE_TEXT_LIMIT_BYTES, skills };
}
