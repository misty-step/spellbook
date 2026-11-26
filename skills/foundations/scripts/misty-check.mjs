#!/usr/bin/env node
/**
 * Deterministic ~1-second repository baseline auditor.
 * Zero external dependencies — Node built-ins only.
 *
 * Usage:
 *   node skills/foundations/scripts/misty-check.mjs [path] [--json] [--strict] [--strict-layout]
 */

import { spawnSync } from 'node:child_process';
import { closeSync, constants as fsConstants, existsSync, fstatSync, lstatSync, openSync, readdirSync, readFileSync, readSync, realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  '.json', '.jsonc', '.toml', '.yaml', '.yml', '.conf',
]);

const CODE_BASENAMES = new Set(['Dockerfile', 'Caddyfile', 'Makefile', 'nginx.conf']);
const HASH_COMMENT_EXTENSIONS = new Set(['.py', '.sh', '.rb', '.yaml', '.yml', '.toml', '.conf', '']);
const MAX_SCAN_DEPTH = 6;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES_SCANNED = 2000;
const HEALTHZ_RE = /\/healthz(?![a-z0-9_-])/i;
const SHELL_FENCE_LANGS = new Set(['', 'sh', 'shell', 'bash', 'zsh', 'console', 'cmd', 'powershell', 'pwsh']);
const RUN_COMMAND_RE = /^\s*(?:\$\s*)?(?:[A-Z_][A-Z0-9_]*=\S+\s+)*(?:npm|pnpm|yarn|bun|node|deno|python3?|pytest|uv|cargo|go|make|just|docker|podman|npx|tsx|\.\.?\/[\w./-]+)(?:\s|$)/m;
const SCANNER_NAMES = '(?:trufflehog|gitleaks|detect-secrets|git-secrets|secretlint)';
const SHELL_SCANNER_CMD_RE = new RegExp(
  `(?:^|[;&|]\\s*|\\$\\(\\s*)(?:exec\\s+)?(?:[A-Z_][A-Z0-9_]*=\\S+\\s+)*(?:python3?\\s+(?:[^\\s;|&]+\\/)?trufflehog-gate\\.py\\b|(?:[^\\s;|&"']+\\/)?${SCANNER_NAMES}\\b)`,
  'i',
);
const PRINT_CMD_RE = /^\s*(?:echo|printf)\b/i;
const WEB_FRAMEWORK_DEPS = new Set([
  'astro', 'next', 'react', 'react-dom', 'vue', 'nuxt',
  'svelte', '@sveltejs/kit', '@remix-run/react', 'react-router',
  'solid-js', '@angular/core', 'gatsby', 'preact',
]);
const DESKTOP_FRAMEWORK_DEPS = new Set(['electron', '@tauri-apps/api', '@tauri-apps/cli']);
const MARKUP_EXTENSIONS = new Set(['.html', '.htm', '.astro', '.tsx', '.jsx', '.svelte', '.vue', '.ejs', '.hbs', '.njk']);
const TEST_DIRS = new Set(['__tests__', 'test', 'tests', 'fixtures']);
const TEST_PATH_RE = /(?:^|\/)(?:__tests__|tests?|fixtures)\/|\.(?:test|spec)\.[^/]+$/i;
const FAVICON_FILE_RE = /^(?:favicon[^/]*\.(?:ico|svg|png|webp)|apple-touch-icon[^/]*\.png)$/i;
const VIEWPORT_EXPORT_RE = /\bexport\s+(?:const|async\s+function|function)\s+viewport\b/;
const MANIFEST_FILE_RE = /\.webmanifest$/i;
const NEXT_MANIFEST_RE = /(?:^|\/)app\/manifest\.[cm]?[jt]sx?$/i;
const HTML_DOC_RE = /<!doctype\s+html\b|<html\b/i;

const LAYOUT_MAX_DIR_FILES = 15;
const LAYOUT_MAX_FILE_LINES = 2000;
const LAYOUT_MAX_DEPTH = 64;
const LAYOUT_MAX_FILES = 50000;
const LAYOUT_LINE_CHUNK_BYTES = 64 * 1024;
const LAYOUT_MAX_READ_BYTES = 64 * 1024 * 1024;
const LAYOUT_TEXT_FINDING_LIMIT = 20;
const LAYOUT_ALLOW_FILENAME = '.misty-check.allow';
const LAYOUT_EXTRA_SKIP_DIRS = new Set([
  'docs',
  'doc',
  'documentation',
  'evidence',
  'captures',
  'fixtures',
  '__fixtures__',
  'testdata',
  '__snapshots__',
  'snapshots',
  'generated',
  'third_party',
  'third-party',
  'assets',
  'public',
  'static',
  'out',
  '.output',
  '.tox',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.gradle',
]);
const LAYOUT_SOURCE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.mts', '.cts', '.tsx',
  '.py', '.pyi',
  '.rs', '.go', '.rb',
  '.java', '.kt', '.kts', '.scala',
  '.cs', '.fs', '.fsx', '.php', '.swift',
  '.c', '.h', '.cc', '.cpp', '.cxx', '.hh', '.hpp', '.hxx', '.m', '.mm',
  '.zig', '.dart', '.lua',
  '.ex', '.exs', '.erl', '.hrl', '.hs', '.ml', '.mli', '.clj', '.cljs', '.cljc',
  '.r', '.pl', '.pm', '.jl', '.nim', '.cr', '.d',
  '.v', '.sv', '.vhd', '.vhdl', '.groovy',
  '.sh', '.bash', '.zsh', '.fish', '.ksh', '.csh', '.ps1', '.psm1',
  '.astro', '.svelte', '.vue', '.elm', '.purs',
  '.rkt', '.scm', '.lisp', '.el', '.vim', '.nix', '.tf', '.hcl', '.cue', '.bzl', '.star',
  '.sol', '.move', '.cairo', '.qnt', '.tla',
  '.f', '.f90', '.f95', '.for', '.f03', '.f08',
  '.vb', '.vbs', '.pas', '.pp', '.ada', '.adb', '.ads',
  '.awk', '.tcl', '.cu', '.cuh', '.ino', '.wgsl', '.glsl', '.hlsl', '.metal',
  '.sql', '.proto', '.graphql', '.gql',
  '.css', '.scss', '.sass', '.less', '.styl',
  '.html', '.htm', '.ejs', '.hbs', '.njk', '.erb', '.haml', '.pug', '.twig',
]);
const LAYOUT_GENERATED_FILE_RE = /\.(?:min|bundle)\.(?:[cm]?[jt]sx?|css)$|\.d\.[cm]?ts$|\.(?:pb|gen)\.go$|\.generated\.[^/]+$/i;

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
    return {
      id: 'product-doc',
      label: 'PRODUCT.md',
      status: 'pass',
      detail: `Found PRODUCT.md (${product.lines} lines · Active Folio)`,
    };
  }
  const legacySpec = readSafeFile(rootReal, 'SPEC.md');
  if (legacySpec && !legacySpec.empty) {
    return {
      id: 'product-doc',
      label: 'PRODUCT.md',
      status: 'gap',
      detail: 'Missing PRODUCT.md (legacy SPEC.md found; consolidate into present-tense Active Folio PRODUCT.md)',
    };
  }
  return {
    id: 'product-doc',
    label: 'PRODUCT.md',
    status: 'gap',
    detail: 'Missing Active Folio PRODUCT.md at repository root (structure is flexible)',
  };
}

