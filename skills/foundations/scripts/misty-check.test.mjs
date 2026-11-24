import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
