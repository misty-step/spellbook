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
    'package.json': JSON.stringify({ name: 'demo', scripts: { test: 'node --test', lint: 'eslint .' } }),
    '.gitignore': 'node_modules/\n.env\n.env.*\n!.env.example\n',
    '.githooks/trufflehog-gate.py': '#!/usr/bin/env python3\n# trufflehog scanner\n',
    'src/server.mjs': 'export function route(p) { return p === "/healthz" ? 200 : 404; }\n',
  });

  const report = auditRepo(repo);
  assert.equal(report.summary.passed, 8);
  assert.equal(report.summary.gaps, 0);
  assert.equal(report.summary.score, '8/8');
  assert.ok(report.checks.every((check) => check.status === 'pass'));
  assert.match(formatScorecard(report), /Score: 8\/8 passed · 0 gaps/);
});

test('rejects false positives: escaping symlinks, negated .env, no-op hooks, bare manifests, JSON fences, and comment-only /healthz', () => {
  const outside = makeFixture({ 'secret-product.md': '# Outside\n' });
  const repo = makeFixture({
    'SPEC.md': '# Legacy Spec\n',
    'README.md': '# Demo\n\n```json\n{"run": true}\n```\n',
    'go.mod': 'module example.com/demo\n',
    '.gitignore': '.env\n!.env\n',
    '.githooks/pre-commit': '#!/bin/sh\nexit 0\n',
    'src/server.mjs': '// TODO: implement /healthz endpoint\n/* /healthz */\nexport const ok = true;\n',
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

  // Symlinked executable invocation must run CLI and print scorecard.
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
