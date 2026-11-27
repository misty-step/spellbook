import path from 'node:path';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import { parseDocument } from 'yaml';
import { blobUrl, encodePath, release, repoRoot, repositoryUrl } from './release.mjs';
import { PERSONAL_NAMES } from './portable-voice.mjs';

const markdown = unified().use(remarkParse).use(remarkGfm);
const toHtml = unified().use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
const stringify = unified().use(rehypeStringify);
const text = (node) => node.value ?? (node.children ?? []).map(text).join('');
const element = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const literal = (value) => ({ type: 'text', value });
const addClass = (node, name) => { node.properties.className = [...(node.properties.className ?? []), name]; };

const SKILL_ORDER = [
  'misty',
  'foundations',
  'design',
  'design-exploration',
  'present',
  'trace-mining',
  'define-product',
  'security-audit',
  'release-watch',
  'resolve-merge-conflicts',
];

export const TOOL_SCRIPTS = [
  {
    id: 'misty-check',
    skillName: 'foundations',
    name: 'misty-check.mjs',
    path: 'skills/foundations/scripts/misty-check.mjs',
    url: '/tools/misty-check/',
    language: 'JavaScript (Node built-ins only)',
    modules: ['skills/foundations/scripts/misty-check-observability.mjs'],
    command: 'node skills/foundations/scripts/misty-check.mjs [path] [--json] [--strict] [--strict-layout] [--strict-observability]',
    summary: 'Deterministic ~1-second repository baseline auditor checking PRODUCT.md and DESIGN.md presence (with advisory Active Folio and surface-class summaries that never reject custom structures or non-web repos), structural layout thresholds (<=15 source files/dir, <=2,000 LOC/file, .misty-check.allow), production observability on web apps, workers, and services (truthful health endpoint, telemetry config, client error and CSP capture), agent guide, local run docs, test/lint scripts, secret hygiene, and a /healthz or /api/health endpoint.',
  },
  {
    id: 'extract-conflict-context',
    skillName: 'resolve-merge-conflicts',
    name: 'extract_conflict_context.py',
    path: 'skills/resolve-merge-conflicts/scripts/extract_conflict_context.py',
    url: '/tools/extract-conflict-context/',
    language: 'Python 3 (standard library)',
    command: 'python3 skills/resolve-merge-conflicts/scripts/extract_conflict_context.py [--file <path>] [--all] [--json]',
    summary: 'Extracts unresolved Git paths, compact conflict hunks, and ours-vs-theirs diffs without loading full conflicted files into context.',
  },
];

const rootRoutes = {
  'rules/core.md': '/library/core/',
  'skills/misty/SKILL.md': '/library/misty/',
  'docs/philosophy.md': '/philosophy/',
};

function routeFor(id) {
  if (rootRoutes[id]) return rootRoutes[id];
  const skill = /^skills\/([^/]+)\/SKILL\.md$/.exec(id);
  if (skill) return `/library/skills/${skill[1]}/`;
  return `/${id.replace(/\.md$/, '')}/`;
}

function kindFor(id) {
  if (id === 'rules/core.md') return 'Core';
  if (/^skills\/[^/]+\/SKILL\.md$/.test(id)) return 'Skills';
  if (id === 'docs/philosophy.md') return 'Philosophy';
  return 'About';
}

function orderFor(id) {
  if (id === 'rules/core.md') return 0;
  const skill = /^skills\/([^/]+)\/SKILL\.md$/.exec(id);
  if (skill) {
    const idx = SKILL_ORDER.indexOf(skill[1]);
    return idx === -1 ? 50 : idx + 1;
  }
  if (id === 'docs/philosophy.md') return 90;
  return 100;
}

function parseSource(id, raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match) return { body: raw, data: {}, offset: 0 };
  const yaml = parseDocument(match[1]);
  if (yaml.errors.length) throw new Error(`${id}: frontmatter: ${yaml.errors[0].message}`);
  const data = yaml.toJS();
  return { body: raw.slice(match[0].length), data, offset: match[0].split('\n').length - 1 };
}

function validateMetadata(doc) {
  if (PERSONAL_NAMES.test(doc.raw)) {
    throw new Error(`${doc.id}: site content must use portable voice without personal names`);
  }
  if (doc.id.endsWith('/SKILL.md')) {
    const { data } = doc;
    for (const key of ['name', 'description']) {
      if (typeof data[key] !== 'string' || !data[key].trim()) {
        throw new Error(`${doc.id}: ${key} must be a nonempty string`);
      }
    }
    if (data.name !== doc.id.split('/')[1]) {
      throw new Error(`${doc.id}: name must match its installed directory`);
    }
    const script = TOOL_SCRIPTS.find((item) => item.skillName === data.name) ?? null;
    const words = doc.body.trim().split(/\s+/).filter(Boolean).length;
    doc.skill = {
      name: data.name,
      description: data.description.trim(),
      script,
      words,
    };
  }
}

