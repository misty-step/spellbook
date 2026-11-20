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
const RUN_COMMAND_RE = /(^|\s)(?:npm|pnpm|yarn|bun|node|deno|python3?|pytest|uv|cargo|go|make|just|docker|podman|npx|tsx|\.\.?\/[\w./-]+)\b/m;
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
    if (RUN_COMMAND_RE.test(body)) {
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
    const interesting = scripts
      .filter(([name, cmd]) => typeof cmd === 'string' && cmd.trim().length > 0 && /^(test|lint|check|typecheck|verify)(:|$)/i.test(name))
      .map(([name]) => `${prefix}npm:${name}`);
    return interesting;
  } catch {
    return [];
  }
}

function checkVerifyScripts(rootReal) {
  const found = [
    ...detectPackageScripts(rootReal, 'package.json'),
    ...detectPackageScripts(rootReal, 'site/package.json', 'site/'),
  ];
  for (const rel of ['scripts/check', 'scripts/verify']) {
    const script = readSafeFile(rootReal, rel);
    if (script && !script.empty) found.push(rel);
  }
  for (const rel of ['Makefile', 'justfile']) {
    const file = readSafeFile(rootReal, rel);
    if (file && !file.empty && /^(?:test|lint|check|verify)\s*:/im.test(file.text)) {
      found.push(rel);
    }
  }
  const pyproject = readSafeFile(rootReal, 'pyproject.toml');
  if (pyproject && !pyproject.empty && /\[tool\.(?:pytest|ruff|mypy|flake8)\b/i.test(pyproject.text)) {
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

  let ignoresDotEnv = false;
  for (const line of activeLines) {
    if (line.startsWith('!')) {
      const pattern = line.slice(1).trim();
      // Re-including example/template files is fine; re-including real .env negates protection.
      if (/^(?:\/|\*\*\/)?\.env(?:\*|\.\*)?$/i.test(pattern)) {
        ignoresDotEnv = false;
      }
      continue;
    }
    if (/^(?:\/|\*\*\/)?\.env(?:\*|\.\*|(?:\.local)?)?$/i.test(line)) {
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
  const gateScript = readSafeFile(rootReal, '.githooks/trufflehog-gate.py');
  if (gateScript && !gateScript.empty && SECRET_SCANNER_RE.test(gateScript.text)) {
    signals.push('.githooks/trufflehog-gate.py');
  }
  const gitleaksToml = readSafeFile(rootReal, '.gitleaks.toml');
  if (gitleaksToml && !gitleaksToml.empty) {
    signals.push('.gitleaks.toml');
  }
  for (const rel of ['.githooks/pre-commit', '.githooks/pre-push', '.pre-commit-config.yaml']) {
    const file = readSafeFile(rootReal, rel);
    if (file && !file.empty && SECRET_SCANNER_RE.test(file.text)) {
      signals.push(rel);
    }
  }
  const workflowsDir = path.join(rootReal, '.github', 'workflows');
  if (existsSync(workflowsDir) && isWithinRoot(rootReal, workflowsDir) && statSync(workflowsDir).isDirectory()) {
    for (const entry of readdirSync(workflowsDir).sort()) {
      if (!/\.ya?ml$/i.test(entry)) continue;
      const wf = readSafeFile(rootReal, path.join('.github', 'workflows', entry));
      if (wf && SECRET_SCANNER_RE.test(wf.text)) {
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
    detail: 'No TruffleHog, Gitleaks, or secret-scanning hook/CI gate detected',
  };
}

function stripComments(text, ext) {
  if (['.py', '.sh', '.rb', '.yaml', '.yml', '.toml'].includes(ext) || ext === '') {
    return text.replace(/^\s*#.*$/gm, '');
  }
  // Remove /* ... */ and line-level or trailing // ... comments without mangling https:// URLs.
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