function checkDesignDoc(rootReal) {
  const design = readSafeFile(rootReal, 'DESIGN.md');
  if (design && !design.empty) {
    return {
      id: 'design-doc',
      label: 'DESIGN.md',
      status: 'pass',
      detail: `Found DESIGN.md (${design.lines} lines · Active Folio)`,
    };
  }
  return {
    id: 'design-doc',
    label: 'DESIGN.md',
    status: 'gap',
    detail: 'Missing Active Folio DESIGN.md at repository root (recommended for UI projects; structure is flexible)',
  };
}

function summarizeActiveFolio(productCheck, designCheck) {
  const product = productCheck.status === 'pass';
  const design = designCheck.status === 'pass';
  if (product && design) {
    return {
      status: 'complete',
      product,
      design,
      advisory: 'Active Folio present (PRODUCT.md + DESIGN.md); custom section structures accepted.',
    };
  }
  if (product) {
    return {
      status: 'partial',
      product,
      design,
      advisory: 'PRODUCT.md present; add DESIGN.md for UI projects (summary is advisory; design-doc still counts under --strict).',
    };
  }
  if (design) {
    return {
      status: 'partial',
      product,
      design,
      advisory: 'DESIGN.md present; add present-tense PRODUCT.md for observable product intent (summary is advisory; product-doc still counts under --strict).',
    };
  }
  return {
    status: 'missing',
    product,
    design,
    advisory: 'No Active Folio found; add present-tense PRODUCT.md (and DESIGN.md for UI projects) — structure can flex (summary adds no extra gap; doc checks still count under --strict).',
  };
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

function hasRecipeTarget(text, requireTab) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^(?:test|lint|check|verify)\s*:/.test(lines[i])) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (next.trim() === '' || /^\s*#/.test(next)) continue;
      const validIndent = requireTab ? next.startsWith('\t') : /^[ \t]/.test(next);
      if (!validIndent) break;
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
  for (const [rel, requireTab] of [['Makefile', true], ['justfile', false]]) {
    const file = readSafeFile(rootReal, rel);
    if (file && !file.empty && hasRecipeTarget(file.text, requireTab)) {
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

function globMatchesDotEnv(rawPattern) {
  // Preserve leading spaces (Git treats leading spaces as literal filename characters);
  // strip unescaped trailing spaces only.
  const pattern = rawPattern.replace(/(?<!\\)[ \t]+$/, '');
  if (!pattern || pattern.endsWith('/')) return false;
  let core = pattern;
  if (core.startsWith('/')) core = core.slice(1);
  else if (core.startsWith('**/')) core = core.slice(3);
  if (core.includes('/')) return false;
  let regex = '^';
  for (let i = 0; i < core.length; i += 1) {
    const ch = core[i];
    if (ch === '\\' && i + 1 < core.length) {
      regex += core[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else if (ch === '*') {
      regex += '[^/]*';
    } else if (ch === '?') {
      regex += '[^/]';
    } else if (ch === '[') {
      const end = core.indexOf(']', i + 1);
      if (end !== -1) {
        let body = core.slice(i + 1, end);
        if (body.startsWith('!')) body = `^${body.slice(1)}`;
        regex += `[${body}]`;
        i = end;
      } else {
        regex += '\\[';
      }
    } else {
      regex += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  regex += '$';
  try {
    return new RegExp(regex).test('.env');
  } catch {
    return false;
  }
}

function checkGitignoreHygiene(rootReal) {
  const gitignore = readSafeFile(rootReal, '.gitignore');
  if (!gitignore || gitignore.empty) {
    return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'gap', detail: 'Missing .gitignore at repository root' };
  }

  // Prefer Git's own canonical ignore evaluator when inside a Git repository,
  // verifying that .env is actually ignored (not re-included by a `!` rule) by root .gitignore.
  if (existsSync(path.join(rootReal, '.git'))) {
    const probe = spawnSync('git', ['-C', rootReal, 'check-ignore', '--no-index', '-v', '.env'], {
      encoding: 'utf8',
    });
    if (probe.status === 0) {
      const line = (probe.stdout ?? '').split(/\r?\n/, 1)[0] ?? '';
      const match = /^([^:]+):\d+:([^\t]*)\t/.exec(line);
      const source = match?.[1]?.trim() ?? '';
      const pattern = match?.[2] ?? '';
      if (source === '.gitignore' && !pattern.startsWith('!')) {
        return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'pass', detail: '.gitignore excludes .env files (verified via git check-ignore)' };
      }
      if (pattern.startsWith('!')) {
        return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'gap', detail: `.env is re-included by negation rule "${pattern}" in ${source || '.gitignore'}` };
      }
      return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'gap', detail: `.env is ignored only by ${source || 'external excludes'}, not .gitignore` };
    }
    if (probe.status === 1) {
      return { id: 'gitignore-hygiene', label: '.gitignore hygiene', status: 'gap', detail: '.gitignore does not ignore .env (verified via git check-ignore)' };
    }
  }

  let ignoresDotEnv = false;
  for (const rawLine of gitignore.text.split(/\r?\n/)) {
    if (rawLine.length === 0 || rawLine.startsWith('#')) continue;
    if (rawLine.startsWith('!')) {
      if (globMatchesDotEnv(rawLine.slice(1))) ignoresDotEnv = false;
      continue;
    }
    if (globMatchesDotEnv(rawLine)) ignoresDotEnv = true;
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

function hasShellScannerInvocation(text) {
  const active = stripHashComments(text);
  for (const line of active.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || PRINT_CMD_RE.test(trimmed)) continue;
    if (SHELL_SCANNER_CMD_RE.test(trimmed)) return true;
  }
  return false;
}

const PYTHON_AST_SCANNER_PROBE = `
import ast, re, sys
SCANNER = re.compile(r'^(?:.*/)?(trufflehog|gitleaks|detect-secrets|git-secrets|secretlint)(?:\\s|$)', re.I)
SUBPROC = {'run', 'Popen', 'check_output', 'check_call', 'call'}
try:
    tree = ast.parse(sys.stdin.read())
except SyntaxError:
    sys.exit(1)
for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    fn = node.func
    is_subproc = isinstance(fn, ast.Attribute) and isinstance(fn.value, ast.Name) and fn.value.id == 'subprocess' and fn.attr in SUBPROC
    is_os = isinstance(fn, ast.Attribute) and isinstance(fn.value, ast.Name) and fn.value.id == 'os' and (fn.attr == 'system' or fn.attr.startswith('exec'))
    if not (is_subproc or is_os):
        continue
    arg = node.args[0] if node.args else None
    if arg is None and is_subproc:
        for kw in node.keywords:
            if kw.arg == 'args':
                arg = kw.value
                break
    if arg is None:
        continue
    first = None
    if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
        first = arg.value.strip()
    elif isinstance(arg, (ast.List, ast.Tuple)) and arg.elts:
        el = arg.elts[0]
        if isinstance(el, ast.Constant) and isinstance(el.value, str):
            first = el.value.strip()
    if first and SCANNER.match(first):
        sys.exit(0)
sys.exit(1)
`;

const PYTHON_SCANNER_BIN_RE = new RegExp(`^(?:.*/)?${SCANNER_NAMES}(?:\\s|$)`, 'i');
const PYTHON_SUBPROC_FUNCS = new Set(['run', 'Popen', 'check_output', 'check_call', 'call']);

function tokenizePython(text) {
  const tokens = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '#') {
      while (i < n && text[i] !== '\n') i += 1;
      continue;
    }
    if ((ch === '"' || ch === "'") && text[i + 1] === ch && text[i + 2] === ch) {
      const q = ch;
      i += 3;
      let val = '';
      while (i < n) {
        if (text[i] === '\\' && i + 1 < n) {
          val += text[i + 1];
          i += 2;
          continue;
        }
        if (text[i] === q && text[i + 1] === q && text[i + 2] === q) {
          i += 3;
          break;
        }
        val += text[i++];
      }
      tokens.push({ type: 'string', value: val });
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch;
      i += 1;
      let val = '';
      while (i < n && text[i] !== '\n') {
        if (text[i] === '\\' && i + 1 < n) {
          val += text[i + 1];
          i += 2;
          continue;
        }
        if (text[i] === q) {
          i += 1;
          break;
        }
        val += text[i++];
      }
      tokens.push({ type: 'string', value: val });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let start = i;
      while (i < n && /[A-Za-z0-9_]/.test(text[i])) i += 1;
      tokens.push({ type: 'ident', value: text.slice(start, i) });
      continue;
    }
    tokens.push({ type: 'punct', value: ch });
    i += 1;
  }
  return tokens;
}

function hasPythonScannerInTokens(text) {
  const tokens = tokenizePython(text);
  for (let i = 0; i + 4 < tokens.length; i += 1) {
    const t0 = tokens[i];
    const t1 = tokens[i + 1];
    const t2 = tokens[i + 2];
    const t3 = tokens[i + 3];
    if (t0.type !== 'ident' || t1.type !== 'punct' || t1.value !== '.' || t2.type !== 'ident' || t3.type !== 'punct' || t3.value !== '(') {
      continue;
    }
    const isSubproc = t0.value === 'subprocess' && PYTHON_SUBPROC_FUNCS.has(t2.value);
    const isOs = t0.value === 'os' && (t2.value === 'system' || t2.value.startsWith('exec'));
    if (!isSubproc && !isOs) continue;
    let idx = i + 4;
    if (isSubproc && tokens[idx]?.type === 'ident' && tokens[idx].value === 'args' && tokens[idx + 1]?.type === 'punct' && tokens[idx + 1].value === '=') {
      idx += 2;
    }
    if (tokens[idx]?.type === 'punct' && (tokens[idx].value === '[' || tokens[idx].value === '(')) {
      idx += 1;
    }
    if (tokens[idx]?.type === 'string' && PYTHON_SCANNER_BIN_RE.test(tokens[idx].value.trim())) {
      return true;
    }
  }
  return false;
}

function hasPythonScannerInvocation(text) {
  const probe = spawnSync('python3', ['-I', '-S', '-c', PYTHON_AST_SCANNER_PROBE], {
    input: text,
    cwd: tmpdir(),
    encoding: 'utf8',
  });
  if (probe.error == null && (probe.status === 0 || probe.status === 1)) {
    return probe.status === 0;
  }
  return hasPythonScannerInTokens(text);
}

function unquoteYamlScalar(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

function hasPreCommitScannerHook(text) {
  const active = stripHashComments(text);
  return new RegExp(`^\\s*-?\\s*(?:id|repo)\\s*:.*${SCANNER_NAMES}`, 'im').test(active);
}

function hasWorkflowScannerStep(text) {
  const lines = stripHashComments(text).split(/\r?\n/);
  const usesScannerRe = new RegExp(`^\\s*-?\\s*uses\\s*:\\s*["']?\\S*${SCANNER_NAMES}`, 'i');
  let inRunBlock = false;
  let runIndent = 0;

  for (const line of lines) {
    if (usesScannerRe.test(line)) return true;
    const indent = line.match(/^(\s*)/)[1].length;
    if (inRunBlock) {
      if (line.trim() === '') continue;
      if (indent > runIndent) {
        if (hasShellScannerInvocation(line)) return true;
        continue;
      }
      inRunBlock = false;
    }
    const inlineRun = /^\s*-?\s*run\s*:\s*(.*)$/.exec(line);
    if (inlineRun) {
      const value = inlineRun[1].trim();
      if (/^[|>][+-]?\d*$/.test(value)) {
        inRunBlock = true;
        runIndent = indent;
      } else if (value && hasShellScannerInvocation(unquoteYamlScalar(value))) {
        return true;
      }
    }
  }
  return false;
}

function checkSecretGate(rootReal) {
  const signals = [];
  const gateScript = readSafeFile(rootReal, '.githooks/trufflehog-gate.py');
  if (gateScript && !gateScript.empty && hasPythonScannerInvocation(gateScript.text)) {
    signals.push('.githooks/trufflehog-gate.py');
  }
  for (const rel of ['.githooks/pre-commit', '.githooks/pre-push']) {
    const file = readSafeFile(rootReal, rel);
    if (file && !file.empty && hasShellScannerInvocation(file.text)) {
      signals.push(rel);
    }
  }
  const preCommit = readSafeFile(rootReal, '.pre-commit-config.yaml');
  if (preCommit && !preCommit.empty && hasPreCommitScannerHook(preCommit.text)) {
    signals.push('.pre-commit-config.yaml');
  }
  const workflowsDir = path.join(rootReal, '.github', 'workflows');
  if (existsSync(workflowsDir) && isWithinRoot(rootReal, workflowsDir) && statSync(workflowsDir).isDirectory()) {
    for (const entry of readdirSync(workflowsDir).sort()) {
      if (!/\.ya?ml$/i.test(entry)) continue;
      const wf = readSafeFile(rootReal, path.join('.github', 'workflows', entry));
      if (wf && hasWorkflowScannerStep(wf.text)) {
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
  if (HASH_COMMENT_EXTENSIONS.has(ext)) {
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

function stripHtmlCommentsAndRawBlocks(text) {
  return text.replace(
    /<!--[\s\S]*?-->|<(script|style)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>/gi,
    '',
  );
}

function parseHeadTags(markup) {
  const tags = [];
  const tagRe = /<(link|meta)(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*?)\s*\/?>/gi;
  const attrRe = /(?:^|\s)([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of markup.matchAll(tagRe)) {
    const tag = match[1].toLowerCase();
    const attrs = new Map();
    for (const attr of match[2].matchAll(attrRe)) {
      const key = attr[1].toLowerCase();
      const val = attr[2] ?? attr[3] ?? attr[4] ?? '';
      if (!attrs.has(key)) attrs.set(key, val);
    }
    tags.push({ tag, attrs });
  }
  return tags;
}

function isWebAppManifestJson(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    if ('manifest_version' in parsed) return false;
    const hasName = typeof parsed.name === 'string' || typeof parsed.short_name === 'string';
    const hasWebField = ['icons', 'start_url', 'display', 'theme_color', 'background_color'].some((key) => key in parsed);
    return hasName && hasWebField;
  } catch {
    return false;
  }
}

function isValidManifestHref(rootReal, fileDir, rawHref) {
  const href = rawHref.split(/[?#]/, 1)[0].trim();
  if (!href) return false;
  if (!/\.json$/i.test(href) || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || href.includes('{')) {
    return true;
  }
  const candidates = [];
  if (href.startsWith('/')) {
    const cleanRel = href.replace(/^\/+/, '');
    let dir = fileDir;
    for (let hop = 0; hop <= MAX_SCAN_DEPTH + 1; hop += 1) {
      candidates.push(
        path.join(dir, cleanRel),
        path.join(dir, 'public', cleanRel),
        path.join(dir, 'static', cleanRel),
      );
      if (dir === rootReal) break;
      const parent = path.dirname(dir);
      if (parent === dir || !isWithinRoot(rootReal, parent)) break;
      dir = parent;
    }
  } else {
    candidates.push(path.resolve(fileDir, href));
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate) || !isWithinRoot(rootReal, candidate)) continue;
    try {
      if (!statSync(candidate).isFile()) continue;
      return isWebAppManifestJson(readFileSync(candidate, 'utf8'));
    } catch {
      return false;
    }
  }
  return true;
}

function inspectSurfaceClass(rootReal) {
  const detected = new Set();
  const webSignals = {
    favicon: [],
    viewport: [],
    manifest: [],
  };
  let scanned = 0;

  function record(list, rel) {
    if (list.length < 3 && !list.includes(rel)) list.push(rel);
  }

  function walk(dir, depth) {
    if (depth > MAX_SCAN_DEPTH || scanned >= MAX_FILES_SCANNED) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (scanned >= MAX_FILES_SCANNED) return;
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootReal, full).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || TEST_DIRS.has(entry.name.toLowerCase())) continue;
        if (entry.name.endsWith('.xcodeproj') || entry.name === 'src-tauri') {
          detected.add('native-desktop');
        }
        walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      if (TEST_PATH_RE.test(rel) || /(^|\/)misty-check(\.test)?\.mjs$/.test(rel)) continue;

      const base = entry.name;
      const lowerBase = base.toLowerCase();
      const ext = path.extname(lowerBase);

      if (FAVICON_FILE_RE.test(base)) record(webSignals.favicon, rel);
      if (MANIFEST_FILE_RE.test(base) || NEXT_MANIFEST_RE.test(rel)) record(webSignals.manifest, rel);
      if (base === 'tauri.conf.json' || base === 'Info.plist' || base === 'AndroidManifest.xml') {
        detected.add('native-desktop');
      }
      if (rel === 'src/main.rs' || rel === 'main.go' || /^cmd\/[^/]+\/main\.go$/.test(rel)) {
        detected.add('cli-service');
      }

      const wantsRead =
        lowerBase === 'package.json' ||
        (lowerBase === 'pyproject.toml' && depth <= 1) ||
        (lowerBase === 'cargo.toml' && depth <= 1) ||
        lowerBase === 'manifest.json' ||
        MARKUP_EXTENSIONS.has(ext) ||
        /(?:^|\/)(?:layout|root|document)\.[cm]?[jt]sx?$/i.test(rel);

      if (!wantsRead) continue;
      scanned += 1;

      let text;
      try {
        const stat = lstatSync(full);
        if (stat.size === 0 || stat.size > MAX_FILE_BYTES) continue;
        text = readFileSync(full, 'utf8');
        if (text.includes('\0')) continue;
      } catch {
        continue;
      }

      if (lowerBase === 'package.json') {
        try {
          const pkg = JSON.parse(text);
          const depNames = Object.keys({
            ...(pkg?.dependencies ?? {}),
            ...(pkg?.devDependencies ?? {}),
            ...(pkg?.peerDependencies ?? {}),
          });
          if (depNames.some((dep) => WEB_FRAMEWORK_DEPS.has(dep))) detected.add('web-app');
          if (depNames.some((dep) => DESKTOP_FRAMEWORK_DEPS.has(dep))) detected.add('native-desktop');
          if (pkg?.bin && (typeof pkg.bin === 'string' || (typeof pkg.bin === 'object' && Object.keys(pkg.bin).length > 0))) {
            detected.add('cli-service');
          }
        } catch {
          // Ignore malformed package.json.
        }
        continue;
      }

      if (lowerBase === 'pyproject.toml') {
        if (/\[project\.scripts\]/i.test(stripHashComments(text))) detected.add('cli-service');
        continue;
      }

      if (lowerBase === 'cargo.toml') {
        const active = stripHashComments(text);
        if (/\[\[bin\]\]/i.test(active)) detected.add('cli-service');
        if (/\b(?:tauri|egui|iced)\b/i.test(active)) detected.add('native-desktop');
        continue;
      }

      if (lowerBase === 'manifest.json') {
        if (isWebAppManifestJson(text)) record(webSignals.manifest, rel);
        continue;
      }

      const htmlStripped = stripHtmlCommentsAndRawBlocks(text);
      const activeMarkup = (ext === '.html' || ext === '.htm') ? htmlStripped : stripComments(htmlStripped, ext);
      if ((ext === '.html' || ext === '.htm') && HTML_DOC_RE.test(activeMarkup)) {
        detected.add('web-app');
      }
      if (VIEWPORT_EXPORT_RE.test(activeMarkup)) {
        record(webSignals.viewport, rel);
      }
      for (const { tag, attrs } of parseHeadTags(activeMarkup)) {
        if (tag === 'meta' && attrs.get('name')?.toLowerCase() === 'viewport') {
          record(webSignals.viewport, rel);
        } else if (tag === 'link') {
          const relTokens = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
          if (relTokens.includes('icon') || relTokens.includes('apple-touch-icon')) {
            record(webSignals.favicon, rel);
          }
          if (relTokens.includes('manifest') && attrs.has('href') && isValidManifestHref(rootReal, dir, attrs.get('href'))) {
            record(webSignals.manifest, rel);
          }
        }
      }
    }
  }

  walk(rootReal, 0);

  const ordered = ['web-app', 'native-desktop', 'cli-service'].filter((s) => detected.has(s));
  const checks = [];
  if (detected.has('web-app')) {
    checks.push(
      webSignals.favicon.length > 0
        ? { id: 'web-favicon', surface: 'web-app', label: 'Web favicon / icon', status: 'pass', detail: `Found ${webSignals.favicon.join(', ')}` }
        : { id: 'web-favicon', surface: 'web-app', label: 'Web favicon / icon', status: 'advisory', detail: 'No favicon or Apple touch icon detected (advisory; opt out in Folio Non-Goals if N/A)' },
      webSignals.viewport.length > 0
        ? { id: 'web-viewport', surface: 'web-app', label: 'Web viewport meta', status: 'pass', detail: `Found ${webSignals.viewport.join(', ')}` }
        : { id: 'web-viewport', surface: 'web-app', label: 'Web viewport meta', status: 'advisory', detail: 'No responsive viewport meta/export detected (advisory; opt out in Folio Non-Goals if N/A)' },
      webSignals.manifest.length > 0
        ? { id: 'web-manifest', surface: 'web-app', label: 'Web app manifest', status: 'pass', detail: `Found ${webSignals.manifest.join(', ')}` }
        : { id: 'web-manifest', surface: 'web-app', label: 'Web app manifest', status: 'advisory', detail: 'No manifest.webmanifest or web manifest link detected (advisory; opt out in Folio Non-Goals if N/A)' },
    );
  }

  return {
    detected: ordered,
    advisoryOnly: true,
    checks,
  };
}

function inspectLayoutSourceFile(fullPath, filename, buf) {
  const lower = filename.toLowerCase();
  const ext = path.extname(lower);
  const requireShebang = ext === '';
  if (requireShebang) {
    if (filename.startsWith('.')) return { status: 'skip' };
  } else if (LAYOUT_GENERATED_FILE_RE.test(lower) || !LAYOUT_SOURCE_EXTENSIONS.has(ext)) {
    return { status: 'skip' };
  }

  const openFlags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  let fd;
  try {
    const stat = lstatSync(fullPath);
    if (!stat.isFile() || stat.isSymbolicLink()) return { status: 'skip' };
    fd = openSync(fullPath, openFlags);
    const fstat = fstatSync(fd);
    if (!fstat.isFile()) return { status: 'skip' };
    const fileSize = fstat.size;
    if (requireShebang && fileSize < 2) return { status: 'skip' };
    if (fileSize === 0) return { status: 'ok', lines: 0, truncated: false };
    let encoding = null;
    let totalRead = 0;
    let lineBreaks = 0;
    let prevWasCR = false;
    let lastUnit = 0;
    let unitsRead = 0;
    let hasPendingByte = false;
    let pendingByte = 0;

    while (totalRead < LAYOUT_MAX_READ_BYTES) {
      const toRead = Math.min(buf.length, LAYOUT_MAX_READ_BYTES - totalRead);
      const bytesRead = readSync(fd, buf, 0, toRead, totalRead);
      if (bytesRead === 0) break;
      const slice = buf.subarray(0, bytesRead);
      let i = 0;
      if (encoding === null) {
        if (bytesRead >= 2 && slice[0] === 0xff && slice[1] === 0xfe) {
          encoding = 'utf16le';
          i = 2;
        } else if (bytesRead >= 2 && slice[0] === 0xfe && slice[1] === 0xff) {
          encoding = 'utf16be';
          i = 2;
        } else {
          encoding = 'utf8';
        }
        if (requireShebang && (encoding !== 'utf8' || bytesRead < 2 || slice[0] !== 0x23 || slice[1] !== 0x21)) {
          return { status: 'skip' };
        }
      }

      if (encoding === 'utf8') {
        if (slice.includes(0)) return { status: 'binary' };
        for (; i < bytesRead; i += 1) {
          const b = slice[i];
          if (b === 0x0a) {
            if (!prevWasCR) lineBreaks += 1;
            prevWasCR = false;
          } else if (b === 0x0d) {
            lineBreaks += 1;
            prevWasCR = true;
          } else {
            prevWasCR = false;
          }
        }
        lastUnit = slice[bytesRead - 1];
        unitsRead += bytesRead;
      } else {
        const isLE = encoding === 'utf16le';
        for (; i < bytesRead; i += 1) {
          if (!hasPendingByte) {
            pendingByte = slice[i];
            hasPendingByte = true;
            continue;
          }
          const unit = isLE ? (pendingByte | (slice[i] << 8)) : ((pendingByte << 8) | slice[i]);
          hasPendingByte = false;
          if (unit === 0) return { status: 'binary' };
          if (unit === 0x000a) {
            if (!prevWasCR) lineBreaks += 1;
            prevWasCR = false;
          } else if (unit === 0x000d) {
            lineBreaks += 1;
            prevWasCR = true;
          } else {
            prevWasCR = false;
          }
          lastUnit = unit;
          unitsRead += 1;
        }
      }
      totalRead += bytesRead;
    }

    if (hasPendingByte) {
      unitsRead += 1;
      lastUnit = 0xffff;
    }
    const endedWithBreak = lastUnit === 0x000a || lastUnit === 0x000d;
    const lines = unitsRead === 0 ? 0 : lineBreaks + (endedWithBreak ? 0 : 1);
    return { status: 'ok', lines, truncated: totalRead < fileSize };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ELOOP') {
      return { status: 'skip' };
    }
    return { status: 'error', requireShebang };
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // Ignore close errors.
      }
    }
  }
}

function decodeAllowlistBuffer(raw) {
  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    return raw.subarray(2).toString('utf16le');
  }
  if (raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff) {
    const evenLen = raw.length - 2 - ((raw.length - 2) % 2);
    const body = Buffer.from(raw.subarray(2, 2 + evenLen));
    body.swap16();
    return body.toString('utf16le');
  }
  return raw.toString('utf8').replace(/^\uFEFF/, '');
}

function readSafeAllowlistText(rootReal) {
  const filePath = path.join(rootReal, LAYOUT_ALLOW_FILENAME);
  const openFlags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  let fd;
  try {
    if (!existsSync(filePath) || !isWithinRoot(rootReal, filePath)) return null;
    const stat = lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) return null;
    fd = openSync(filePath, openFlags);
    if (!fstatSync(fd).isFile()) return null;
    return decodeAllowlistBuffer(readFileSync(fd));
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // Ignore close errors.
      }
    }
  }
}

