#!/usr/bin/env node
/**
 * Deterministic ~1-second repository baseline auditor.
 * Zero external dependencies — Node built-ins only.
 *
 * Usage:
 *   node skills/foundations/scripts/misty-check.mjs [path] [--json] [--strict]
 */

import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
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

function readNonEmptyFile(filePath) {
  try {
    if (!existsSync(filePath)) return null;
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

function checkProductDoc(root) {
  const product = readNonEmptyFile(path.join(root, 'PRODUCT.md'));
  if (product && !product.empty) {
    return { id: 'product-doc', label: 'PRODUCT.md', status: 'pass', detail: `Found PRODUCT.md (${product.lines} lines)` };
  }
  const legacySpec = readNonEmptyFile(path.join(root, 'SPEC.md'));
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

function checkDesignDoc(root) {
  const design = readNonEmptyFile(path.join(root, 'DESIGN.md'));
  if (design && !design.empty) {
    return { id: 'design-doc', label: 'DESIGN.md', status: 'pass', detail: `Found DESIGN.md (${design.lines} lines)` };
  }
  return { id: 'design-doc', label: 'DESIGN.md', status: 'gap', detail: 'Missing DESIGN.md at repository root' };
}

function checkAgentGuide(root) {
  const found = [];
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const file = readNonEmptyFile(path.join(root, name));
    if (file && !file.empty) found.push(`${name} (${file.lines} lines)`);
  }
  if (found.length > 0) {
    return { id: 'agent-guide', label: 'Agent guide', status: 'pass', detail: `Found ${found.join(', ')}` };
  }
  return { id: 'agent-guide', label: 'Agent guide', status: 'gap', detail: 'Missing AGENTS.md or CLAUDE.md at repository root' };
}

function checkReadmeRun(root) {
  const readme = readNonEmptyFile(path.join(root, 'README.md'));
  if (!readme || readme.empty) {
    return { id: 'local-run', label: 'Local run docs', status: 'gap', detail: 'Missing README.md at repository root' };
  }
  const hasCodeBlock = /```[\s\S]*?```/.test(readme.text);
  const hasRunCue = /\b(run|start|dev|build|test|check|install|verify)\b/i.test(readme.text);
  if (hasCodeBlock && hasRunCue) {
    return { id: 'local-run', label: 'Local run docs', status: 'pass', detail: `README.md documents runnable commands (${readme.lines} lines)` };
  }
  return {
    id: 'local-run',
    label: 'Local run docs',
    status: 'gap',
    detail: 'README.md found, but lacks a fenced local run or verify command block',
  };
}

function detectPackageScripts(filePath, prefix = '') {
  const file = readNonEmptyFile(filePath);
  if (!file || file.empty) return [];
  try {
    const pkg = JSON.parse(file.text);
    const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? Object.keys(pkg.scripts) : [];
    const interesting = scripts.filter((name) => /^(test|lint|check|typecheck|verify|build)(:|$)/i.test(name));
    return interesting.map((name) => `${prefix}npm:${name}`);
  } catch {
    return [];
  }
}

function checkVerifyScripts(root) {
  const found = [
    ...detectPackageScripts(path.join(root, 'package.json')),
    ...detectPackageScripts(path.join(root, 'site', 'package.json'), 'site/'),
  ];
  for (const rel of ['scripts/check', 'scripts/verify', 'Makefile', 'justfile', 'Cargo.toml', 'pyproject.toml', 'go.mod']) {
    const full = path.join(root, rel);
    if (existsSync(full) && statSync(full).isFile()) found.push(rel);
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
    detail: 'No test, lint, check, or build entrypoint detected',
  };
}

function checkGitignoreHygiene(root) {
  const gitignore = readNonEmptyFile(path.join(root, '.gitignore'));
  if (!gitignore || gitignore.empty) {
    return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'gap', detail: 'Missing .gitignore at repository root' };
  }
  const activeLines = gitignore.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  const ignoresEnv = activeLines.some((line) => /(^|\/)\.env(\.|\*|$)/i.test(line));
  if (ignoresEnv) {
    return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'pass', detail: '.gitignore excludes .env files' };
  }
  return {
    id: 'gitignore-hygiene',
    label: '.gitignore hygiene',
    status: 'gap',
    detail: '.gitignore found, but does not ignore .env files',
  };
}

function checkSecretGate(root) {
  const signals = [];
  for (const rel of [
    '.githooks/trufflehog-gate.py',
    '.githooks/pre-commit',
    '.githooks/pre-push',
    '.gitleaks.toml',
    '.pre-commit-config.yaml',
  ]) {
    if (existsSync(path.join(root, rel))) signals.push(rel);
  }
  const workflowsDir = path.join(root, '.github', 'workflows');
  if (existsSync(workflowsDir) && statSync(workflowsDir).isDirectory()) {
    for (const entry of readdirSync(workflowsDir)) {
      if (!/\.ya?ml$/i.test(entry)) continue;
      const wf = readNonEmptyFile(path.join(workflowsDir, entry));
      if (wf && /\b(trufflehog|gitleaks)\b/i.test(wf.text)) {
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
    detail: 'No TruffleHog, Gitleaks, or pre-commit secret-scanning gate detected',
  };
}

function checkHealthzEndpoint(root) {
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
      const rel = path.relative(root, full).replaceAll(path.sep, '/');
      if (/(^|\/)misty-check(\.test)?\.mjs$/.test(rel)) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!CODE_EXTENSIONS.has(ext) && !CODE_BASENAMES.has(entry.name)) continue;
      scanned += 1;
      try {
        const stat = lstatSync(full);
        if (stat.size === 0 || stat.size > MAX_FILE_BYTES) continue;
        const text = readFileSync(full, 'utf8');
        if (text.includes('\0')) continue;
        if (HEALTHZ_RE.test(text)) matches.push(rel);
      } catch {
        // Ignore unreadable files.
      }
    }
  }

  walk(root, 0);
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
  const startedAt = performance.now();
  const checks = [
    checkProductDoc(target),
    checkDesignDoc(target),
    checkAgentGuide(target),
    checkReadmeRun(target),
    checkVerifyScripts(target),
    checkGitignoreHygiene(target),
    checkSecretGate(target),
    checkHealthzEndpoint(target),
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

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
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
