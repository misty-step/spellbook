import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import astroConfig from '../astro.config.mjs';
import { PERSONAL_NAMES } from '../src/lib/portable-voice.mjs';

// Check the built static artifact: links, fragments, CSP, redirects, raw sources, sitemap, worker, and Pagefind.
const site = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(site, '..');
const dist = path.join(site, 'dist');
const origin = 'https://stack.mistystep.io';
const errors = [];
const files = new Map();
const pages = new Map();
const redirects = new Map();
const fail = (message) => errors.push(message);
const expect = (condition, message) => { if (!condition) fail(message); };
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const decode = (value) => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, name) => {
  if (name[0] === '#') {
    const number = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\ufffd';
  }
  return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[name.toLowerCase()] ?? entity;
});

async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await collect(path.join(directory, entry.name), `${relative}/`);
    else if (entry.isFile()) files.set(relative, await readFile(path.join(directory, entry.name)));
    else fail(`${relative}: artifact must contain regular files, not symlinks or special files`);
  }
}

function required(file) {
  const bytes = files.get(file);
  expect(bytes?.length > 0, `${file}: missing or empty artifact`);
  return bytes;
}

function json(file) {
  const bytes = required(file);
  if (!bytes) return null;
  try { return JSON.parse(bytes.toString('utf8')); }
  catch (error) { fail(`${file}: invalid JSON: ${error.message}`); return null; }
}

function route(file) {
  if (file === 'index.html') return '/';
  return `/${file.replace(/\/index\.html$/, '/')}`;
}

function parseHTML(file, text) {
  const result = { ids: new Set(), links: [], tags: [], headings: new Map() };
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi;
  let raw = null;
  for (const match of text.matchAll(token)) {
    const closing = /^<\//.test(match[0]);
    const name = /^<\/?([\w:-]+)/.exec(match[0])?.[1].toLowerCase();
    if (!name) continue;
    if (raw) { if (closing && name === raw) raw = null; continue; }
    if (closing) continue;
    const attributes = new Map();
    const body = match[0].replace(/^<\/?[\w:-]+/, '').replace(/\/?>$/, '');
    for (const attribute of body.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const key = attribute[1].toLowerCase();
      if (!attributes.has(key)) attributes.set(key, decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? ''));
    }
    const line = text.slice(0, match.index).split('\n').length;
    const label = `${file}:${line} <${name}>`;
    const id = attributes.get('id');
    if (id !== undefined) {
      expect(id.length > 0 && !result.ids.has(id), `${label}: empty or duplicate id ${JSON.stringify(id)}`);
      result.ids.add(id);
      if (/^h[1-6]$/.test(name)) result.headings.set(id, Number(name[1]));
    }
    if (name === 'a' && attributes.has('name')) result.ids.add(attributes.get('name'));
    for (const key of ['href', 'xlink:href', 'src', 'poster', 'action', 'data']) {
      if (attributes.has(key) && (key !== 'data' || name === 'object')) {
        result.links.push({ value: attributes.get(key), label: `${label} ${key}` });
      }
    }
    if (attributes.has('style')) cssLinks(attributes.get('style'), `${label} style`, result.links);
    result.tags.push({ name, attributes });
    if (name === 'script' || name === 'style' || name === 'textarea' || name === 'title') {
      if (name === 'style') {
        const end = text.toLowerCase().indexOf('</style', match.index + match[0].length);
        cssLinks(text.slice(match.index + match[0].length, end < 0 ? undefined : end), label, result.links);
      }
      raw = name;
    }
  }
  return result;
}

function cssLinks(text, label, output) {
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)|@import\s+(?:"([^"]+)"|'([^']+)')/gi)) {
    output.push({ value: match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5], label: `${label} CSS url` });
  }
}

function localURL(value, base, label) {
  try {
    const url = new URL(value, new URL(base, origin));
    if (url.origin !== origin) return null;
    return url;
  } catch { fail(`${label}: malformed URL ${JSON.stringify(value)}`); return null; }
}

