import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditRepo, formatScorecard, parseArgs } from './misty-check.mjs';

const SCRIPT = fileURLToPath(new URL('./misty-check.mjs', import.meta.url));
const created = [];

function makeFixture(files = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'misty-check-test-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

after(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
});

test('passes all 8 checks on a repo satisfying every baseline foundation', () => {
  const repo = makeFixture({
    'PRODUCT.md': '# Product\n\nPresent-tense user stories.\n',
    'DESIGN.md': '# Design\n\nTypography and color tokens.\n',
    'AGENTS.md': '# Repo\n\nConcise agent guide.\n',
    'README.md': '# Demo\n\nRun locally:\n\n```sh\nnpm run dev\n```\n',
    'Makefile': 'test:\n\n\tnode --test\n',
    '.gitignore': 'node_modules/\n.env\n.env.*\n!.env.example\n',
    '.githooks/pre-commit': '#!/bin/sh\nexec trufflehog filesystem .\n',
    'src/server.mjs': 'export function route(p) { return p === "/healthz" ? 200 : 404; }\n',
  });

  const report = auditRepo(repo);
  assert.equal(report.summary.passed, 8);
  assert.equal(report.summary.gaps, 0);
  assert.equal(report.summary.score, '8/8');
  assert.ok(report.checks.every((check) => check.status === 'pass'));
  assert.match(formatScorecard(report), /Score: 8\/8 passed · 0 gaps/);
});

test('rejects adversarial false positives across all checks', () => {
  const outside = makeFixture({ 'secret-product.md': '# Outside\n' });
  const repo = makeFixture({
    'SPEC.md': '# Legacy Spec\n',
    'README.md': '# Demo\n\n```sh\n# npm run dev\n```\n\n```json\n{"run": true}\n```\n',
    'Makefile': 'test:\n    node --test\n',
    'go.mod': 'module example.com/demo\n',
    '.gitignore': '.env\n!.en?\n',
    '.gitleaks.toml': 'title = "example"\n',
    '.githooks/pre-commit': '#!/bin/sh\necho "TODO: add trufflehog"\nexec true\n',
    '.githooks/trufflehog-gate.py': 'import subprocess\nUNUSED = "trufflehog"\nsubprocess.run(["true"])\n',
    '.github/workflows/ci.yml': 'name: gitleaks placeholder\non: [workflow_dispatch]\njobs:\n  noop:\n    runs-on: ubuntu-latest\n    steps:\n      - name: check gitleaks\n        run: echo ok\n',
    'src/server.py': 'status = 200  # TODO: add /healthz\n',
    'nginx.conf': 'server {\n  # TODO: add /healthz\n}\n',
  });
  symlinkSync(path.join(outside, 'secret-product.md'), path.join(repo, 'PRODUCT.md'));

  const report = auditRepo(repo);
  const byId = Object.fromEntries(report.checks.map((c) => [c.id, c]));

  assert.equal(report.summary.passed, 0);
  assert.equal(report.summary.gaps, 8);
  assert.equal(byId['product-doc'].status, 'gap');
  assert.match(byId['product-doc'].detail, /legacy SPEC\.md found/);
  assert.equal(byId['local-run'].status, 'gap');
  assert.equal(byId['verify-scripts'].status, 'gap');
  assert.equal(byId['gitignore-hygiene'].status, 'gap');
  assert.equal(byId['secret-gate'].status, 'gap');
  assert.equal(byId['healthz'].status, 'gap');

  for (const content of ['.ENV\n', ' .env\n', '.env\n!.env\n.env.*\n', '.env\n!.en[!x]\n']) {
    const dir = makeFixture({ '.gitignore': content });
    const entry = auditRepo(dir).checks.find((c) => c.id === 'gitignore-hygiene');
    assert.equal(entry.status, 'gap', `expected gap for .gitignore: ${JSON.stringify(content)}`);
  }

  // Quoted workflow run command passes secret-gate.
  const quotedWf = makeFixture({
    '.github/workflows/scan.yml': 'name: scan\non: [workflow_dispatch]\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - run: "gitleaks detect"\n',
  });
  assert.equal(auditRepo(quotedWf).checks.find((c) => c.id === 'secret-gate').status, 'pass');

  // .git/info/exclude alone does not satisfy .gitignore hygiene, and Git-backed negation rules fail cleanly.
  const gitRepo = makeFixture({ '.gitignore': 'node_modules/\n' });
  execFileSync('git', ['init', '-q'], { cwd: gitRepo });
  writeFileSync(path.join(gitRepo, '.git', 'info', 'exclude'), '.env\n');
  assert.equal(auditRepo(gitRepo).checks.find((c) => c.id === 'gitignore-hygiene').status, 'gap');

  for (const content of ['.env\n!.env\n', '.env\n!.en[!x]\n']) {
    const negatedGitRepo = makeFixture({ '.gitignore': content });
    execFileSync('git', ['init', '-q'], { cwd: negatedGitRepo });
    assert.equal(
      auditRepo(negatedGitRepo).checks.find((c) => c.id === 'gitignore-hygiene').status,
      'gap',
      `expected Git-backed gap for .gitignore: ${JSON.stringify(content)}`,
    );
  }

  // Docstring-only and single-line string Python gates do not pass secret-gate (with or without python3),
  // while real calls (including args= keyword and calls between triple-quote comments) DO pass,
  // and python3 -I -S never imports attacker-controlled modules from the audited directory.
  const docstringGate = makeFixture({
    '.githooks/trufflehog-gate.py': '"""Example \\""" subprocess.run(["trufflehog", "filesystem", "."])"""\nMSG = \'subprocess.run(["trufflehog", "filesystem", "."])\'\n',
    'ast.py': 'raise RuntimeError("must never import repo-local ast.py")\n',
  });
  assert.equal(auditRepo(docstringGate).checks.find((c) => c.id === 'secret-gate').status, 'gap');
  const fallbackOut = execFileSync(process.execPath, [SCRIPT, docstringGate, '--json'], {
    cwd: docstringGate,
    env: { PATH: path.dirname(process.execPath) },
    encoding: 'utf8',
  });
  assert.equal(JSON.parse(fallbackOut).checks.find((c) => c.id === 'secret-gate').status, 'gap');

  const kwargGate = makeFixture({
    '.githooks/trufflehog-gate.py': 'import subprocess\n# start """\nsubprocess.run(args=["trufflehog", "filesystem", "."])\n# end """\n',
  });
  assert.equal(auditRepo(kwargGate).checks.find((c) => c.id === 'secret-gate').status, 'pass');
  const kwargFallbackOut = execFileSync(process.execPath, [SCRIPT, kwargGate, '--json'], {
    env: { PATH: path.dirname(process.execPath) },
    encoding: 'utf8',
  });
  assert.equal(JSON.parse(kwargFallbackOut).checks.find((c) => c.id === 'secret-gate').status, 'pass');
});