function parseAllowlist(rootReal) {
  const text = readSafeAllowlistText(rootReal);
  if (text === null) return { file: null, entries: [] };
  const entries = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    line = line.replace(/\s+#.*$/, '').trim();
    if (!line) continue;

    const rawPattern = line;
    let rule = null;
    const prefixMatch = /^(wide-directory|long-file):(.*)$/.exec(line);
    if (prefixMatch) {
      rule = prefixMatch[1];
      line = prefixMatch[2].trim();
      if (!line) continue;
    }

    let normalized = line.replaceAll('\\', '/').replace(/\/+/g, '/');
    if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) continue;
    const isExactDot = normalized === '.' || normalized === './';
    const dirOnly = isExactDot ? normalized === './' : normalized.endsWith('/');
    while (normalized.startsWith('./') && normalized.length > 2) {
      normalized = normalized.slice(2);
    }
    if (!isExactDot) {
      normalized = normalized.replace(/\/+$/, '');
    } else {
      normalized = '.';
    }
    if (!normalized) continue;

    const segments = normalized === '.' ? ['.'] : normalized.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    if (normalized !== '.' && segments.some((seg) => seg === '..' || seg === '.')) continue;

    entries.push({
      rawPattern,
      rule,
      dirOnly,
      pattern: normalized,
      segments,
    });
  }
  return { file: LAYOUT_ALLOW_FILENAME, entries };
}

