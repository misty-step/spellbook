#!/usr/bin/env node
/**
 * Deterministic ~1-second repository baseline auditor.
 * Zero external dependencies — Node built-ins only.
 *
 * Usage:
 *   node skills/foundations/scripts/misty-check.mjs [path] [--json] [--strict]
 */

import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'target',
  '.astro',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.venv',
  'venv',
  '__pycache__',
  'coverage',
  '.cache',
  '.turbo',
  '.generated',
  'vendor',
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.mts', '.cts', '.tsx',
  '.py', '.rs', '.go', '.rb', '.java', '.kt', '.cs', '.php', '.sh',
  '.astro', '.svelte', '.vue',
  '.json', '.jsonc', '.toml', '.yaml', '.yml',
]);

const CODE_BASENAMES = new Set(['Dockerfile', 'Caddyfile', 'Makefile', 'nginx.conf']);
const MAX_SCAN_DEPTH = 6;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES_SCANNED = 2000;
const HEALTHZ_RE = /\/healthz(?![a-z0-9_-])/i;
const SHELL_FENCE_LANGS = new Set(['', 'sh', 'shell', 'bash', 'zsh', 'console', 'cmd', 'powershell', 'pwsh']);
const RUN_COMMAND_RE = /^\s*(?:\$\s*)?(?:[A-Z_][A-Z0-9_]*=\S+\s+)*(?:npm|pnpm|yarn|bun|node|deno|python3?|pytest|uv|cargo|go|make|just|docker|podman|npx|tsx|\.\.?\/[\w./-]+)(?:\s|$)/m;
const SECRET_SCANNER_RE = /\b(trufflehog|gitleaks|detect-secrets|git-secrets|secretlint)\b/i;

function isWithinRoot(rootReal, filePath) {
  try {
    const resolved = realpathSync(filePath);
    const rel = path.relative(rootReal, resolved);
    return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`));
  } catch {
    return false;
  }
}

function readSafeFile(rootReal, relPath) {
  const filePath = path.join(rootReal, relPath);
  try {
    if (!existsSync(filePath)) return null;
    if (!isWithinRoot(rootReal, filePath)) return null;
    const stat = statSync(filePath);
    if (!stat.isFile()) return null;
    const text = readFileSync(filePath, 'utf8');
    if (text.trim().length === 0) return { text, lines: 0, empty: true };
    const lines = text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0);
    return { text, lines, empty: false };
  } catch {
    return null;
  }
}

function stripHashComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let quote = null;
      let escaped = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\' && quote !== "'") {
          escaped = true;
          continue;
        }
        if (quote) {
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        if (ch === '#') {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join('\n');
}

function checkProductDoc(rootReal) {
  const product = readSafeFile(rootReal, 'PRODUCT.md');
  if (product && !product.empty) {
    return { id: 'product-doc', label: 'PRODUCT.md', status: 'pass', detail: `Found PRODUCT.md (${product.lines} lines)` };
  }
  const legacySpec = readSafeFile(rootReal, 'SPEC.md');
  if (legacySpec && !legacySpec.empty) {
    return {
      id: 'product-doc',
      label: 'PRODUCT.md',
      status: 'gap',
      detail: 'Missing PRODUCT.md (legacy SPEC.md found; consolidate into present-tense PRODUCT.md)',
    };
  }
  return { id: 'product-doc', label: 'PRODUCT.md', status: 'gap', detail: 'Missing PRODUCT.md at repository root' };
}

function checkDesignDoc(rootReal) {
  const design = readSafeFile(rootReal, 'DESIGN.md');
  if (design && !design.empty) {
    return { id: 'design-doc', label: 'DESIGN.md', status: 'pass', detail: `Found DESIGN.md (${design.lines} lines)` };
  }
  return { id: 'design-doc', label: 'DESIGN.md', status: 'gap', detail: 'Missing DESIGN.md at repository root' };
}

function checkAgentGuide(rootReal) {
  const found = [];
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const file = readSafeFile(rootReal, name);
    if (file && !file.empty) found.push(`${name} (${file.lines} lines)`);
  }
  if (found.length > 0) {
    return { id: 'agent-guide', label: 'Agent guide', status: 'pass', detail: `Found ${found.join(', ')}` };
  }
  return { id: 'agent-guide', label: 'Agent guide', status: 'gap', detail: 'Missing AGENTS.md or CLAUDE.md at repository root' };
}

function checkReadmeRun(rootReal) {
  const readme = readSafeFile(rootReal, 'README.md');
  if (!readme || readme.empty) {
    return { id: 'local-run', label: 'Local run docs', status: 'gap', detail: 'Missing README.md at repository root' };
  }
  const fences = readme.text.matchAll(/```([^\n`]*)\r?\n([\s\S]*?)```/g);
  for (const [, rawLang, body] of fences) {
    const lang = rawLang.trim().toLowerCase().split(/\s+/)[0] ?? '';
    if (!SHELL_FENCE_LANGS.has(lang)) continue;
    const uncommented = stripHashComments(body);
    if (RUN_COMMAND_RE.test(uncommented)) {
      return { id: 'local-run', label: 'Local run docs', status: 'pass', detail: `README.md documents runnable commands (${readme.lines} lines)` };
    }
  }
  return {
    id: 'local-run',
    label: 'Local run docs',
    status: 'gap',
    detail: 'README.md found, but lacks a runnable shell command block',
  };
}

function detectPackageScripts(rootReal, relPath, prefix = '') {
  const file = readSafeFile(rootReal, relPath);
  if (!file || file.empty) return [];
  try {
    const pkg = JSON.parse(file.text);
    const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? Object.entries(pkg.scripts) : [];
    return scripts
      .filter(([name, cmd]) => typeof cmd === 'string' && cmd.trim().length > 0 && /^(test|lint|check|typecheck|verify)(:|$)/i.test(name))
      .map(([name]) => `${prefix}npm:${name}`);
  } catch {
    return [];
  }
}

function hasRecipeTarget(text) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^(?:test|lint|check|verify)\s*:/.test(lines[i])) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (!/^[ \t]/.test(next)) break;
      const body = stripHashComments(next).trim();
      if (body.length > 0) return true;
    }
  }
  return false;
}