test('CLI supports --json, --strict exit codes, symlinked invocation, and rejects unknown flags or missing paths', () => {
  const repo = makeFixture({
    'AGENTS.md': '# Guide\n',
  });

  const jsonOut = execFileSync(process.execPath, [SCRIPT, repo, '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(jsonOut);
  assert.equal(parsed.target, repo);
  assert.equal(parsed.summary.passed, 1);
  assert.equal(parsed.summary.gaps, 7);

  const binDir = makeFixture({});
  const linkPath = path.join(binDir, 'misty-check');
  symlinkSync(SCRIPT, linkPath);
  const linkedOut = execFileSync(process.execPath, [linkPath, repo, '--json'], { encoding: 'utf8' });
  assert.equal(JSON.parse(linkedOut).summary.passed, 1);

  let strictExit = 0;
  try {
    execFileSync(process.execPath, [SCRIPT, repo, '--strict'], { stdio: 'pipe' });
  } catch (error) {
    strictExit = error.status;
  }
  assert.equal(strictExit, 1);

  assert.throws(() => parseArgs(['--bogus']), /Unknown flag/);
  assert.throws(() => auditRepo(path.join(repo, 'does-not-exist')), /not an existing directory/);
});

test('Active Folio check is presence-based and accepts arbitrary custom section structures', () => {
  const customFolio = makeFixture({
    'PRODUCT.md': 'Users upload a receipt photo and get categorized expense rows in under two seconds.\nNo rigid template headings required.\n',
    'DESIGN.md': 'Warm paper background, ink text, 8px spacing scale, zero decorative gradients.\n',
  });
  const complete = auditRepo(customFolio);
  assert.equal(complete.checks.find((c) => c.id === 'product-doc').status, 'pass');
  assert.equal(complete.checks.find((c) => c.id === 'design-doc').status, 'pass');
  assert.deepEqual(complete.activeFolio, {
    status: 'complete',
    product: true,
    design: true,
    advisory: 'Active Folio present (PRODUCT.md + DESIGN.md); custom section structures accepted.',
  });
  assert.match(formatScorecard(complete), /Active Folio: complete — Active Folio present/);

  const productOnly = makeFixture({
    'PRODUCT.md': 'Headless CLI tool: exits 0 on valid input and 1 on schema mismatch.\n',
  });
  const partial = auditRepo(productOnly);
  assert.equal(partial.checks.find((c) => c.id === 'product-doc').status, 'pass');
  assert.equal(partial.checks.find((c) => c.id === 'design-doc').status, 'gap');
  assert.equal(partial.activeFolio.status, 'partial');
  assert.equal(partial.activeFolio.product, true);
  assert.equal(partial.activeFolio.design, false);
  assert.match(partial.activeFolio.advisory, /DESIGN\.md/);

  const emptyRepo = makeFixture({});
  const missing = auditRepo(emptyRepo);
  assert.equal(missing.activeFolio.status, 'missing');
  assert.equal(missing.activeFolio.product, false);
  assert.equal(missing.activeFolio.design, false);
  assert.match(formatScorecard(missing), /Active Folio: missing/);
});

test('surface-class advisory detection inspects web apps without rejecting custom layouts, non-web repos, or --strict', () => {
  // Custom nested web directory with unquoted HTML attributes (including / in unquoted href), logo.svg icon link, and valid public JSON manifest passes all web advisories.
  const customWeb = makeFixture({
    'apps/web/index.html': '<!doctype html><html><head><meta name=viewport content="width=device-width, initial-scale=1"><link rel=icon href=/logo.svg><link rel=manifest href=/app-metadata.json></head><body>Hi</body></html>\n',
    'apps/web/public/logo.svg': '<svg></svg>\n',
    'apps/web/public/app-metadata.json': '{"name":"Demo","display":"standalone"}\n',
  });
  const webReport = auditRepo(customWeb);
  assert.deepEqual(webReport.surfaceClass.detected, ['web-app']);
  assert.equal(webReport.surfaceClass.advisoryOnly, true);
  assert.equal(webReport.surfaceClass.checks.length, 3);
  assert.ok(webReport.surfaceClass.checks.every((c) => c.status === 'pass'));
  assert.match(formatScorecard(webReport), /Surface class \(advisory\): web-app/);
  assert.match(formatScorecard(webReport), /Advisory surface checks \(never fail --strict\):/);

  // Deeply nested monorepo Next app (apps/team/client/) detects web-app and stops at its nearest local manifest.json (rejecting extension JSON even when a farther workspace public/ copy is valid).
  const nestedNext = makeFixture({
    'apps/team/client/package.json': JSON.stringify({ name: 'client', dependencies: { next: '^15.0.0' } }),
    'apps/team/client/src/app/layout.tsx': 'export const viewport = { width: "device-width" };\nexport default function Layout() { return <link rel="manifest" href="/app-metadata.json" />; }\n',
    'apps/team/client/public/favicon.ico': 'ico',
    'apps/team/client/public/app-metadata.json': JSON.stringify({ manifest_version: 3, name: 'Ext', version: '1.0' }),
    'public/app-metadata.json': JSON.stringify({ name: 'Workspace PWA', display: 'standalone' }),
  });
  const nestedReport = auditRepo(nestedNext);
  assert.deepEqual(nestedReport.surfaceClass.detected, ['web-app']);
  assert.equal(nestedReport.surfaceClass.checks.find((c) => c.id === 'web-favicon').status, 'pass');
  assert.equal(nestedReport.surfaceClass.checks.find((c) => c.id === 'web-viewport').status, 'pass');
  assert.equal(nestedReport.surfaceClass.checks.find((c) => c.id === 'web-manifest').status, 'advisory');

  // Arbitrary *.webmanifest filename passes manifest check directly, and an inline <script> containing "<!--" before real tags does not eat subsequent head tags.
  const customWebmanifest = makeFixture({
    'index.html': '<!doctype html><html><head><script>const ok = s.startsWith("<!--");</script><meta name=viewport content=width=device-width><link rel=icon href=/logo.svg><!-- trailing --></head><body></body></html>\n',
    'public/pwa.webmanifest': '{"name":"PWA","display":"standalone"}\n',
  });
  assert.ok(auditRepo(customWebmanifest).surfaceClass.checks.every((c) => c.status === 'pass'));

  // Web app rejects HTML comments (including `// note -->`), inline <script> strings, data-* attributes, unquoted Chrome extension manifest links, and NEVER fails --strict.
  const webMissingAdvisories = makeFixture({
    'PRODUCT.md': 'Web app product intent.\n',
    'DESIGN.md': 'Visual tokens.\n',
    'AGENTS.md': 'Guide.\n',
    'README.md': '```sh\nnpm run dev\n```\n',
    'package.json': JSON.stringify({ name: 'demo-web', scripts: { test: 'node --test' }, dependencies: { react: '^19.0.0' } }),
    'extensions/manifest.json': JSON.stringify({ manifest_version: 3, name: 'Ext', version: '1.0' }),
    'index.html': [
      '<!doctype html><html><head>',
      '<!-- <meta name="viewport" content="width=device-width"> // note -->',
      '<meta data-name="viewport" content="width=device-width">',
      '<link data-rel="icon" href="/favicon.ico">',
      '<link rel="manifest" data-href="/pwa.webmanifest">',
      '<link rel=manifest href=extensions/manifest.json>',
      '<meta-preview name=viewport></meta-preview>',
      '<link-preview rel=icon href=/a.ico></link-preview>',
      '<script data-example="> </script>">const fake = \'<meta name=viewport>\';</script>',
      '<style data-example="> </style>">/* <link rel=icon href=/a.ico> */</style>',
      '</head><body></body></html>\n',
    ].join('\n'),
    '.gitignore': '.env\n',
    '.githooks/pre-commit': '#!/bin/sh\nexec trufflehog filesystem .\n',
    'src/server.mjs': 'export const health = "/healthz";\n',
  });
  const missingReport = auditRepo(webMissingAdvisories);
  assert.deepEqual(missingReport.surfaceClass.detected, ['web-app']);
  assert.equal(missingReport.summary.passed, 8);
  assert.equal(missingReport.summary.gaps, 0);
  assert.ok(missingReport.surfaceClass.checks.every((c) => c.status === 'advisory'));
  // --strict exits 0 despite web advisories!
  execFileSync(process.execPath, [SCRIPT, webMissingAdvisories, '--strict'], { stdio: 'pipe' });

  // Non-web CLI repo (even with vite in devDependencies and a test fixture named src-tauri) receives zero web-app or native-desktop classifications.
  const cliRepo = makeFixture({
    'package.json': JSON.stringify({ name: 'demo-cli', bin: { demo: './bin/demo.mjs' }, devDependencies: { vite: '^6.0.0' } }),
    'bin/demo.mjs': '#!/usr/bin/env node\nconsole.log("ok");\n',
    'tests/fixtures/src-tauri/data.txt': 'fixture\n',
  });
  const cliReport = auditRepo(cliRepo);
  assert.deepEqual(cliReport.surfaceClass.detected, ['cli-service']);
  assert.deepEqual(cliReport.surfaceClass.checks, []);
  assert.doesNotMatch(formatScorecard(cliReport), /Web favicon|Web viewport|Web app manifest/);
});

test('layout guard passes at exact thresholds (15 files/dir, 2,000 LOC) and flags sprawl/mega-files cleanly', () => {
  const cleanFiles = {
    'PRODUCT.md': '# Product\n\nIntent.\n',
    'AGENTS.md': '# Guide\n',
  };
  for (let i = 1; i <= 15; i += 1) {
    cleanFiles[`src/mod/file-${String(i).padStart(2, '0')}.ts`] = `export const n${i} = ${i};\n`;
  }
  cleanFiles['src/boundary.ts'] = 'export const x = 1;\n'.repeat(2000);
  const cleanRepo = makeFixture(cleanFiles);

  const cleanReport = auditRepo(cleanRepo);
  assert.equal(cleanReport.layout.status, 'pass');
  assert.equal(cleanReport.layout.advisoryOnly, true);
  assert.deepEqual(cleanReport.layout.thresholds, { maxFilesPerDir: 15, maxLinesPerFile: 2000 });
  assert.deepEqual(cleanReport.layout.findings, []);
  assert.ok(cleanReport.layout.checks.every((c) => c.status === 'pass'));
  assert.match(formatScorecard(cleanReport), /Structural layout \(advisory; enforce with --strict-layout\):/);
  execFileSync(process.execPath, [SCRIPT, cleanRepo, '--strict-layout'], { stdio: 'pipe' });

  // 16 source files in a directory, 2,001-line file (without trailing newline), and >300 KiB mega-file (above 256 KiB MAX_FILE_BYTES).
  const dirtyFiles = {
    'PRODUCT.md': '# Product\n\nIntent.\n',
    'DESIGN.md': '# Design\n\nTokens.\n',
    'AGENTS.md': '# Guide\n',
    'README.md': '```sh\nnpm test\n```\n',
    'package.json': JSON.stringify({ name: 'dirty', scripts: { test: 'node --test' } }),
    '.gitignore': '.env\n',
    '.githooks/pre-commit': '#!/bin/sh\nexec trufflehog filesystem .\n',
    'src/app.mjs': 'export const health = "/healthz";\n',
  };
  for (let i = 1; i <= 16; i += 1) {
    dirtyFiles[`src/sprawl/item-${String(i).padStart(2, '0')}.rs`] = `pub fn f${i}() -> usize { ${i} }\n`;
  }
  dirtyFiles['src/exact-2001.py'] = `${'x = 1\n'.repeat(2000)}x = 2`;
  dirtyFiles['src/huge-over-256kb.mjs'] = `${`export const longVariableNameForSizeTesting = "${'a'.repeat(160)}";\n`.repeat(2005)}`;
  const dirtyRepo = makeFixture(dirtyFiles);

  const dirtyReport = auditRepo(dirtyRepo);
  assert.equal(dirtyReport.summary.score, '8/8');
  assert.equal(dirtyReport.summary.gaps, 0);
  assert.equal(dirtyReport.layout.status, 'advisory');
  assert.equal(dirtyReport.layout.findings.length, 3);
  assert.deepEqual(dirtyReport.layout.findings[0], {
    rule: 'wide-directory',
    path: 'src/sprawl',
    count: 16,
    threshold: 15,
  });
  assert.equal(dirtyReport.layout.findings[1].rule, 'long-file');
  assert.equal(dirtyReport.layout.findings[1].path, 'src/huge-over-256kb.mjs');
  assert.equal(dirtyReport.layout.findings[1].lines, 2005);
  assert.equal(dirtyReport.layout.findings[2].rule, 'long-file');
  assert.equal(dirtyReport.layout.findings[2].path, 'src/exact-2001.py');
  assert.equal(dirtyReport.layout.findings[2].lines, 2001);

  const scorecard = formatScorecard(dirtyReport);
  assert.match(scorecard, /\[ADV \] Directory sprawl/);
  assert.match(scorecard, /- src\/sprawl \(16 files > 15\)/);
  assert.match(scorecard, /\[ADV \] Mega-files/);
  assert.match(scorecard, /- src\/huge-over-256kb\.mjs \(2,005 lines > 2,000\)/);
  assert.match(scorecard, /- src\/exact-2001\.py \(2,001 lines > 2,000\)/);

  // Non-breaking rollout: --strict passes 8/8 despite advisory layout findings, while --strict-layout fails with exit 1.
  execFileSync(process.execPath, [SCRIPT, dirtyRepo, '--strict'], { stdio: 'pipe' });

  let strictLayoutExit = 0;
  let strictLayoutJson = '';
  try {
    execFileSync(process.execPath, [SCRIPT, dirtyRepo, '--json', '--strict-layout'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    strictLayoutExit = error.status;
    strictLayoutJson = error.stdout;
  }
  assert.equal(strictLayoutExit, 1);
  assert.equal(JSON.parse(strictLayoutJson).layout.findings.length, 3);
});

test('.misty-check.allow suppresses only listed entries (respecting dir-only, globs, comments, and rule prefixes)', () => {
  const files = {
    '.misty-check.allow': `\uFEFF# Grandfathered structural debt\r\n\r\nsrc/allowed-dir/   # legacy bucket\r\nwide-directory: src/prefix-only\r\nlong-file: src/legacy-*.ts # monolithic parser\r\nsrc/glob-dir/**\r\n`,
  };
  for (let i = 1; i <= 16; i += 1) {
    files[`src/allowed-dir/m${i}.ts`] = `export const a = ${i};\n`;
    files[`src/prefix-only/p${i}.ts`] = `export const p = ${i};\n`;
    files[`src/glob-dir/g${i}.ts`] = `export const g = ${i};\n`;
    files[`src/unlisted-dir/u${i}.ts`] = `export const u = ${i};\n`;
  }
  // Mega-file inside src/allowed-dir/ must NOT be suppressed by trailing-slash dir entry `src/allowed-dir/`.
  files['src/allowed-dir/mega-unlisted.ts'] = 'export const x = 1;\n'.repeat(2005);
  // Mega-file matching prefix-only dir path as wide-directory: rule must NOT be suppressed.
  files['src/prefix-only/unallowed-mega.ts'] = 'export const y = 1;\n'.repeat(2002);
  files['src/legacy-parser.ts'] = 'export const z = 1;\n'.repeat(2050);
  files['src/glob-dir/nested/deep-mega.ts'] = 'export const d = 1;\n'.repeat(2010);
  files['src/unlisted-mega.ts'] = 'export const w = 1;\n'.repeat(2001);

  const repo = makeFixture(files);
  const report = auditRepo(repo);

  assert.equal(report.layout.allowFile, '.misty-check.allow');
  assert.equal(report.layout.allowRuleCount, 4);
  assert.equal(report.layout.status, 'advisory');

  assert.deepEqual(
    report.layout.suppressed.map((item) => [item.rule, item.path, item.matchedPattern]),
    [
      ['wide-directory', 'src/allowed-dir', 'src/allowed-dir/'],
      ['wide-directory', 'src/prefix-only', 'wide-directory: src/prefix-only'],
      ['wide-directory', 'src/glob-dir', 'src/glob-dir/**'],
      ['long-file', 'src/legacy-parser.ts', 'long-file: src/legacy-*.ts'],
      ['long-file', 'src/glob-dir/nested/deep-mega.ts', 'src/glob-dir/**'],
    ],
  );
  assert.deepEqual(
    report.layout.findings.map((item) => [item.rule, item.path]),
    [
      ['wide-directory', 'src/unlisted-dir'],
      ['long-file', 'src/allowed-dir/mega-unlisted.ts'],
      ['long-file', 'src/prefix-only/unallowed-mega.ts'],
      ['long-file', 'src/unlisted-mega.ts'],
    ],
  );

  // Allowing every remaining entry passes --strict-layout cleanly, even when core baseline checks fail.
  writeFileSync(
    path.join(repo, '.misty-check.allow'),
    [
      'src/allowed-dir/**',
      'src/prefix-only/**',
      'src/glob-dir/**',
      'src/unlisted-dir',
      'src/legacy-parser.ts',
      'src/unlisted-mega.ts',
    ].join('\n'),
  );
  const cleanReport = auditRepo(repo);
  assert.equal(cleanReport.layout.status, 'pass');
  assert.deepEqual(cleanReport.layout.findings, []);
  assert.equal(cleanReport.summary.gaps, 8);
  execFileSync(process.execPath, [SCRIPT, repo, '--strict-layout'], { stdio: 'pipe' });

  let bothStrictExit = 0;
  try {
    execFileSync(process.execPath, [SCRIPT, repo, '--strict', '--strict-layout'], { stdio: 'pipe' });
  } catch (error) {
    bothStrictExit = error.status;
  }
  assert.equal(bothStrictExit, 1);
});

test('layout guard ignores vendor/build/docs/non-source files and blocks symlink escapes', () => {
  const outside = makeFixture({
    'outside-mega.ts': 'export const o = 1;\n'.repeat(2500),
    'outside.allow': 'src/real-sprawl\nsrc/real-mega.ts\n',
  });
  for (let i = 1; i <= 20; i += 1) {
    writeFileSync(path.join(outside, `outside-${i}.ts`), `export const o${i} = ${i};\n`);
  }

  const files = {};
  for (const dir of ['node_modules/pkg', 'target/debug', 'dist/assets', 'build/out', '.next/cache', 'vendor/lib', '__pycache__', 'evidence/run1', 'docs/adr', 'fixtures/sample', '__snapshots__/snap']) {
    for (let i = 1; i <= 20; i += 1) {
      files[`${dir}/f${i}.ts`] = 'export const x = 1;\n'.repeat(i === 1 ? 2200 : 1);
    }
  }
  for (let i = 1; i <= 20; i += 1) {
    files[`data/item-${i}.json`] = '{"ok": true}\n'.repeat(i === 1 ? 2500 : 1);
    files[`notes/doc-${i}.md`] = '# Heading\n'.repeat(i === 1 ? 2500 : 1);
    files[`src/gen-${i}.d.ts`] = 'export declare const x: number;\n'.repeat(i === 1 ? 2500 : 1);
    files[`src/bundle-${i}.min.js`] = 'var a=1;\n'.repeat(i === 1 ? 2500 : 1);
  }
  // NUL-byte binary file masquerading as .js should be skipped safely.
  files['src/binary.js'] = Buffer.concat([Buffer.from('const x = 1;\n'.repeat(2100)), Buffer.from([0])]);
  // Put NUL byte in the first 8 KiB header so binary detection catches it deterministically.
  files['src/binary-header.js'] = Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from('\n'.repeat(2500))]);

  const repo = makeFixture(files);
  symlinkSync(outside, path.join(repo, 'src/linked-dir'));
  symlinkSync(path.join(outside, 'outside-mega.ts'), path.join(repo, 'src/linked-mega.ts'));
  symlinkSync(path.join(outside, 'outside.allow'), path.join(repo, '.misty-check.allow'));

  const cleanCheck = auditRepo(repo);
  assert.equal(cleanCheck.layout.status, 'pass');
  assert.equal(cleanCheck.layout.allowFile, null);
  assert.deepEqual(cleanCheck.layout.findings, []);

  // Verify symlinked .misty-check.allow escaping root NEVER suppresses real inside-repo violations.
  for (let i = 1; i <= 16; i += 1) {
    const p = path.join(repo, `src/real-sprawl/s${i}.ts`);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `export const s = ${i};\n`);
  }
  writeFileSync(path.join(repo, 'src/real-mega.ts'), 'export const r = 1;\n'.repeat(2005));

  const escapeReport = auditRepo(repo);
  assert.equal(escapeReport.layout.allowFile, null);
  assert.deepEqual(
    escapeReport.layout.findings.map((f) => [f.rule, f.path]),
    [
      ['wide-directory', 'src/real-sprawl'],
      ['long-file', 'src/real-mega.ts'],
    ],
  );
});

test('layout guard fails closed on truncation, rejects absolute allowlist paths, and scans deep/large/polyglot source files', () => {
  const overLimit = 'x = 1\n'.repeat(2001);

  // 1. Deeply nested source file at depth 17 is scanned and fails --strict-layout.
  const nestedPath = `${'a/'.repeat(17)}long.py`;
  const deepRepo = makeFixture({ [nestedPath]: overLimit });
  const deepOut = execStrictLayoutFailure(deepRepo);
  assert.equal(deepOut.layout.truncated, false);
  assert.deepEqual(deepOut.layout.findings.map((f) => f.path), [nestedPath]);

  // 2. Depth > 64 triggers incomplete scan fail-closed behavior under --strict-layout (while leaving --strict unaffected).
  const overDepthRepo = makeFixture({
    'PRODUCT.md': '# Product\n\nIntent.\n',
    'DESIGN.md': '# Design\n\nTokens.\n',
    'AGENTS.md': '# Guide\n',
    'README.md': '```sh\nnpm test\n```\n',
    'package.json': JSON.stringify({ name: 'deep', scripts: { test: 'node --test' } }),
    '.gitignore': '.env\n',
    '.githooks/pre-commit': '#!/bin/sh\nexec trufflehog filesystem .\n',
    'src/app.mjs': 'export const health = "/healthz";\n',
    [`${'d/'.repeat(65)}long.py`]: overLimit,
  });
  execFileSync(process.execPath, [SCRIPT, overDepthRepo, '--strict'], { stdio: 'pipe' });
  const overDepthOut = execStrictLayoutFailure(overDepthRepo);
  assert.equal(overDepthOut.layout.truncated, true);
  assert.equal(overDepthOut.layout.status, 'advisory');
  assert.ok(overDepthOut.layout.checks.every((c) => c.status === 'advisory'));

  // 3. >16 MiB first line followed by 2,001 lines is scanned up to 64 MiB and fails --strict-layout.
  const hugeHeaderRepo = makeFixture({
    'long.py': `#${'x'.repeat(16 * 1024 * 1024)}\n${overLimit}`,
  });
  const hugeHeaderOut = execStrictLayoutFailure(hugeHeaderRepo);
  assert.equal(hugeHeaderOut.layout.truncated, false);
  assert.equal(hugeHeaderOut.layout.findings[0].path, 'long.py');
  assert.equal(hugeHeaderOut.layout.findings[0].lines, 2002);

  // 4. Absolute paths and drive-letter paths in .misty-check.allow are ignored; `*` does not silence `.`.
  const absFiles = {
    '.misty-check.allow': [
      'long-file: /src/long.py',
      '/src/sprawl',
      'C:\\src\\long.py',
      '*',
    ].join('\n'),
    'src/long.py': overLimit,
  };
  for (let i = 1; i <= 16; i += 1) {
    absFiles[`root-${i}.py`] = 'x = 1\n';
    absFiles[`src/sprawl/f${i}.py`] = 'x = 1\n';
  }
  const absRepo = makeFixture(absFiles);
  const absOut = execStrictLayoutFailure(absRepo);
  assert.equal(absOut.layout.allowRuleCount, 1);
  assert.deepEqual(
    absOut.layout.findings.map((f) => [f.rule, f.path]),
    [
      ['wide-directory', '.'],
      ['wide-directory', 'src/sprawl'],
      ['long-file', 'src/long.py'],
    ],
  );

  // 5. Polyglot source extensions (e.g. .R) and artifacts/ source dirs are scanned.
  const rFiles = {
    'R/long.R': 'x <- 1\n'.repeat(2001),
    'artifacts/mod.go': 'package artifacts\n'.repeat(2001),
  };
  for (let i = 1; i <= 15; i += 1) {
    rFiles[`R/f${i}.R`] = 'x <- 1\n';
  }
  const rRepo = makeFixture(rFiles);
  const rOut = execStrictLayoutFailure(rRepo);
  assert.deepEqual(
    rOut.layout.findings.map((f) => [f.rule, f.path]),
    [
      ['wide-directory', 'R'],
      ['long-file', 'artifacts/mod.go'],
      ['long-file', 'R/long.R'],
    ],
  );
});

function modeBitsAreEnforced() {
  const probe = path.join(makeFixture({ 'probe.txt': 'x\n' }), 'probe.txt');
  chmodSync(probe, 0o000);
  try {
    readFileSync(probe);
    return false;
  } catch {
    return true;
  } finally {
    chmodSync(probe, 0o600);
  }
}

function execStrictLayoutFailure(repo) {
  let status = 0;
  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, [SCRIPT, repo, '--json', '--strict-layout'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    status = error.status;
    stdout = error.stdout;
  }
  assert.equal(status, 1, `expected --strict-layout to exit 1 for ${repo}, got ${status}`);
  return JSON.parse(stdout);
}

test('layout guard fails closed on unreadable files/dirs and 64 MiB allowlisted caps, and classifies SQL and shebang scripts', () => {
  const overLimit = 'x = 1\n'.repeat(2001);

  // 1. Unreadable directory or unreadable source file fails closed under --strict-layout
  //    (skip when mode bits are not enforced: root, or a sandbox holding CAP_DAC_READ_SEARCH).
  if (modeBitsAreEnforced()) {
    const permDirRepo = makeFixture({ 'private/long.py': overLimit });
    const privateDir = path.join(permDirRepo, 'private');
    chmodSync(privateDir, 0o000);
    try {
      const permDirOut = execStrictLayoutFailure(permDirRepo);
      assert.equal(permDirOut.layout.truncated, true);
      assert.equal(permDirOut.layout.status, 'advisory');
    } finally {
      chmodSync(privateDir, 0o700);
    }

    const permFileRepo = makeFixture({ 'private/long.py': overLimit });
    const privateFile = path.join(permFileRepo, 'private/long.py');
    chmodSync(privateFile, 0o000);
    try {
      const permFileOut = execStrictLayoutFailure(permFileRepo);
      assert.equal(permFileOut.layout.truncated, true);
      assert.equal(permFileOut.layout.status, 'advisory');
    } finally {
      chmodSync(privateFile, 0o600);
    }

    const execOnlyBlockedRepo = makeFixture({ 'restricted/nested/long.py': overLimit });
    const restrictedDir = path.join(execOnlyBlockedRepo, 'restricted');
    chmodSync(restrictedDir, 0o400);
    try {
      const restrictedOut = execStrictLayoutFailure(execOnlyBlockedRepo);
      assert.equal(restrictedOut.layout.truncated, true);
      assert.equal(restrictedOut.layout.status, 'advisory');
    } finally {
      chmodSync(restrictedDir, 0o700);
    }
    const restoredOut = execStrictLayoutFailure(execOnlyBlockedRepo);
    assert.equal(restoredOut.layout.truncated, false);
    assert.deepEqual(
      restoredOut.layout.findings.map((f) => [f.rule, f.path, f.lines]),
      [['long-file', 'restricted/nested/long.py', 2001]],
    );
  }

  // 2. Allowlisted >64 MiB file with >2,000 lines before the cutoff still marks truncated=true and fails closed under --strict-layout.
  const hugeAllowRepo = makeFixture({
    '.misty-check.allow': 'long-file: long.py\n',
    'long.py': `${overLimit}#${'x'.repeat(64 * 1024 * 1024)}\n${'y = 1\n'.repeat(100)}`,
  });
  const hugeAllowOut = execStrictLayoutFailure(hugeAllowRepo);
  assert.equal(hugeAllowOut.layout.truncated, true);
  assert.equal(hugeAllowOut.layout.status, 'advisory');
  assert.equal(hugeAllowOut.layout.findings.length, 0);
  assert.equal(hugeAllowOut.layout.suppressed.length, 1);
  assert.equal(hugeAllowOut.layout.suppressed[0].truncated, true);

  // 3. .sql migrations and extensionless #! scripts are scanned, while extensionless non-shebang files (e.g. LICENSE) are ignored.
  const sqlAndShebang = {
    'LICENSE': 'MIT License\n'.repeat(2500),
    'scripts/check': `#!/bin/sh\n${'echo ok\n'.repeat(2001)}`,
    'migrations/0001.sql': 'SELECT 1;\n'.repeat(2001),
  };
  for (let i = 2; i <= 16; i += 1) {
    sqlAndShebang[`migrations/${String(i).padStart(4, '0')}.sql`] = `SELECT ${i};\n`;
  }
  const polyRepo = makeFixture(sqlAndShebang);
  const polyOut = execStrictLayoutFailure(polyRepo);
  assert.deepEqual(
    polyOut.layout.findings.map((f) => [f.rule, f.path]),
    [
      ['wide-directory', 'migrations'],
      ['long-file', 'scripts/check'],
      ['long-file', 'migrations/0001.sql'],
    ],
  );
});

test('layout guard handles CR line endings, chunk-split CRLF, authored CSS, and sibling walks after depth cap', () => {
  // 1. CR-only line endings (classic Python / Mac CR files) are counted and fail --strict-layout.
  const crRepo = makeFixture({ 'legacy.py': 'x = 1\r'.repeat(2001) });
  const crOut = execStrictLayoutFailure(crRepo);
  assert.deepEqual(
    crOut.layout.findings.map((f) => [f.rule, f.path, f.lines]),
    [['long-file', 'legacy.py', 2001]],
  );

  // 2. CRLF split across the 64 KiB read chunk boundary does not double-count.
  const crlfSplitRepo = makeFixture({
    'boundary.py': `${'a'.repeat(65535)}\r\n${'x = 1\n'.repeat(1999)}`,
  });
  const crlfSplitOut = auditRepo(crlfSplitRepo);
  assert.equal(crlfSplitOut.layout.status, 'pass');
  assert.deepEqual(crlfSplitOut.layout.findings, []);

  // 3. Authored CSS stylesheets are scanned while minified CSS is skipped.
  const cssRepo = makeFixture({
    'program.css': '.rule { color: red; }\n'.repeat(2001),
    'vendor.min.css': '.min{color:red}\n'.repeat(2500),
  });
  const cssOut = execStrictLayoutFailure(cssRepo);
  assert.deepEqual(
    cssOut.layout.findings.map((f) => [f.rule, f.path, f.lines]),
    [['long-file', 'program.css', 2001]],
  );

  // 4. Hitting max depth in branch a/ marks truncated=true without halting eligible sibling z/.
  const siblingRepo = makeFixture({
    [`${'a/'.repeat(65)}deep.py`]: 'x = 1\n'.repeat(2001),
    'z/long.py': 'x = 1\n'.repeat(2001),
  });
  const siblingOut = execStrictLayoutFailure(siblingRepo);
  assert.equal(siblingOut.layout.truncated, true);
  assert.deepEqual(
    siblingOut.layout.findings.map((f) => [f.rule, f.path, f.lines]),
    [['long-file', 'z/long.py', 2001]],
  );
});

test('CLI flushes complete --json output before exiting 1 on large strict-layout reports', () => {
  const files = {};
  const longPy = 'pass\n'.repeat(2001);
  for (let i = 0; i < 1500; i += 1) {
    files[`mod/f${i}.py`] = longPy;
  }
  const largeRepo = makeFixture(files);

  const proc = spawnSync(process.execPath, [SCRIPT, largeRepo, '--json', '--strict-layout'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  assert.equal(proc.status, 1);
  assert.ok(Buffer.byteLength(proc.stdout) > 150_000, 'expected large JSON stdout payload (>150 KiB)');
  const parsed = JSON.parse(proc.stdout);
  assert.equal(parsed.layout.findings.length, 1501);
});

test('layout guard supports UTF-16LE and UTF-16BE BOM source files and allowlists while skipping UTF-16 binary NUL units', () => {
  // 1. UTF-16LE with BOM PowerShell script (Windows PowerShell 5.1 default) triggers long-file under --strict-layout.
  const utf16LeRepo = makeFixture({});
  writeFileSync(
    path.join(utf16LeRepo, 'maintenance.ps1'),
    `\uFEFF${'Write-Output "ok"\r\n'.repeat(2001)}`,
    'utf16le',
  );
  // BOM-only empty UTF-16LE file has 0 lines; UTF-16LE containing U+0000 code unit is treated as binary.
  writeFileSync(path.join(utf16LeRepo, 'empty.ps1'), '\uFEFF', 'utf16le');
  writeFileSync(
    path.join(utf16LeRepo, 'binary-utf16.ps1'),
    `\uFEFF${'Write-Output "ok"\r\n'.repeat(2005)}\u0000`,
    'utf16le',
  );
  const leOut = execStrictLayoutFailure(utf16LeRepo);
  assert.equal(leOut.layout.scannedFiles, 2);
  assert.deepEqual(
    leOut.layout.findings.map((f) => [f.rule, f.path, f.lines]),
    [['long-file', 'maintenance.ps1', 2001]],
  );

  // 2. UTF-16LE BOM .misty-check.allow suppresses maintenance.ps1 cleanly and passes --strict-layout.
  writeFileSync(path.join(utf16LeRepo, '.misty-check.allow'), '\uFEFFlong-file: maintenance.ps1\r\n', 'utf16le');
  const leAllowedProc = spawnSync(process.execPath, [SCRIPT, utf16LeRepo, '--json', '--strict-layout'], { encoding: 'utf8' });
  assert.equal(leAllowedProc.status, 0);
  const leAllowed = JSON.parse(leAllowedProc.stdout);
  assert.equal(leAllowed.layout.status, 'pass');
  assert.equal(leAllowed.layout.suppressed.length, 1);

  // 3. UTF-16BE with BOM source file counts lines accurately and fails --strict-layout.
  const utf16BeRepo = makeFixture({});
  const beBuf = Buffer.from(`\uFEFF${'Write-Output "ok"\n'.repeat(2001)}`, 'utf16le');
  beBuf.swap16();
  writeFileSync(path.join(utf16BeRepo, 'be-script.ps1'), beBuf);
  const beOut = execStrictLayoutFailure(utf16BeRepo);
  assert.deepEqual(
    beOut.layout.findings.map((f) => [f.rule, f.path, f.lines]),
    [['long-file', 'be-script.ps1', 2001]],
  );
});

const OBSERVABLE_WORKER = {
  // Zero-SDK same-origin beacon: the browser posts to its own origin, the Worker relays to the error sink.
  'wrangler.jsonc': '{\n  // Workers Logs capture every structured line.\n  "name": "demo",\n  "main": "./src/worker.mjs",\n  "observability": { "enabled": true, },\n}\n',
  'src/worker.mjs': [
    "const revision = 'abc1234';",
    'export default {',
    '  async fetch(request, env) {',
    '    const { pathname } = new URL(request.url);',
    "    if (pathname === '/healthz') return Response.json({ ok: true, revision });",
    "    if (pathname === '/api/client-error') { console.error(JSON.stringify({ event: 'client_error', release: revision, report: await request.json() })); return new Response(null, { status: 204 }); }",
    '    return env.ASSETS.fetch(request);',
    '  },',
    '};',
    '',
  ].join('\n'),
  'public/index.html': '<!doctype html>\n<html><head><meta name="viewport" content="width=device-width"><script src="/error-beacon.js"></script></head><body></body></html>\n',
  'public/error-beacon.js': [
    "const report = (kind, detail) => navigator.sendBeacon('/api/client-error', JSON.stringify({ kind, path: location.pathname, ...detail }));",
    "addEventListener('error', (event) => report('error', { message: event.message }));",
    "addEventListener('unhandledrejection', (event) => report('unhandledrejection', { message: String(event.reason) }));",
    "document.addEventListener('securitypolicyviolation', (event) => report('securitypolicyviolation', { directive: event.effectiveDirective }));",
    '',
  ].join('\n'),
};

function runCli(args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function observabilityById(report) {
  return Object.fromEntries(report.observability.checks.map((c) => [c.rule, c]));
}

test('observability audit passes Worker, service, and web repos that report health, telemetry, and client errors', () => {
  const worker = makeFixture(OBSERVABLE_WORKER);
  const report = auditRepo(worker);
  assert.deepEqual(report.observability.surfaces, ['web-app', 'worker']);
  assert.equal(report.observability.status, 'pass');
  assert.equal(report.observability.advisoryOnly, true);
  assert.deepEqual(report.observability.findings, []);
  assert.deepEqual(report.observability.checks.map((c) => [c.id, c.status]), [
    ['observability-health', 'pass'],
    ['observability-config', 'pass'],
    ['observability-client-errors', 'pass'],
  ]);
  const byRule = observabilityById(report);
  assert.deepEqual(byRule.health.evidence, ['src/worker.mjs']);
  assert.deepEqual(byRule.config.evidence, ['wrangler.jsonc']);
  assert.deepEqual(byRule['client-errors'].evidence, ['public/error-beacon.js']);
  const text = formatScorecard(report);
  assert.match(text, /Observability & auto-triage \(web-app, worker; advisory, enforce with --strict-observability\):/);
  assert.match(text, /\[OK {2}\] Client error \+ CSP capture {2}Browser errors and CSP violations are forwarded from public\/error-beacon\.js/);
  assert.equal(runCli([worker, '--strict-observability']).status, 0);

  // wrangler.toml tables, per-environment config, and log forwarding all count as production telemetry.
  for (const toml of [
    'name = "demo"\n\n[observability]\nenabled = true\n',
    'name = "demo"\n[env.production.observability.logs]\nenabled = true # production only\n',
    'name = "demo"\nobservability = { enabled = true }\n',
    'name = "demo"\nlogpush = true\n',
    'name = "demo"\n[[tail_consumers]]\nservice = "log-drain"\n',
  ]) {
    const { 'wrangler.jsonc': _unused, ...rest } = OBSERVABLE_WORKER;
    const tomlReport = auditRepo(makeFixture({ ...rest, 'wrangler.toml': toml }));
    assert.equal(observabilityById(tomlReport).config.status, 'pass', `expected telemetry pass for wrangler.toml: ${JSON.stringify(toml)}`);
  }

  // Node service: file-based /api/health route with release identity, plus server-side Sentry DSN wiring.
  const service = makeFixture({
    'package.json': '{"name":"api","dependencies":{"express":"5.0.0","@sentry/node":"9.0.0"}}\n',
    'src/routes/api/health.ts': 'export const GET = () => Response.json({ status: "ok", commit: process.env.GIT_SHA, uptime: process.uptime() });\n',
    'src/server.ts': 'import * as Sentry from "@sentry/node";\nSentry.init({ dsn: process.env.SENTRY_DSN, release: process.env.GIT_SHA });\n',
  });
  const serviceReport = auditRepo(service);
  assert.deepEqual(serviceReport.observability.surfaces, ['service']);
  assert.deepEqual(serviceReport.observability.surfaceEvidence.service, ['package.json']);
  assert.equal(serviceReport.observability.status, 'pass');
  assert.deepEqual(serviceReport.observability.checks.map((c) => c.rule), ['health', 'config']);

  // Web app using a Sentry client SDK satisfies client capture and telemetry without a hand-rolled beacon.
  const sentryWeb = makeFixture({
    'package.json': '{"name":"web","dependencies":{"next":"16.0.0","react":"19.0.0","@sentry/nextjs":"9.0.0"}}\n',
    'app/api/health/route.ts': 'export const GET = () => Response.json({ ok: true, version: process.env.VERCEL_GIT_COMMIT_SHA });\n',
  });
  const sentryReport = auditRepo(sentryWeb);
  assert.deepEqual(sentryReport.observability.surfaces, ['web-app']);
  assert.equal(sentryReport.observability.status, 'pass');
  assert.match(observabilityById(sentryReport)['client-errors'].detail, /Sentry client SDK in package\.json/);

  // A CSP report-uri/report-to directive is CSP capture when paired with a forwarded error listener.
  const reportUri = makeFixture({
    ...OBSERVABLE_WORKER,
    'public/error-beacon.js': "addEventListener('unhandledrejection', (event) => fetch('/api/client-error', { method: 'POST', body: String(event.reason) }));\n",
    'public/_headers': "/*\n  Content-Security-Policy: default-src 'self'; report-uri /api/csp-report\n",
  });
  assert.equal(observabilityById(auditRepo(reportUri))['client-errors'].status, 'pass');
});

test('observability audit reports actionable gaps for missing CSP/error capture, telemetry, and stub or absent health routes', () => {
  // Worker + UI whose only listeners are commented out or log to the console instead of forwarding.
  const silent = makeFixture({
    ...OBSERVABLE_WORKER,
    'wrangler.jsonc': '{\n  "name": "demo",\n  // "observability": { "enabled": true }\n  "main": "./src/worker.mjs"\n}\n',
    'public/error-beacon.js': [
      "// addEventListener('unhandledrejection', (event) => navigator.sendBeacon('/api/client-error', String(event.reason)));",
      "document.addEventListener('securitypolicyviolation', (event) => console.warn(event.blockedURI));",
      '',
    ].join('\n'),
  });
  const silentReport = auditRepo(silent);
  const silentRules = observabilityById(silentReport);
  assert.equal(silentReport.observability.status, 'advisory');
  assert.deepEqual(silentReport.observability.findings.map((f) => f.rule), ['config', 'client-errors']);
  assert.equal(silentRules.health.status, 'pass');
  assert.match(silentRules.config.detail, /wrangler\.jsonc does not enable Workers observability/);
  assert.match(silentRules.config.fix, /"observability": \{ "enabled": true \}/);
  assert.match(silentRules['client-errors'].detail, /Missing forwarded securitypolicyviolation \(CSP\) capture and unhandledrejection\/error capture; public\/error-beacon\.js listens but never forwards/);
  assert.match(silentRules['client-errors'].fix, /same-origin beacon/);
  const silentText = formatScorecard(silentReport);
  assert.match(silentText, /\[ADV \] Production telemetry/);
  assert.match(silentText, /\n {2}fix: Forward securitypolicyviolation, unhandledrejection, and error events/);

  // A handler must forward its own event: an unrelated fetch elsewhere in the file, or a same-file
  // helper that only logs, is not capture. Helpers that reach sendBeacon and imported reporters are.
  const handlerCases = [
    ["const tides = await fetch('/api/tides');\ndocument.addEventListener('securitypolicyviolation', (event) => console.warn(event.blockedURI));\naddEventListener('unhandledrejection', (event) => console.warn(event.reason));\n", 'advisory'],
    ["const report = (kind, detail) => console.log(kind, detail);\ndocument.addEventListener('securitypolicyviolation', (event) => report('csp', event));\naddEventListener('error', (event) => report('error', event));\nfetch('/api/tides');\n", 'advisory'],
    ["function send(payload) {\n  navigator.sendBeacon('/api/client-error', JSON.stringify(payload));\n}\nfunction note(kind, event) {\n  send({ kind, message: String(event.reason ?? event.message) });\n}\nfunction onCsp(event) { note('csp', event); }\ndocument.addEventListener('securitypolicyviolation', onCsp);\nwindow.onunhandledrejection = (event) => note('rejection', event);\n", 'pass'],
    ["import { reportClientError } from './telemetry.js';\ndocument.addEventListener('securitypolicyviolation', (event) => reportClientError('csp', event));\naddEventListener('unhandledrejection', (event) => reportClientError('rejection', event));\n", 'pass'],
  ];
  for (const [beacon, expected] of handlerCases) {
    const rule = observabilityById(auditRepo(makeFixture({ ...OBSERVABLE_WORKER, 'public/error-beacon.js': beacon })))['client-errors'];
    assert.equal(rule.status, expected, `expected ${expected} for beacon: ${JSON.stringify(beacon)}`);
  }

  // An element-level error listener (image fallback) is not page-level error capture.
  const elementOnly = makeFixture({
    ...OBSERVABLE_WORKER,
    'public/error-beacon.js': "img.addEventListener('error', () => fetch('/fallback.png'));\ndocument.addEventListener('securitypolicyviolation', (event) => navigator.sendBeacon('/api/client-error', event.blockedURI));\n",
  });
  assert.match(observabilityById(auditRepo(elementOnly))['client-errors'].detail, /^Missing forwarded unhandledrejection\/error capture$/);

  // Errors captured but CSP violations are not: the finding names exactly what is missing.
  const noCsp = makeFixture({
    ...OBSERVABLE_WORKER,
    'public/error-beacon.js': "window.onerror = (message) => navigator.sendBeacon('/api/client-error', String(message));\n",
  });
  const noCspRule = observabilityById(auditRepo(noCsp))['client-errors'];
  assert.equal(noCspRule.status, 'advisory');
  assert.match(noCspRule.detail, /^Missing forwarded securitypolicyviolation \(CSP\) capture$/);

  // Hardcoded stub health route and explicitly disabled or zero-sampled telemetry.
  for (const wrangler of ['{ "observability": { "enabled": false } }', '{ "observability": { "enabled": true, "head_sampling_rate": 0 } }']) {
    const stub = makeFixture({
      ...OBSERVABLE_WORKER,
      'wrangler.jsonc': wrangler,
      'src/worker.mjs': "export default { fetch(request) { return new URL(request.url).pathname === '/healthz' ? new Response('ok') : new Response('hi'); } };\n",
    });
    const stubRules = observabilityById(auditRepo(stub));
    assert.equal(stubRules.health.status, 'advisory');
    assert.match(stubRules.health.detail, /src\/worker\.mjs returns no release or runtime identity \(looks like a hardcoded stub\)/);
    assert.equal(stubRules.config.status, 'advisory', `expected telemetry gap for ${wrangler}`);
  }

  // No health route at all; a wrangler config string, a comment, and tests or tooling that mention /healthz do not count.
  const noHealth = makeFixture({
    'wrangler.jsonc': '{ "name": "demo", "assets": { "run_worker_first": ["/healthz"] }, "observability": { "enabled": true } }\n',
    'src/worker.mjs': '// TODO: serve /healthz with the revision\nexport default { fetch() { return new Response("hi"); } };\n',
    'scripts/smoke.mjs': "const res = await fetch(`${base}/healthz`); if ((await res.json()).revision !== expected) process.exit(1);\n",
    'tests/health.test.mjs': "assert.equal((await get('/healthz')).version, '1.0.0');\n",
  });
  const noHealthReport = auditRepo(noHealth);
  assert.deepEqual(noHealthReport.observability.surfaces, ['worker']);
  assert.deepEqual(noHealthReport.observability.findings.map((f) => [f.id, f.detail]), [
    ['observability-health', 'No /healthz or /api/health route found in source'],
  ]);

  // Service with no telemetry at all gets the generic telemetry finding.
  const bareService = makeFixture({
    'server.mjs': "import { createServer } from 'node:http';\ncreateServer((req, res) => res.end('ok')).listen(8080);\n",
  });
  const bareReport = auditRepo(bareService);
  assert.deepEqual(bareReport.observability.surfaces, ['service']);
  assert.deepEqual(bareReport.observability.surfaceEvidence.service, ['server.mjs']);
  assert.deepEqual(bareReport.observability.findings.map((f) => f.rule), ['health', 'config']);
  assert.match(observabilityById(bareReport).config.detail, /No production observability config or server-side error reporting found/);
});

test('observability gaps stay advisory by default and --strict-observability exits 1 with complete output', () => {
  const failing = makeFixture({
    'PRODUCT.md': '# Product\n',
    'DESIGN.md': '# Design\n',
    'AGENTS.md': '# Guide\n',
    'README.md': '# Demo\n\n```sh\nnpm run dev\n```\n',
    'Makefile': 'test:\n\tnode --test\n',
    '.gitignore': '.env\n',
    '.githooks/pre-commit': '#!/bin/sh\nexec gitleaks protect --staged\n',
    'wrangler.toml': 'name = "demo"\nmain = "src/worker.mjs"\n',
    'src/worker.mjs': "export default { fetch(request) { return new URL(request.url).pathname === '/healthz' ? new Response('ok') : new Response('hi'); } };\n",
    'public/index.html': '<!doctype html>\n<html><head></head><body></body></html>\n',
  });

  // The 8-check baseline score and --strict are untouched by observability findings.
  const report = auditRepo(failing);
  assert.equal(report.summary.score, '8/8');
  assert.equal(report.observability.findings.length, 3);
  assert.equal(runCli([failing]).status, 0);
  assert.equal(runCli([failing, '--strict']).status, 0);
  assert.equal(runCli([failing, '--strict', '--strict-layout']).status, 0);

  const strictText = runCli([failing, '--strict-observability']);
  assert.equal(strictText.status, 1);
  assert.match(strictText.stdout, /\[ADV \] Health endpoint/);
  assert.match(strictText.stdout, /\[ADV \] Production telemetry/);
  assert.match(strictText.stdout, /\[ADV \] Client error \+ CSP capture/);

  const strictJson = runCli([failing, '--json', '--strict-observability']);
  assert.equal(strictJson.status, 1);
  const parsed = JSON.parse(strictJson.stdout);
  assert.equal(parsed.observability.status, 'advisory');
  assert.deepEqual(parsed.observability.findings.map((f) => f.id), ['observability-health', 'observability-config', 'observability-client-errors']);
  assert.ok(parsed.observability.findings.every((f) => typeof f.fix === 'string' && f.fix.length > 0));

  assert.equal(parseArgs(['--strict-observability']).strictObservability, true);
  assert.equal(parseArgs(['.']).strictObservability, false);
  assert.match(runCli(['--help']).stdout, /--strict-observability/);
});

test('.misty-check.allow observability: rules opt out per rule or wholesale without touching layout rules', () => {
  // CLI-only repo that ships a local preview server and an HTML report: detected as a service + web app, opted out wholesale.
  const cliFiles = {
    'package.json': '{"name":"report-cli","bin":{"report":"./bin/report.mjs"}}\n',
    'bin/report.mjs': "#!/usr/bin/env node\nimport { createServer } from 'node:http';\ncreateServer((req, res) => res.end('preview')).listen(0);\n",
    'templates/report.html': '<!doctype html>\n<html><body>report</body></html>\n',
  };
  const unallowed = auditRepo(makeFixture(cliFiles));
  assert.deepEqual(unallowed.observability.surfaces, ['web-app', 'service']);
  assert.equal(unallowed.observability.findings.length, 3);

  const cli = makeFixture({
    ...cliFiles,
    '.misty-check.allow': '# CLI-only: the preview server is local and never deployed.\nobservability:*  # no production runtime\n',
  });
  const cliReport = auditRepo(cli);
  assert.equal(cliReport.observability.status, 'pass');
  assert.deepEqual(cliReport.observability.findings, []);
  assert.deepEqual(cliReport.observability.suppressed.map((s) => [s.rule, s.matchedPattern]), [
    ['health', 'observability:*'],
    ['config', 'observability:*'],
    ['client-errors', 'observability:*'],
  ]);
  assert.ok(cliReport.observability.checks.every((c) => c.status === 'allowed'));
  assert.equal(cliReport.observability.allowFile, '.misty-check.allow');
  assert.equal(cliReport.layout.allowRuleCount, 0, 'observability lines are not layout path rules');
  assert.match(formatScorecard(cliReport), /\[SKIP\] Health endpoint\s+Opted out via \.misty-check\.allow \(observability:\*\)/);
  assert.equal(runCli([cli, '--strict-observability']).status, 0);

  // Per-rule opt-out suppresses only that rule; the rest still fail --strict-observability.
  const staticSite = makeFixture({
    'index.html': '<!doctype html>\n<html><body>static docs</body></html>\n',
    '.misty-check.allow': 'observability: health  # static pages, no runtime\nObservability:CONFIG\nwide-directory: legacy/\n',
  });
  const staticReport = auditRepo(staticSite);
  assert.deepEqual(staticReport.observability.surfaces, ['web-app']);
  assert.deepEqual(staticReport.observability.suppressed.map((s) => s.rule), ['health', 'config']);
  assert.deepEqual(staticReport.observability.findings.map((f) => f.rule), ['client-errors']);
  assert.equal(staticReport.layout.allowRuleCount, 1);
  assert.equal(runCli([staticSite, '--strict-observability']).status, 1);

  // An unknown rule never silently opts out: it is surfaced and the findings stay.
  const typo = makeFixture({
    'index.html': '<!doctype html>\n<html><body>static docs</body></html>\n',
    '.misty-check.allow': 'observability:client-error\nobservability:\n',
  });
  const typoReport = auditRepo(typo);
  assert.deepEqual(typoReport.observability.unknownAllowRules, ['observability:client-error']);
  assert.equal(typoReport.observability.findings.length, 3);
  assert.match(formatScorecard(typoReport), /\[WARN\] Unknown observability allow rule "observability:client-error"/);
  assert.equal(runCli([typo, '--strict-observability']).status, 1);
});

test('observability audit does not apply to repos with no web app, worker, or service surface', () => {
  const cliOnly = makeFixture({
    'package.json': '{"name":"tool","bin":{"tool":"./bin/tool.mjs"}}\n',
    'bin/tool.mjs': '#!/usr/bin/env node\nconsole.log("hi");\n',
    // Tooling, tests, and fixtures that start throwaway servers or ship sample configs are not a deployed runtime.
    'scripts/preview.mjs': "import { createServer } from 'node:http';\ncreateServer(() => {}).listen(0);\n",
    'tests/server.test.mjs': "import { createServer } from 'node:http';\ncreateServer(() => {}).listen(0);\n",
    'fixtures/worker/wrangler.toml': 'name = "sample"\n',
    'node_modules/express/package.json': '{"name":"express","dependencies":{"express":"5.0.0"}}\n',
  });
  const report = auditRepo(cliOnly);
  assert.equal(report.observability.applicable, false);
  assert.equal(report.observability.status, 'not-applicable');
  assert.deepEqual(report.observability.surfaces, []);
  assert.deepEqual(report.observability.checks, []);
  assert.match(formatScorecard(report), /Observability & auto-triage: not applicable \(no web app, worker, or service surface detected\)/);
  assert.equal(runCli([cliOnly, '--strict-observability']).status, 0);
  assert.equal(JSON.parse(runCli([cliOnly, '--json']).stdout).observability.status, 'not-applicable');
});

const OBSERVABILITY_SCRIPT = fileURLToPath(new URL('./misty-check-observability.mjs', import.meta.url));

function fillerFiles(dir, count) {
  return Object.fromEntries(Array.from({ length: count }, (_, i) => [`${dir}/f${String(i).padStart(4, '0')}.json`, '{}\n']));
}

// A Worker with a truthful health route and telemetry on: nothing for the audit to report once it is seen.
const HEALTHY_WORKER = {
  'src/worker.mjs': "const revision = 'abc1234';\nexport default { fetch(request) { return new URL(request.url).pathname === '/healthz' ? Response.json({ ok: true, revision }) : new Response('hi'); } };\n",
  'wrangler.toml': 'name = "demo"\nmain = "src/worker.mjs"\n\n[observability]\nenabled = true\n',
};

test('--strict-observability fails closed when the 2,000-file scan cap is hit, even with no findings', () => {
  // 1. Under the cap the Worker is reached and passes: the fixture has nothing to report.
  const reached = makeFixture({ ...fillerFiles('data', 1998), ...HEALTHY_WORKER });
  const reachedReport = auditRepo(reached);
  assert.deepEqual(reachedReport.observability.surfaces, ['worker']);
  assert.equal(reachedReport.observability.truncated, false);
  assert.deepEqual(reachedReport.observability.truncationReasons, []);
  assert.equal(reachedReport.observability.status, 'pass');
  assert.equal(runCli([reached, '--strict-observability']).status, 0);

  // 2. More than 2,000 scannable files sort before the Worker config: no surface is ever seen, so there are
  //    no findings, and an unconfirmed "not applicable" must not pass the strict gate.
  const capped = makeFixture({ ...fillerFiles('data', 2000), ...HEALTHY_WORKER });
  const cappedReport = auditRepo(capped);
  assert.deepEqual(cappedReport.observability.surfaces, []);
  assert.equal(cappedReport.observability.applicable, false);
  assert.deepEqual(cappedReport.observability.findings, []);
  assert.equal(cappedReport.observability.truncated, true);
  assert.deepEqual(cappedReport.observability.truncationReasons, ['max files 2,000']);
  assert.equal(cappedReport.observability.status, 'advisory');
  const cappedText = formatScorecard(cappedReport);
  assert.match(cappedText, /Observability & auto-triage: no web app, worker, or service surface detected before the scan stopped/);
  assert.match(cappedText, /\[ADV \] Observability scan incomplete \(max files 2,000\): .*--strict-observability fails closed/);
  assert.doesNotMatch(cappedText, /not applicable/);

  // Truncation stays advisory without the flag and never touches --strict-layout.
  assert.equal(runCli([capped]).status, 0);
  assert.equal(runCli([capped, '--strict-layout']).status, 0);
  const cappedStrict = runCli([capped, '--strict-observability']);
  assert.equal(cappedStrict.status, 1);
  assert.match(cappedStrict.stdout, /Observability scan incomplete \(max files 2,000\)/);
  const cappedJson = runCli([capped, '--json', '--strict-observability']);
  assert.equal(cappedJson.status, 1);
  const parsed = JSON.parse(cappedJson.stdout);
  assert.equal(parsed.observability.truncated, true);
  assert.deepEqual(parsed.observability.findings, []);
  assert.equal(parsed.observability.status, 'advisory');

  // 3. Every rule passes on what was scanned, but the cap is hit afterwards: still incomplete, still exit 1.
  const exact = makeFixture({ ...OBSERVABLE_WORKER, ...fillerFiles('zzz', 1996) });
  const exactReport = auditRepo(exact);
  assert.equal(exactReport.observability.truncated, false, 'exactly 2,000 scanned files is a complete scan');
  assert.equal(exactReport.observability.status, 'pass');
  assert.equal(runCli([exact, '--strict-observability']).status, 0);

  const overflow = makeFixture({ ...OBSERVABLE_WORKER, ...fillerFiles('zzz', 1997) });
  const overflowReport = auditRepo(overflow);
  assert.deepEqual(overflowReport.observability.checks.map((c) => c.status), ['pass', 'pass', 'pass']);
  assert.deepEqual(overflowReport.observability.findings, []);
  assert.equal(overflowReport.observability.truncated, true);
  assert.equal(overflowReport.observability.status, 'advisory');
  assert.match(formatScorecard(overflowReport), /\[OK {2}\] Health endpoint[^\n]*\n[^]*\[ADV \] Observability scan incomplete \(max files 2,000\)/);
  assert.equal(runCli([overflow, '--strict-observability']).status, 1);

  // 4. A gap found in a capped scan says the scan was incomplete instead of presenting itself as settled.
  const cappedGap = makeFixture({ 'app/server.mjs': "import { createServer } from 'node:http';\ncreateServer((req, res) => res.end('ok')).listen(8080);\n", ...fillerFiles('data', 2000) });
  const cappedGapReport = auditRepo(cappedGap);
  assert.deepEqual(cappedGapReport.observability.findings.map((f) => f.detail), [
    'No /healthz or /api/health route found in source (scan incomplete: max files 2,000)',
    'No production observability config or server-side error reporting found (scan incomplete: max files 2,000)',
  ]);
});

test(
  '--strict-observability fails closed on unreadable directories and files',
  // Mode bits are not enforced for root or a process holding CAP_DAC_READ_SEARCH; run under
  // `setpriv --inh-caps=-all --ambient-caps=-all` (or as a normal user) to exercise this.
  { skip: modeBitsAreEnforced() ? false : 'file mode bits are not enforced for this process' },
  () => {
    const strict = (repo) => {
      const result = runCli([repo, '--json', '--strict-observability']);
      return { status: result.status, observability: JSON.parse(result.stdout).observability };
    };
    const assertFailsClosed = (repo, reason) => {
      const out = strict(repo);
      assert.equal(out.status, 1, `expected --strict-observability to exit 1 for ${reason}`);
      assert.equal(out.observability.truncated, true);
      assert.deepEqual(out.observability.truncationReasons, [reason]);
      assert.deepEqual(out.observability.findings, [], 'the unreadable path hid the surface, so there is nothing to find');
      assert.equal(out.observability.status, 'advisory');
      assert.equal(runCli([repo]).status, 0, 'an incomplete scan stays advisory without the flag');
      assert.match(runCli([repo]).stdout, new RegExp(`\\[ADV \\] Observability scan incomplete \\(${reason}\\)`));
    };
    const assertRestored = (repo) => {
      const out = strict(repo);
      assert.equal(out.status, 0);
      assert.equal(out.observability.truncated, false);
      assert.deepEqual(out.observability.surfaces, ['worker']);
      assert.equal(out.observability.status, 'pass');
    };
    const nested = Object.fromEntries(Object.entries(HEALTHY_WORKER).map(([rel, content]) => [`deploy/${rel}`, content]));

    // 1. The Worker lives in a directory the scan cannot list.
    const dirRepo = makeFixture(nested);
    const privateDir = path.join(dirRepo, 'deploy');
    chmodSync(privateDir, 0o000);
    try {
      assertFailsClosed(dirRepo, 'unreadable directory');
    } finally {
      chmodSync(privateDir, 0o700);
    }
    assertRestored(dirRepo);

    // 2. The Worker config itself cannot be read.
    const fileRepo = makeFixture(HEALTHY_WORKER);
    const privateFile = path.join(fileRepo, 'wrangler.toml');
    chmodSync(privateFile, 0o000);
    try {
      assertFailsClosed(fileRepo, 'unreadable file');
    } finally {
      chmodSync(privateFile, 0o600);
    }
    assertRestored(fileRepo);

    // 3. A directory that can be listed but not entered: its entries are named yet unreadable.
    const listOnlyRepo = makeFixture(nested);
    const listOnlyDir = path.join(listOnlyRepo, 'deploy');
    chmodSync(listOnlyDir, 0o400);
    try {
      const out = strict(listOnlyRepo);
      assert.equal(out.status, 1);
      assert.equal(out.observability.truncated, true);
      assert.ok(out.observability.truncationReasons.every((reason) => /^unreadable (?:directory|file)$/.test(reason)));
    } finally {
      chmodSync(listOnlyDir, 0o700);
    }
    assertRestored(listOnlyRepo);

    // 4. Unreadable paths the audit never needs (skipped directories, non-source files) do not mark it incomplete.
    const irrelevantRepo = makeFixture({ ...HEALTHY_WORKER, 'node_modules/dep/index.js': 'module.exports = 1;\n', 'assets/logo.png': 'png' });
    const skippedDir = path.join(irrelevantRepo, 'node_modules');
    const skippedFile = path.join(irrelevantRepo, 'assets/logo.png');
    chmodSync(skippedDir, 0o000);
    chmodSync(skippedFile, 0o000);
    try {
      assertRestored(irrelevantRepo);
    } finally {
      chmodSync(skippedDir, 0o700);
      chmodSync(skippedFile, 0o600);
    }
  },
);

test('baseline health check accepts /api/health wherever the observability audit does', () => {
  const baseline = {
    'PRODUCT.md': '# Product\n\nPresent-tense user stories.\n',
    'DESIGN.md': '# Design\n\nTypography and color tokens.\n',
    'AGENTS.md': '# Repo\n\nConcise agent guide.\n',
    'README.md': '# Demo\n\nRun locally:\n\n```sh\nnpm run dev\n```\n',
    'Makefile': 'test:\n\n\tnode --test\n',
    '.gitignore': 'node_modules/\n.env\n.env.*\n!.env.example\n',
    '.githooks/pre-commit': '#!/bin/sh\nexec trufflehog filesystem .\n',
  };
  const healthOf = (report) => report.checks.find((c) => c.id === 'healthz');

  // 1. File-routed /api/health (Next.js App Router): the path never appears as a string in the source.
  const fileRouted = makeFixture({
    ...baseline,
    'package.json': '{"name":"web","dependencies":{"next":"16.0.0","react":"19.0.0","@sentry/nextjs":"9.0.0"}}\n',
    'app/api/health/route.ts': 'export const GET = () => Response.json({ ok: true, version: process.env.VERCEL_GIT_COMMIT_SHA });\n',
  });
  const fileReport = auditRepo(fileRouted);
  assert.equal(fileReport.summary.score, '8/8');
  assert.equal(healthOf(fileReport).status, 'pass');
  assert.equal(healthOf(fileReport).detail, 'Referenced in app/api/health/route.ts');
  assert.equal(observabilityById(fileReport).health.status, 'pass');
  assert.deepEqual(observabilityById(fileReport).health.evidence, ['app/api/health/route.ts']);
  assert.equal(fileReport.observability.status, 'pass');
  const fileText = formatScorecard(fileReport);
  assert.match(fileText, /\[PASS\] \/healthz endpoint {3}Referenced in app\/api\/health\/route\.ts/);
  assert.match(fileText, /\[OK {2}\] Health endpoint\s+Health route reports release\/runtime identity in app\/api\/health\/route\.ts/);
  assert.doesNotMatch(fileText, /\[GAP \]/);
  assert.doesNotMatch(fileText, /\[ADV \] Health endpoint/);
  assert.equal(runCli([fileRouted, '--strict', '--strict-observability']).status, 0);

  // 2. /api/health registered as a route string on a service.
  const inline = makeFixture({
    ...baseline,
    'package.json': '{"name":"api","dependencies":{"express":"5.0.0","@sentry/node":"9.0.0"}}\n',
    'src/server.ts': "import express from 'express';\nconst app = express();\napp.get('/api/health', (req, res) => res.json({ status: 'ok', commit: process.env.GIT_SHA }));\napp.listen(8080);\n",
  });
  const inlineReport = auditRepo(inline);
  assert.equal(healthOf(inlineReport).status, 'pass');
  assert.equal(healthOf(inlineReport).detail, 'Referenced in src/server.ts');
  assert.equal(observabilityById(inlineReport).health.status, 'pass');
  assert.equal(runCli([inline, '--strict', '--strict-observability']).status, 0);

  // 3. /healthz keeps passing both, and both checks agree on what is not a health route.
  assert.equal(healthOf(auditRepo(makeFixture({ ...baseline, ...HEALTHY_WORKER }))).status, 'pass');
  for (const source of [
    "app.get('/api/healthcheck', (req, res) => res.json({ commit: process.env.GIT_SHA }));\n",
    "app.get('/health', (req, res) => res.json({ commit: process.env.GIT_SHA }));\n",
    "// TODO: serve /api/health with the commit\napp.get('/', (req, res) => res.send('hi'));\n",
  ]) {
    const report = auditRepo(makeFixture({
      ...baseline,
      'package.json': '{"name":"api","dependencies":{"express":"5.0.0"}}\n',
      'src/server.ts': `import express from 'express';\nconst app = express();\n${source}app.listen(8080);\n`,
    }));
    assert.equal(healthOf(report).status, 'gap', `expected baseline health gap for ${JSON.stringify(source)}`);
    assert.equal(healthOf(report).detail, 'No /healthz or /api/health route or reference found in code/config');
    assert.equal(observabilityById(report).health.status, 'advisory', `expected observability health gap for ${JSON.stringify(source)}`);
  }
});

test('a standalone copy needs its sibling module, and the copied auditor is not health evidence', () => {
  // Both files copied together: the script runs, and its own rule text (which names /healthz) does not
  // satisfy the health check of the repository it was copied into.
  const both = makeFixture({ 'tools/.keep': '' });
  copyFileSync(SCRIPT, path.join(both, 'tools/misty-check.mjs'));
  copyFileSync(OBSERVABILITY_SCRIPT, path.join(both, 'tools/misty-check-observability.mjs'));
  const copied = spawnSync(process.execPath, [path.join(both, 'tools/misty-check.mjs'), both, '--json'], { encoding: 'utf8' });
  assert.equal(copied.status, 0, copied.stderr);
  const copiedReport = JSON.parse(copied.stdout);
  assert.equal(copiedReport.checks.find((c) => c.id === 'healthz').status, 'gap');
  assert.equal(copiedReport.observability.status, 'not-applicable');

  // The main script alone cannot start: the import of the sibling module fails before any audit runs.
  const alone = makeFixture({ 'tools/.keep': '' });
  copyFileSync(SCRIPT, path.join(alone, 'tools/misty-check.mjs'));
  const missing = spawnSync(process.execPath, [path.join(alone, 'tools/misty-check.mjs'), alone], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /ERR_MODULE_NOT_FOUND/);
  assert.match(missing.stderr, /misty-check-observability\.mjs/);
});
