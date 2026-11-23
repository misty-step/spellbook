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