function prepareHeadings(doc) {
  const slugger = new GithubSlugger();
  const ids = new Set();
  visit(doc.hast, 'element', (node) => {
    if (!node.properties?.id) return;
    const id = String(node.properties.id);
    if (ids.has(id)) throw new Error(`${doc.id}:${(node.position?.start.line ?? 1) + doc.offset}: duplicate id #${id}`);
    ids.add(id);
  });
  let foundTitle = false;
  visit(doc.hast, 'element', (node) => {
    if (!/^h[1-6]$/.test(node.tagName)) return;
    const label = text(node);
    let id = node.properties.id;
    if (!id) {
      do { id = slugger.slug(label); } while (ids.has(id));
      ids.add(id);
      node.properties.id = id;
    }
    const isTitle = node.tagName === 'h1' && !foundTitle;
    if (isTitle) foundTitle = true;
    doc.headings.push({ id, label, depth: Number(node.tagName[1]), sourceLine: (node.position?.start.line ?? 1) + doc.offset });
    if (!isTitle) {
      node.children.push(element('a', {
        href: `#${id}`,
        className: ['heading-anchor'],
        ariaLabel: `Link to section: ${label}`,
        'data-pagefind-ignore': '',
      }, [literal('#')]));
    }
  });
  doc.ids = ids;
  const first = doc.hast.children.findIndex((node) => node.type === 'element' && node.tagName === 'h1');
  if (first !== -1) doc.hast.children.splice(first, 1);
}

function sourceFailure(doc, node, message) {
  throw new Error(`${doc.id}:${(node.position?.start.line ?? 1) + doc.offset}: ${message}`);
}

function resolveTarget(doc, href, node, graph, image = false) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) {
    if (!href.startsWith(`${release.canonical}/`)) return href;
    href = href.slice(release.canonical.length);
  }
  const hashAt = href.indexOf('#');
  const fragment = hashAt < 0 ? '' : href.slice(hashAt + 1);
  const beforeHash = hashAt < 0 ? href : href.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt < 0 ? '' : beforeHash.slice(queryAt);
  let target = decodeURIComponent(queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt));
  let targetDoc;
  if (!target) targetDoc = doc;
  else if (target.startsWith('/')) {
    targetDoc = graph.byUrl.get(target.endsWith('/') ? target : `${target}/`);
    if (!targetDoc && graph.specialRoutes.has(target)) {
      if (fragment && !graph.specialRoutes.get(target).has(decodeURIComponent(fragment))) {
        sourceFailure(doc, node, `missing fragment ${href}`);
      }
      return `${target}${query}${fragment ? `#${fragment}` : ''}`;
    }
    if (!targetDoc) target = target.slice(1);
  } else {
    target = path.posix.normalize(path.posix.join(path.posix.dirname(doc.id), target));
  }
  if (!targetDoc) {
    if (target === '..' || target.startsWith('../') || path.isAbsolute(target)) {
      sourceFailure(doc, node, `link escapes repository: ${href}`);
    }
    const absolute = path.join(repoRoot, target);
    if (!existsSync(absolute)) sourceFailure(doc, node, `missing internal target: ${href} (${target})`);
    if (!realpathSync(absolute).startsWith(`${realpathSync(repoRoot)}${path.sep}`) && realpathSync(absolute) !== realpathSync(repoRoot)) {
      sourceFailure(doc, node, `link escapes repository: ${href}`);
    }
    if (statSync(absolute).isDirectory()) {
      return `${repositoryUrl}/tree/${release.commit}/${encodePath(target)}${fragment ? `#${fragment}` : ''}`;
    }
    targetDoc = graph.byId.get(target);
    if (!targetDoc) {
      return image
        ? `https://raw.githubusercontent.com/misty-step/spellbook/${release.commit}/${encodePath(target)}`
        : `${blobUrl(target)}${query}${fragment ? `#${fragment}` : ''}`;
    }
  }
  if (fragment && !targetDoc.ids.has(decodeURIComponent(fragment))) {
    sourceFailure(doc, node, `missing fragment: ${href} in ${targetDoc.id}`);
  }
  if (targetDoc.id !== doc.id) doc.outboundLinks.add(targetDoc.id);
  return `${targetDoc.url}${query}${fragment ? `#${fragment}` : ''}`;
}