function checkVerifyScripts(rootReal) {
  const found = [
    ...detectPackageScripts(rootReal, 'package.json'),
    ...detectPackageScripts(rootReal, 'site/package.json', 'site/'),
  ];
  for (const rel of ['scripts/check', 'scripts/verify']) {
    const script = readSafeFile(rootReal, rel);
    if (script && !script.empty && stripHashComments(script.text).trim().length > 0) found.push(rel);
  }
  for (const rel of ['Makefile', 'justfile']) {
    const file = readSafeFile(rootReal, rel);
    if (file && !file.empty && hasRecipeTarget(file.text)) {
      found.push(rel);
    }
  }
  const pyproject = readSafeFile(rootReal, 'pyproject.toml');
  if (pyproject && !pyproject.empty && /\[tool\.(?:pytest|ruff|mypy|flake8)\b/i.test(stripHashComments(pyproject.text))) {
    found.push('pyproject.toml');
  }
  if (found.length > 0) {
    const unique = [...new Set(found)];
    return {
      id: 'verify-scripts',
      label: 'Test/lint gate',
      status: 'pass',
      detail: `Detected ${unique.slice(0, 6).join(', ')}${unique.length > 6 ? ` (+${unique.length - 6} more)` : ''}`,
    };
  }
  return {
    id: 'verify-scripts',
    label: 'Test/lint gate',
    status: 'gap',
    detail: 'No test, lint, check, or typecheck gate detected',
  };
}

function checkGitignoreHygiene(rootReal) {
  const gitignore = readSafeFile(rootReal, '.gitignore');
  if (!gitignore || gitignore.empty) {
    return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'gap', detail: 'Missing .gitignore at repository root' };
  }
  const activeLines = gitignore.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  // Case-sensitive Git semantics for bare ".env" protection: last matching rule wins.
  // Note: ".env.*" only matches ".env.local" etc., NOT bare ".env".
  const matchesBareDotEnv = (pattern) => /^(?:\/|\*\*\/)?\.env(?:\*)?$/.test(pattern);
  let ignoresDotEnv = false;
  for (const line of activeLines) {
    if (line.startsWith('!')) {
      if (matchesBareDotEnv(line.slice(1).trim())) {
        ignoresDotEnv = false;
      }
      continue;
    }
    if (matchesBareDotEnv(line)) {
      ignoresDotEnv = true;
    }
  }

  if (ignoresDotEnv) {
    return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'pass', detail: '.gitignore excludes .env files' };
  }
  return {
    id: 'gitignore-hygiene',
    label: '.gitignore hygiene',
    status: 'gap',
    detail: '.gitignore does not effectively ignore .env files',
  };
}

function checkSecretGate(rootReal) {
  const signals = [];
  for (const rel of [
    '.githooks/trufflehog-gate.py',
    '.githooks/pre-commit',
    '.githooks/pre-push',
    '.pre-commit-config.yaml',
  ]) {
    const file = readSafeFile(rootReal, rel);
    if (!file || file.empty) continue;
    const active = stripHashComments(file.text);
    if (SECRET_SCANNER_RE.test(active)) {
      signals.push(rel);
    }
  }
  const workflowsDir = path.join(rootReal, '.github', 'workflows');
  if (existsSync(workflowsDir) && isWithinRoot(rootReal, workflowsDir) && statSync(workflowsDir).isDirectory()) {
    for (const entry of readdirSync(workflowsDir).sort()) {
      if (!/\.ya?ml$/i.test(entry)) continue;
      const wf = readSafeFile(rootReal, path.join('.github', 'workflows', entry));
      if (wf && SECRET_SCANNER_RE.test(stripHashComments(wf.text))) {
        signals.push(`.github/workflows/${entry}`);
      }
    }
  }
  if (signals.length > 0) {
    return {
      id: 'secret-gate',
      label: 'Secret gate',
      status: 'pass',
      detail: `Found ${[...new Set(signals)].slice(0, 4).join(', ')}`,
    };
  }
  return {
    id: 'secret-gate',
    label: 'Secret gate',
    status: 'gap',
    detail: 'No active TruffleHog, Gitleaks, or secret-scanning hook/CI gate detected',
  };
}