function target(url, label) {
  let current = new URL(url);
  const visited = new Set();
  while (redirects.has(current.pathname)) {
    if (visited.has(current.pathname)) { fail(`${label}: redirect cycle at ${current.pathname}`); return null; }
    visited.add(current.pathname);
    const next = new URL(redirects.get(current.pathname), current);
    if (!next.hash) next.hash = current.hash;
    current = next;
    if (current.origin !== origin) return null;
  }
  let pathname;
  try { pathname = decodeURIComponent(current.pathname); }
  catch { fail(`${label}: malformed escaped pathname ${current.pathname}`); return null; }
  const relative = pathname.replace(/^\/+/, '');
  const candidates = pathname.endsWith('/') ? [`${relative}index.html`] : [relative, `${relative}/index.html`, `${relative}.html`];
  const file = candidates.find((candidate) => files.has(candidate));
  if (!file) { fail(`${label}: missing local target ${current.pathname}`); return null; }
  return { file, url: current };
}

function checkLink(value, base, label) {
  const url = localURL(value, base, label);
  if (!url) return null;
  const resolved = target(url, label);
  if (!resolved) return null;
  let fragment;
  try { fragment = decodeURIComponent(resolved.url.hash.slice(1)).split(':~:text=')[0]; }
  catch { fail(`${label}: malformed escaped fragment ${resolved.url.hash}`); return resolved; }
  if (fragment && /\.(html|svg)$/.test(resolved.file)) {
    const page = pages.get(resolved.file);
    expect(page?.ids.has(fragment), `${label}: missing fragment #${fragment} in ${resolved.file}`);
  }
  return resolved;
}

function publicSource(source) {
  if (!nonempty(source) || source.includes('\\') || source.split('/').some((part) => !part || part === '.' || part === '..' || part.startsWith('.'))) return false;
  if (source === 'rules/core.md' || source === 'docs/philosophy.md') return true;
  if (/^skills\/[^/]+\/SKILL\.md$/.test(source)) return true;
  if (/^skills\/[^/]+\/scripts\/[a-zA-Z0-9._-]+\.(mjs|py)$/.test(source)) return true;
  return false;
}

function unpack(file) {
  const bytes = required(file);
  if (!bytes) throw new Error(`missing ${file}`);
  const content = gunzipSync(bytes);
  if (content.subarray(0, 12).toString() !== 'pagefind_dcd') throw new Error(`${file}: invalid Pagefind marker`);
  return content.subarray(12);
}

function cbor(bytes) {
  let offset = 0;
  function take(size) {
    if (offset + size > bytes.length) throw new Error('truncated CBOR');
    const slice = bytes.subarray(offset, offset + size);
    offset += size;
    return slice;
  }
  function value() {
    const initial = take(1)[0];
    const major = initial >> 5;
    const extra = initial & 31;
    let size = extra;
    if (extra >= 24 && extra <= 27) {
      const encoded = take(2 ** (extra - 24));
      size = encoded.length === 8 ? Number(encoded.readBigUInt64BE()) : encoded.readUIntBE(0, encoded.length);
      if (!Number.isSafeInteger(size)) throw new Error('unsafe CBOR integer');
    } else if (extra >= 28) throw new Error('unsupported indefinite CBOR value');
    if (major === 0) return size;
    if (major === 1) return -1 - size;
    if (major === 2) return take(size);
    if (major === 3) return take(size).toString('utf8');
    if (major === 4) return Array.from({ length: size }, value);
    if (major === 5) return Object.fromEntries(Array.from({ length: size }, () => [value(), value()]));
    if (major === 7 && extra === 22) return null;
    throw new Error(`unsupported CBOR type ${major}/${extra}`);
  }
  const result = value();
  if (offset !== bytes.length) throw new Error('trailing CBOR bytes');
  return result;
}