function matchGlobSegment(pat, str) {
  let p = 0;
  let s = 0;
  let starIdx = -1;
  let matchIdx = 0;

  while (s < str.length) {
    if (p < pat.length && (pat[p] === '?' || pat[p] === str[s])) {
      p += 1;
      s += 1;
    } else if (p < pat.length && pat[p] === '*') {
      starIdx = p;
      matchIdx = s;
      p += 1;
    } else if (starIdx !== -1) {
      p = starIdx + 1;
      matchIdx += 1;
      s = matchIdx;
    } else {
      return false;
    }
  }
  while (p < pat.length && pat[p] === '*') p += 1;
  return p === pat.length;
}

function matchPathSegments(patSegs, pathSegs) {
  let pi = 0;
  let si = 0;
  let starPi = -1;
  let starSi = 0;

  while (si < pathSegs.length) {
    if (pi < patSegs.length && patSegs[pi] === '**') {
      starPi = pi;
      starSi = si;
      pi += 1;
    } else if (pi < patSegs.length && matchGlobSegment(patSegs[pi], pathSegs[si])) {
      pi += 1;
      si += 1;
    } else if (starPi !== -1) {
      pi = starPi + 1;
      starSi += 1;
      si = starSi;
    } else {
      return false;
    }
  }
  while (pi < patSegs.length && patSegs[pi] === '**') pi += 1;
  return pi === patSegs.length;
}