function decorateHtml(doc, graph) {
  visit(doc.hast, 'element', (node, index, parent) => {
    const properties = node.properties ?? {};
    if (node.tagName === 'a' && typeof properties.href === 'string') {
      properties.href = resolveTarget(doc, properties.href, node, graph);
      if (!properties.className?.includes('heading-anchor')) addClass(node, 'sp-link');
    }
    if (node.tagName === 'img' && typeof properties.src === 'string') {
      properties.src = resolveTarget(doc, properties.src, node, graph, true);
    }
    if (node.tagName === 'pre') {
      addClass(node, 'sp-code');
      properties.tabIndex = 0;
      properties.role = 'region';
      properties.ariaLabel = 'Code example, scroll horizontally if needed';
    }
    if (node.tagName === 'code' && parent?.tagName !== 'pre') addClass(node, 'sp-code-inline');
    if (node.tagName === 'table') addClass(node, 'sp-table');
    if ((node.tagName === 'th' || node.tagName === 'td') && properties.align === 'right') addClass(node, 'num');
  });
  visit(doc.hast, 'element', (node, index, parent) => {
    if (node.tagName !== 'table' || !parent || parent.properties?.className?.includes('sp-plate')) return;
    parent.children[index] = element('div', {
      className: ['sp-plate'],
      tabIndex: 0,
      role: 'region',
      ariaLabel: 'Table, scroll horizontally if needed',
    }, [node]);
  });
  doc.html = stringify.stringify(doc.hast);
}

function deriveRelationships(graph) {
  for (const doc of graph.documents) {
    for (const id of doc.outboundLinks) graph.byId.get(id).backlinks.add(doc.id);
  }
}

export async function createGraph(entries) {
  const documents = [];
  for (const entry of entries) {
    const id = entry.id.replaceAll('\\', '/');
    const kind = kindFor(id);
    const raw = readFileSync(path.join(repoRoot, id), 'utf8');
    const parsed = parseSource(id, raw);
    const ast = markdown.parse(parsed.body);
    const h1 = ast.children.find((node) => node.type === 'heading' && node.depth === 1);
    if (!h1) throw new Error(`${id}: a document needs an H1 title`);
    const doc = {
      id,
      raw,
      ...parsed,
      ast,
      hast: await toHtml.run(ast),
      title: text(h1),
      kind,
      url: routeFor(id),
      headings: [],
      source: {
        path: id,
        commit: release.commit,
        blobUrl: blobUrl(id),
        lineRange: [1, raw.split('\n').length - (raw.endsWith('\n') ? 1 : 0)],
      },
      order: orderFor(id),
      parentId: null,
      outboundLinks: new Set(),
      backlinks: new Set(),
    };
    if (doc.kind === 'Core') {
      doc.lineCounts = {
        total: doc.source.lineRange[1],
        body: parsed.body.trim().split('\n').length,
      };
    }
    validateMetadata(doc);
    prepareHeadings(doc);
    documents.push(doc);
  }
  documents.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const graph = {
    documents,
    byId: new Map(documents.map((doc) => [doc.id, doc])),
    byUrl: new Map(),
    specialRoutes: new Map([
      ['/', new Set(['skills', 'core', 'check', 'install', 'philosophy'])],
      ['/library/', new Set()],
      ['/tools/misty-check/', new Set()],
      ['/tools/extract-conflict-context/', new Set()],
      ['/search/', new Set()],
      ['/find/', new Set()],
    ]),
  };
  for (const doc of documents) {
    if (graph.byUrl.has(doc.url)) throw new Error(`Duplicate canonical route ${doc.url}: ${doc.id}`);
    graph.byUrl.set(doc.url, doc);
  }
  const failures = [];
  for (const doc of documents) {
    try { decorateHtml(doc, graph); }
    catch (error) { failures.push(error.message); }
  }
  if (failures.length) throw new Error(`Invalid content graph:\n${failures.join('\n')}`);
  deriveRelationships(graph);
  graph.index = documents.map(({ id, kind, title, url, headings, source, outboundLinks, backlinks, parentId, order }) => ({
    id, kind, title, url, headings, source,
    outboundLinks: [...outboundLinks],
    backlinks: [...backlinks],
    parentId,
    order,
  }));
  return graph;
}

export const catalogKinds = ['Skills', 'Core'];
export const publicRoutes = (graph) => [
  '/',
  '/library/',
  '/tools/misty-check/',
  '/tools/extract-conflict-context/',
  '/search/',
  ...graph.documents.map((doc) => doc.url),
];