async function main() {
  await collect(dist);
  const expectedCommit = process.env.SITE_COMMIT || process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const release = json('release.json');
  expect(/^[a-f\d]{40}$/i.test(expectedCommit), 'release.json: expected a full checked-out Git commit');
  if (release) {
    expect(release.commit === expectedCommit, `release.json: commit must equal ${expectedCommit}`);
    expect(release.version === pkg.version, 'release.json: version must equal the root native package version');
    expect(nonempty(release.builtAt) && Number.isFinite(Date.parse(release.builtAt)), 'release.json: builtAt must be an ISO timestamp');
    expect(release.canonical === origin || release.canonical === `${origin}/`, `release.json: canonical must be ${origin}`);
  }

  for (const [file, bytes] of files) {
    if (/\.(html|svg)$/.test(file)) {
      const text = bytes.toString('utf8');
      expect(!PERSONAL_NAMES.test(text), `${file}: rendered site must not contain personal names`);
      if (file.endsWith('.html')) expect(!/<[^>]+\sstyle=/i.test(text), `${file}: inline style attributes are blocked by the style-src 'self' CSP`);
      pages.set(file, parseHTML(file, text));
    }
  }
  for (const line of (files.get('_redirects')?.toString('utf8') ?? '').split('\n')) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const [from, to, status] = clean.split(/\s+/);
    expect(from?.startsWith('/') && nonempty(to) && /^(301|302|303|307|308)$/.test(status), `_redirects: invalid redirect ${clean}`);
    expect(!from?.includes('*') && !from?.includes(':'), `_redirects: checker requires explicit source paths: ${clean}`);
    if (from && to) {
      expect(!redirects.has(from), `_redirects: duplicate redirect ${from}`);
      redirects.set(from, to);
    }
  }
  const astroRedirects = Object.entries(astroConfig.redirects);
  expect(redirects.size === astroRedirects.length, `_redirects: must cover exactly the Astro redirects (${redirects.size} vs ${astroRedirects.length})`);
  for (const [from, to] of astroRedirects) {
    expect(redirects.get(from) === to, `_redirects ${from}: destination must match Astro's ${to}`);
    required(`${from.slice(1)}index.html`);
  }
  for (const [from] of redirects) checkLink(from, '/', `_redirects ${from}`);
  for (const [file, page] of pages) {
    const base = route(file);
    for (const { name, attributes } of page.tags) {
      if (name === 'script' && (!attributes.has('type') || ['module', 'text/javascript', 'application/javascript'].includes(attributes.get('type')))) {
        expect(attributes.has('src'), `${file}: executable inline script violates the self-only CSP`);
      }
    }
    for (const link of page.links) checkLink(link.value, base, link.label);
  }
  for (const [file, bytes] of files) {
    if (!file.endsWith('.css')) continue;
    const links = [];
    cssLinks(bytes.toString('utf8'), file, links);
    for (const link of links) checkLink(link.value, `/${file}`, link.label);
  }
  required('index.html');
  required('library/index.html');
  required('library/core/index.html');
  required('library/misty/index.html');
  required('tools/misty-check/index.html');
  required('tools/extract-conflict-context/index.html');
  required('philosophy/index.html');
  required('find/index.html');

  const worker = required('.worker/index.js')?.toString('utf8') ?? '';
  expect(worker.includes('/api/find') && worker.includes('/healthz'), '.worker/index.js: missing bundled finder or /healthz route');
  expect(worker.includes('/api/client-error') && required('error-beacon.js')?.includes('/api/client-error'), 'browser error beacon: Worker route and /error-beacon.js must both exist');
  for (const [file, page] of pages) {
    if (!file.endsWith('.html') || !page.tags.some(({ name }) => name === 'main')) continue;
    expect(page.tags.some(({ name, attributes }) => name === 'script' && attributes.get('src') === '/error-beacon.js'), `${file}: page does not load /error-beacon.js`);
  }
  expect(files.get('.assetsignore')?.toString('utf8').split('\n').includes('.worker/'), '.assetsignore: Worker code and index must not be public assets');

  const notFound = required('404.html')?.toString('utf8');
  if (notFound) {
    expect(/404|not found/i.test(notFound), '404.html: must explain the missing page');
    const recovery = pages.get('404.html')?.links.some(({ value }) => /^\/(search|library)\/(?:[?#]|$)/.test(value));
    expect(recovery, '404.html: must link to search or library recovery');
  }

  const index = json('content-index.json');
  expect(Array.isArray(index) && index.length > 0, 'content-index.json: expected a nonempty document array');
  const documents = Array.isArray(index) ? index : [];
  const byId = new Map();
  const byURL = new Map();
  for (const doc of documents) {
    if (!doc || typeof doc !== 'object') { fail('content-index.json: document must be an object'); continue; }
    const label = `content-index.json ${doc.id ?? '(missing id)'}`;
    for (const key of ['id', 'kind', 'title', 'url']) expect(nonempty(doc[key]), `${label}: missing ${key}`);
    expect(!byId.has(doc.id), `${label}: duplicate document id`);
    expect(!byURL.has(doc.url), `${label}: duplicate canonical route ${doc.url}`);
    byId.set(doc.id, doc);
    byURL.set(doc.url, doc);
    expect(typeof doc.url === 'string' && /^\/(?:[^?#]*\/)?$/.test(doc.url), `${label}: URL must be a root-relative trailing-slash route`);
    const rendered = typeof doc.url === 'string' ? checkLink(doc.url, '/', label) : null;
    const page = rendered && pages.get(rendered.file);
    expect(page, `${label}: canonical route must render HTML`);
    if (page) {
      expect(page.tags.some(({ attributes }) => attributes.has('data-pagefind-body')), `${label}: missing data-pagefind-body`);
      expect(page.tags.some(({ name, attributes }) => name === 'meta' && attributes.get('data-pagefind-filter') === 'section[content]' && attributes.get('content') === doc.kind), `${label}: missing Pagefind section filter ${doc.kind}`);
      const canonicals = page.tags.filter(({ name, attributes }) => name === 'link' && attributes.get('rel')?.split(/\s+/).includes('canonical'));
      expect(canonicals.length === 1 && canonicals[0].attributes.get('href') === `${origin}${doc.url}`, `${label}: canonical link must identify its route`);
    }
    const source = doc.source;
    expect(source && publicSource(source.path), `${label}: source.path must identify allowlisted public content`);
    if (source && publicSource(source.path)) {
      expect(doc.id === source.path, `${label}: id must equal the stable repository path`);
      expect(source.commit === expectedCommit, `${label}: source.commit differs from release identity`);
      const raw = required(`source/${source.path}`);
      try {
        const original = await readFile(path.join(root, source.path));
        expect(raw?.equals(original), `${label}: raw projection differs from canonical repository bytes`);
      } catch (error) { fail(`${label}: cannot read canonical source: ${error.message}`); }
    }
  }

  for (const [file, bytes] of files) {
    if (!file.startsWith('source/')) continue;
    const source = file.slice(7);
    if (!publicSource(source)) { fail(`${file}: unexpected non-public raw projection`); continue; }
    try { expect(bytes.equals(await readFile(path.join(root, source))), `${file}: raw projection differs from canonical repository bytes`); }
    catch (error) { fail(`${file}: cannot read canonical source: ${error.message}`); }
  }

  const sitemapURLs = new Set();
  const text = required('sitemap.xml')?.toString('utf8') ?? '';
  expect(/<urlset\b/.test(text), 'sitemap.xml: must contain a sitemap urlset');
  const locations = [...text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => decode(match[1]));
  expect(locations.length > 0, 'sitemap.xml: sitemap must not be empty');
  for (const location of locations) {
    expect(location.startsWith(`${origin}/`), `sitemap.xml: noncanonical sitemap URL ${location}`);
    checkLink(location, '/', 'sitemap.xml <loc>');
    expect(!sitemapURLs.has(location), `sitemap.xml: duplicate sitemap URL ${location}`);
    sitemapURLs.add(location);
  }
  for (const url of ['/', '/library/', '/tools/misty-check/', '/philosophy/', ...byURL.keys()]) {
    expect(sitemapURLs.has(`${origin}${url}`), `sitemap.xml: missing canonical route ${url}`);
  }

  const robots = required('robots.txt')?.toString('utf8') ?? '';
  expect(/^User-agent:\s*\*\s*$/im.test(robots), 'robots.txt: missing public crawler policy');
  expect(!/^Disallow:\s*\/\s*$/im.test(robots), 'robots.txt: public artifact must not disallow the entire site');
  expect(new RegExp(`^Sitemap:\\s*${origin.replaceAll('.', '\\.')}\/sitemap\\.xml\\s*$`, 'im').test(robots), 'robots.txt: missing canonical sitemap URL');

  checkPagefind(byURL);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`);
    console.error(`Site artifact failed ${errors.length} check(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Checked ${pages.size} HTML/SVG files, ${documents.length} documents, local links/fragments, raw sources, release, sitemap, worker, and Pagefind filters.`);
  }
}

function checkPagefind(documents) {
  for (const file of ['pagefind/pagefind.js', 'pagefind/pagefind-ui.js', 'pagefind/pagefind-ui.css']) required(file);
  const entry = json('pagefind/pagefind-entry.json');
  if (!entry) return;
  expect(nonempty(entry.version) && entry.languages && Object.keys(entry.languages).length > 0, 'Pagefind: missing bundle version/languages');
  const found = new Map();
  for (const [language, info] of Object.entries(entry.languages ?? {})) {
    try {
      const metaFile = `pagefind/pagefind.${info.hash}.pf_meta`;
      const meta = cbor(unpack(metaFile));
      expect(meta[0] === entry.version, `${metaFile}: bundle version mismatch`);
      const [version, indexedPages, chunks, filterRefs] = meta;
      if (!version || !Array.isArray(indexedPages) || !Array.isArray(chunks) || !Array.isArray(filterRefs)) throw new Error(`${metaFile}: invalid metadata structure`);
      expect(info.page_count === indexedPages.length && indexedPages.length > 0, `${metaFile}: page count mismatch or empty index`);
      required(`pagefind/wasm.${info.wasm || 'unknown'}.pagefind`);
      expect(chunks.length > 0, `${metaFile}: missing word index`);
      for (const chunk of chunks) unpack(`pagefind/index/${chunk[2]}.pf_index`);
      const fragments = indexedPages.map(([hash]) => {
        const file = `pagefind/fragment/${hash}.pf_fragment`;
        const fragment = JSON.parse(unpack(file).toString('utf8'));
        expect(nonempty(fragment.content), `${file}: empty indexed content`);
        const resolved = checkLink(fragment.url, '/', file);
        const url = resolved ? route(resolved.file) : fragment.url;
        if (documents.has(url)) {
          expect(!found.has(url), `${file}: duplicate indexed document ${url}`);
          found.set(url, fragment);
          expect(fragment.filters?.section?.includes(documents.get(url).kind), `${file}: missing section filter ${documents.get(url).kind}`);
        }
        return fragment;
      });
      let hasSection = false;
      for (const [name, hash] of filterRefs) {
        const file = `pagefind/filter/${hash}.pf_filter`;
        const filter = cbor(unpack(file));
        expect(filter[0] === name && Array.isArray(filter[1]), `${file}: invalid filter index`);
        if (name !== 'section') continue;
        hasSection = true;
        for (const [kind, numbers] of filter[1]) {
          expect(nonempty(kind) && Array.isArray(numbers) && numbers.length > 0, `${file}: empty section value`);
          for (const number of numbers) {
            expect(Number.isInteger(number) && number >= 0 && number < fragments.length, `${file}: invalid page reference ${number}`);
            expect(fragments[number]?.filters?.section?.includes(kind), `${file}: section ${kind} disagrees with fragment ${number}`);
          }
        }
      }
      expect(hasSection, `Pagefind ${language}: section filter index is missing`);
    } catch (error) { fail(`Pagefind ${language}: ${error.message}`); }
  }
  for (const url of documents.keys()) expect(found.has(url), `Pagefind: canonical document ${url} is absent from the built index`);
}

main().catch((error) => {
  console.error(`Site artifact check failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