function matchAllowEntry(entry, rule, relPath) {
  if (entry.rule && entry.rule !== rule) return false;
  if (entry.dirOnly && rule !== 'wide-directory') return false;
  if (relPath === '.') {
    return entry.pattern === '.' || entry.pattern === '**';
  }
  return matchPathSegments(entry.segments, relPath.split('/'));
}

function compareLayoutItems(a, b) {
  if (a.rule !== b.rule) return a.rule === 'wide-directory' ? -1 : 1;
  const metricA = a.rule === 'wide-directory' ? a.count : a.lines;
  const metricB = b.rule === 'wide-directory' ? b.count : b.lines;
  if (metricA !== metricB) return metricB - metricA;
  return a.path.localeCompare(b.path);
}

function checkStructuralLayout(rootReal) {
  const allowlist = parseAllowlist(rootReal);
  const candidates = [];
  const buf = Buffer.allocUnsafe(LAYOUT_LINE_CHUNK_BYTES);
  let scannedDirs = 0;
  let scannedFiles = 0;
  let truncatedDirs = false;
  let truncatedFiles = false;
  let fileCapReached = false;
  const truncationReasons = new Set();

  function walk(dir, depth) {
    if (fileCapReached) return;
    if (depth > LAYOUT_MAX_DEPTH) {
      truncatedDirs = true;
      truncatedFiles = true;
      truncationReasons.add(`max depth ${LAYOUT_MAX_DEPTH}`);
      return;
    }
    if (depth > 0) {
      try {
        const dirStat = lstatSync(dir);
        if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) return;
        const resolvedDir = realpathSync(dir);
        const relDir = path.relative(rootReal, resolvedDir);
        if (relDir !== '' && (path.isAbsolute(relDir) || relDir === '..' || relDir.startsWith(`..${path.sep}`))) {
          return;
        }
      } catch {
        truncatedDirs = true;
        truncatedFiles = true;
        truncationReasons.add('unreadable directory');
        return;
      }
    }
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      truncatedDirs = true;
      truncatedFiles = true;
      truncationReasons.add('unreadable directory');
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    const subdirs = [];
    let dirSourceCount = 0;

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      let isDir = entry.isDirectory();
      let isFile = entry.isFile();
      if (!isDir && !isFile) {
        if (entry.isBlockDevice() || entry.isCharacterDevice() || entry.isFIFO() || entry.isSocket()) {
          continue;
        }
        try {
          const stat = lstatSync(full);
          if (stat.isSymbolicLink()) continue;
          isDir = stat.isDirectory();
          isFile = stat.isFile();
        } catch {
          truncatedDirs = true;
          truncatedFiles = true;
          truncationReasons.add('unreadable entry');
          continue;
        }
      }
      if (isDir) {
        const lower = entry.name.toLowerCase();
        if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(lower) || LAYOUT_EXTRA_SKIP_DIRS.has(lower)) continue;
        let resolvedSubdir;
        try {
          resolvedSubdir = realpathSync(full);
        } catch {
          truncatedDirs = true;
          truncatedFiles = true;
          truncationReasons.add('unreadable directory');
          continue;
        }
        const relSub = path.relative(rootReal, resolvedSubdir);
        if (relSub !== '' && (path.isAbsolute(relSub) || relSub === '..' || relSub.startsWith(`..${path.sep}`))) {
          continue;
        }
        subdirs.push(full);
        continue;
      }
      if (!isFile) continue;
      const lineResult = inspectLayoutSourceFile(full, entry.name, buf);
      if (lineResult.status === 'skip' || lineResult.status === 'binary') continue;
      if (lineResult.status === 'error') {
        truncatedFiles = true;
        if (lineResult.requireShebang) {
          truncatedDirs = true;
          truncationReasons.add('unreadable file');
        } else {
          dirSourceCount += 1;
          truncationReasons.add('unreadable source file');
        }
        continue;
      }
      if (scannedFiles >= LAYOUT_MAX_FILES) {
        fileCapReached = true;
        truncatedDirs = true;
        truncatedFiles = true;
        truncationReasons.add(`max files ${LAYOUT_MAX_FILES.toLocaleString('en-US')}`);
        break;
      }
      scannedFiles += 1;
      dirSourceCount += 1;
      if (lineResult.truncated) {
        truncatedFiles = true;
        truncationReasons.add(`max file size ${Math.round(LAYOUT_MAX_READ_BYTES / (1024 * 1024))}MiB`);
      }
      if (lineResult.lines > LAYOUT_MAX_FILE_LINES) {
        const rel = path.relative(rootReal, full).replaceAll(path.sep, '/');
        candidates.push({
          rule: 'long-file',
          path: rel,
          lines: lineResult.lines,
          threshold: LAYOUT_MAX_FILE_LINES,
          ...(lineResult.truncated ? { truncated: true } : {}),
        });
      }
    }

    if (dirSourceCount > 0) {
      scannedDirs += 1;
      if (dirSourceCount > LAYOUT_MAX_DIR_FILES) {
        const relDir = dir === rootReal ? '.' : path.relative(rootReal, dir).replaceAll(path.sep, '/');
        candidates.push({
          rule: 'wide-directory',
          path: relDir,
          count: dirSourceCount,
          threshold: LAYOUT_MAX_DIR_FILES,
        });
      }
    }

    if (fileCapReached) return;
    for (const subdir of subdirs) {
      if (fileCapReached) break;
      walk(subdir, depth + 1);
    }
  }

  walk(rootReal, 0);

  const findings = [];
  const suppressed = [];
  for (const item of candidates) {
    const matched = allowlist.entries.find((entry) => matchAllowEntry(entry, item.rule, item.path));
    if (matched) {
      suppressed.push({ ...item, matchedPattern: matched.rawPattern });
    } else {
      findings.push(item);
    }
  }
  findings.sort(compareLayoutItems);
  suppressed.sort(compareLayoutItems);

  const truncated = truncatedDirs || truncatedFiles;
  const wideFindings = findings.filter((f) => f.rule === 'wide-directory');
  const longFindings = findings.filter((f) => f.rule === 'long-file');
  const wideSuppressed = suppressed.filter((f) => f.rule === 'wide-directory').length;
  const longSuppressed = suppressed.filter((f) => f.rule === 'long-file').length;
  const truncationReasonText = [...truncationReasons].join(', ');
  const truncNote = truncated ? ` (scan incomplete: ${truncationReasonText})` : '';
  const wideAllowedNote = wideSuppressed > 0 ? ` (${wideSuppressed} allowed via ${LAYOUT_ALLOW_FILENAME})` : '';
  const longAllowedNote = longSuppressed > 0 ? ` (${longSuppressed} allowed via ${LAYOUT_ALLOW_FILENAME})` : '';

  const checks = [
    wideFindings.length === 0 && !truncatedDirs
      ? {
          id: 'layout-dir-sprawl',
          label: 'Directory sprawl',
          status: 'pass',
          detail: `All ${scannedDirs} scanned source dir${scannedDirs === 1 ? '' : 's'} have <= ${LAYOUT_MAX_DIR_FILES} source files${wideAllowedNote}${truncNote}`,
        }
      : wideFindings.length === 0
        ? {
            id: 'layout-dir-sprawl',
            label: 'Directory sprawl',
            status: 'advisory',
            detail: `Layout scan incomplete (${truncationReasonText}); cannot confirm all directories have <= ${LAYOUT_MAX_DIR_FILES} source files${wideAllowedNote}`,
          }
        : {
            id: 'layout-dir-sprawl',
            label: 'Directory sprawl',
            status: 'advisory',
            detail: `${wideFindings.length} director${wideFindings.length === 1 ? 'y exceeds' : 'ies exceed'} ${LAYOUT_MAX_DIR_FILES} source files${wideAllowedNote}; pass --strict-layout to enforce or list in ${LAYOUT_ALLOW_FILENAME}${truncNote}`,
          },
    longFindings.length === 0 && !truncatedFiles
      ? {
          id: 'layout-mega-files',
          label: 'Mega-files',
          status: 'pass',
          detail: `All ${scannedFiles} scanned source file${scannedFiles === 1 ? '' : 's'} are <= ${LAYOUT_MAX_FILE_LINES.toLocaleString('en-US')} lines${longAllowedNote}`,
        }
      : longFindings.length === 0
        ? {
            id: 'layout-mega-files',
            label: 'Mega-files',
            status: 'advisory',
            detail: `Layout scan incomplete (${truncationReasonText}); cannot confirm all files are <= ${LAYOUT_MAX_FILE_LINES.toLocaleString('en-US')} lines${longAllowedNote}`,
          }
        : {
            id: 'layout-mega-files',
            label: 'Mega-files',
            status: 'advisory',
            detail: `${longFindings.length} source file${longFindings.length === 1 ? ' exceeds' : 's exceed'} ${LAYOUT_MAX_FILE_LINES.toLocaleString('en-US')} lines${longAllowedNote}; pass --strict-layout to enforce or list in ${LAYOUT_ALLOW_FILENAME}${truncNote}`,
          },
  ];

  return {
    advisoryOnly: true,
    thresholds: {
      maxFilesPerDir: LAYOUT_MAX_DIR_FILES,
      maxLinesPerFile: LAYOUT_MAX_FILE_LINES,
    },
    scannedDirs,
    scannedFiles,
    truncated,
    allowFile: allowlist.file,
    allowRuleCount: allowlist.entries.length,
    status: findings.length === 0 && !truncated ? 'pass' : 'advisory',
    findings,
    suppressed,
    checks,
  };
}