function stripComments(text, ext) {
  if (['.py', '.sh', '.rb', '.yaml', '.yml', '.toml'].includes(ext) || ext === '') {
    return stripHashComments(text);
  }
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\r\n]*/g, '$1');
}

function checkHealthzEndpoint(rootReal) {
  let scanned = 0;
  let truncated = false;
  const matches = [];

  function walk(dir, depth) {
    if (depth > MAX_SCAN_DEPTH || matches.length >= 3) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (matches.length >= 3) return;
      if (scanned >= MAX_FILES_SCANNED) {
        truncated = true;
        return;
      }
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(rootReal, full).replaceAll(path.sep, '/');
      if (/(^|\/)misty-check(\.test)?\.mjs$/.test(rel)) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!CODE_EXTENSIONS.has(ext) && !CODE_BASENAMES.has(entry.name)) continue;
      scanned += 1;
      try {
        const stat = lstatSync(full);
        if (stat.size === 0 || stat.size > MAX_FILE_BYTES) continue;
        const text = readFileSync(full, 'utf8');
        if (text.includes('\0')) continue;
        const codeOnly = stripComments(text, ext);
        if (HEALTHZ_RE.test(codeOnly)) matches.push(rel);
      } catch {
        // Ignore unreadable files.
      }
    }
  }

  walk(rootReal, 0);
  if (matches.length > 0) {
    return {
      id: 'healthz',
      label: '/healthz endpoint',
      status: 'pass',
      detail: `Referenced in ${matches.join(', ')}`,
    };
  }
  const suffix = truncated ? ` (scan capped at ${MAX_FILES_SCANNED} code files)` : '';
  return {
    id: 'healthz',
    label: '/healthz endpoint',
    status: 'gap',
    detail: `No /healthz route or reference found in code/config${suffix}`,
  };
}

export function auditRepo(targetPath = '.') {
  const target = path.resolve(targetPath);
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Target path is not an existing directory: ${target}`);
  }
  const rootReal = realpathSync(target);
  const startedAt = performance.now();
  const checks = [
    checkProductDoc(rootReal),
    checkDesignDoc(rootReal),
    checkAgentGuide(rootReal),
    checkReadmeRun(rootReal),
    checkVerifyScripts(rootReal),
    checkGitignoreHygiene(rootReal),
    checkSecretGate(rootReal),
    checkHealthzEndpoint(rootReal),
  ];
  const elapsedMs = Math.round(performance.now() - startedAt);
  const passed = checks.filter((c) => c.status === 'pass').length;
  const gaps = checks.length - passed;
  return {
    target,
    elapsedMs,
    summary: {
      passed,
      gaps,
      total: checks.length,
      score: `${passed}/${checks.length}`,
    },
    checks,
  };
}

export function formatScorecard(report) {
  const lines = [
    `misty-check · ${report.target}`,
    `Score: ${report.summary.score} passed · ${report.summary.gaps} gap${report.summary.gaps === 1 ? '' : 's'} (${report.elapsedMs}ms)`,
    '',
  ];
  const labelWidth = Math.max(...report.checks.map((c) => c.label.length));
  for (const check of report.checks) {
    const tag = check.status === 'pass' ? '[PASS]' : '[GAP ]';
    lines.push(`${tag} ${check.label.padEnd(labelWidth)}  ${check.detail}`);
  }
  return lines.join('\n');
}

export function parseArgs(argv) {
  let target = '.';
  let json = false;
  let strict = false;
  let help = false;
  let positionalSeen = false;

  for (const arg of argv) {
    if (arg === '--json') json = true;
    else if (arg === '--strict') strict = true;
    else if (arg === '-h' || arg === '--help') help = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown flag: ${arg}`);
    else if (!positionalSeen) {
      target = arg;
      positionalSeen = true;
    } else {
      throw new Error(`Unexpected extra positional argument: ${arg}`);
    }
  }
  return { target, json, strict, help };
}

const USAGE = [
  'Usage: misty-check.mjs [path] [--json] [--strict]',
  '',
  'Audit a repository against mistystack baseline foundations.',
  '  path      Target directory (default: ".")',
  '  --json    Emit machine-readable JSON scorecard',
  '  --strict  Exit with code 1 when any gap is reported',
  '  -h,--help Show this help text',
].join('\n');

function isDirectInvocation() {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
  }
}

if (isDirectInvocation()) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
      console.log(USAGE);
      process.exit(0);
    }
    const report = auditRepo(opts.target);
    console.log(opts.json ? JSON.stringify(report, null, 2) : formatScorecard(report));
    if (opts.strict && report.summary.gaps > 0) process.exit(1);
  } catch (error) {
    console.error(`misty-check error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}