export function auditRepo(targetPath = '.') {
  const target = path.resolve(targetPath);
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Target path is not an existing directory: ${target}`);
  }
  const rootReal = realpathSync(target);
  const startedAt = performance.now();
  const productCheck = checkProductDoc(rootReal);
  const designCheck = checkDesignDoc(rootReal);
  const checks = [
    productCheck,
    designCheck,
    checkAgentGuide(rootReal),
    checkReadmeRun(rootReal),
    checkVerifyScripts(rootReal),
    checkGitignoreHygiene(rootReal),
    checkSecretGate(rootReal),
    checkHealthzEndpoint(rootReal),
  ];
  const surfaceClass = inspectSurfaceClass(rootReal);
  const layout = checkStructuralLayout(rootReal);
  const elapsedMs = Math.round(performance.now() - startedAt);
  const passed = checks.filter((c) => c.status === 'pass').length;
  const gaps = checks.length - passed;
  return {
    target,
    elapsedMs,
    activeFolio: summarizeActiveFolio(productCheck, designCheck),
    surfaceClass,
    layout,
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
    ...(report.activeFolio ? [`Active Folio: ${report.activeFolio.status} — ${report.activeFolio.advisory}`] : []),
    ...(report.surfaceClass?.detected?.length ? [`Surface class (advisory): ${report.surfaceClass.detected.join(', ')}`] : []),
    '',
  ];
  const labelWidth = Math.max(...report.checks.map((c) => c.label.length));
  for (const check of report.checks) {
    const tag = check.status === 'pass' ? '[PASS]' : '[GAP ]';
    lines.push(`${tag} ${check.label.padEnd(labelWidth)}  ${check.detail}`);
  }
  if (report.surfaceClass?.checks?.length) {
    lines.push('', 'Advisory surface checks (never fail --strict):');
    const advWidth = Math.max(...report.surfaceClass.checks.map((c) => c.label.length));
    for (const check of report.surfaceClass.checks) {
      const tag = check.status === 'pass' ? '[OK  ]' : '[ADV ]';
      lines.push(`${tag} ${check.label.padEnd(advWidth)}  ${check.detail}`);
    }
  }
  if (report.layout?.checks?.length) {
    lines.push('', 'Structural layout (advisory; enforce with --strict-layout):');
    const layoutWidth = Math.max(...report.layout.checks.map((c) => c.label.length));
    for (const check of report.layout.checks) {
      const tag = check.status === 'pass' ? '[OK  ]' : '[ADV ]';
      lines.push(`${tag} ${check.label.padEnd(layoutWidth)}  ${check.detail}`);
      const rule = check.id === 'layout-dir-sprawl' ? 'wide-directory' : 'long-file';
      const ruleFindings = (report.layout.findings ?? []).filter((f) => f.rule === rule);
      for (const item of ruleFindings.slice(0, LAYOUT_TEXT_FINDING_LIMIT)) {
        const metric = item.rule === 'wide-directory'
          ? `${item.count} files > ${item.threshold}`
          : `${item.lines.toLocaleString('en-US')} lines > ${item.threshold.toLocaleString('en-US')}`;
        lines.push(`  - ${item.path} (${metric})`);
      }
      if (ruleFindings.length > LAYOUT_TEXT_FINDING_LIMIT) {
        lines.push(`  ... (+${ruleFindings.length - LAYOUT_TEXT_FINDING_LIMIT} more; use --json for full list)`);
      }
    }
  }
  return lines.join('\n');
}

export function parseArgs(argv) {
  let target = '.';
  let json = false;
  let strict = false;
  let strictLayout = false;
  let help = false;
  let positionalSeen = false;

  for (const arg of argv) {
    if (arg === '--json') json = true;
    else if (arg === '--strict') strict = true;
    else if (arg === '--strict-layout') strictLayout = true;
    else if (arg === '-h' || arg === '--help') help = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown flag: ${arg}`);
    else if (!positionalSeen) {
      target = arg;
      positionalSeen = true;
    } else {
      throw new Error(`Unexpected extra positional argument: ${arg}`);
    }
  }
  return { target, json, strict, strictLayout, help };
}

const USAGE = [
  'Usage: misty-check.mjs [path] [--json] [--strict] [--strict-layout]',
  '',
  'Audit a repository against Spellbook baseline foundations.',
  '  path             Target directory (default: ".")',
  '  --json           Emit machine-readable JSON scorecard',
  '  --strict         Exit with code 1 when any baseline gap is reported',
  '  --strict-layout  Exit with code 1 when unallowed layout sprawl (>15 files/dir, >2,000 LOC/file) or scan truncation is reported',
  '  -h,--help        Show this help text',
  '',
  'Grandfather legacy layout exceptions in a repo-root .misty-check.allow file',
  '(one relative path or glob per line, # comments allowed, optional wide-directory: or long-file: prefix).',
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
    } else {
      const report = auditRepo(opts.target);
      console.log(opts.json ? JSON.stringify(report, null, 2) : formatScorecard(report));
      if ((opts.strict && report.summary.gaps > 0) || (opts.strictLayout && (report.layout.findings.length > 0 || report.layout.truncated))) {
        process.exitCode = 1;
      }
    }
  } catch (error) {
    console.error(`misty-check error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
