import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { RULES, scan } from './slop-check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, 'slop-check.mjs');
const fixture = (name) => path.join(here, 'fixtures', name);
const rulesOf = (report) => [...new Set(report.findings.map((f) => f.rule))].sort();

function scratch(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'slop-check-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), body);
  return { dir, report: scan([dir], { cwd: dir }), done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('the left-border slop fixture trips every rule, starting with the accent stripe on its card', () => {
  const report = scan([fixture('left-border-slop')], { cwd: here });
  assert.deepEqual(rulesOf(report), Object.keys(RULES).sort());
  const stripe = report.findings.find((f) => f.rule === 'side-stripe');
  assert.equal(stripe.file, path.join('fixtures', 'left-border-slop', 'slop.css'));
  assert.equal(stripe.detail, 'border-left: 4px solid #7c3aed');
});

test('the Calm Editorial fixture is clean, including its blockquote rule and full button states', () => {
  const report = scan([fixture('calm-editorial')], { cwd: here });
  assert.deepEqual(report.findings, []);
  assert.equal(report.filesScanned, 2);
});

test('side stripes are caught as borders, inset shadows and pseudo-element bars, but not checkmarks or full borders', () => {
  const { report, done } = scratch({
    'a.css': `
.note { border-inline-start: 3px solid teal; }
.tab[aria-current] { box-shadow: inset 2px 0 0 var(--primary); }
.item { position: relative; }
.item::before { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: teal; }
.check::before { border-left: 2px solid white; border-bottom: 2px solid white; }
.panel { border: 1px solid #ddd; border-left: 1px solid #ddd; }
.ring:focus-visible { box-shadow: 0 0 0 3px #2563eb; }
`,
  });
  try {
    assert.deepEqual(report.findings.map((f) => [f.rule, f.line]), [['side-stripe', 2], ['side-stripe', 3], ['side-stripe', 5]]);
  } finally { done(); }
});

test('motion rules: ease-in-out, short ease-out, looping spinners and reduced-motion blocks pass', () => {
  const { report, done } = scratch({
    'm.css': `
.a { transition: opacity 180ms ease-in-out, transform 200ms cubic-bezier(0.23, 1, 0.32, 1); }
.spin { animation: spin 900ms linear infinite; }
.pop { transform: scale(0.95); }
.underline { transform: scaleX(0); }
@media (prefers-reduced-motion: reduce) { .a { transition-duration: 1s; } }
`,
  });
  try { assert.deepEqual(report.findings, []); } finally { done(); }
});

test('a justified slop-check-allow comment suppresses one rule in its file; an unjustified one does not', () => {
  const justified = scratch({ 'q.css': '/* slop-check-allow: side-stripe -- printed pull-quote convention */\n.pull { border-left: 4px solid #222; }\n' });
  const bare = scratch({ 'q.css': '/* slop-check-allow: side-stripe */\n.pull { border-left: 4px solid #222; }\n' });
  try {
    assert.equal(justified.report.findings.length, 0);
    assert.equal(justified.report.allowed.length, 1);
    assert.equal(bare.report.findings.length, 1);
  } finally { justified.done(); bare.done(); }
});

test('markup rules read <style> blocks and style attributes and skip code and scripts', () => {
  const { report, done } = scratch({
    'p.html': `<!doctype html><style>.hero { background: linear-gradient(#8b5cf6, #22d3ee); }</style>
<div style="border-right: 4px solid red"></div>
<pre>{"id": 1, "at": "2026-11-28T10:00:00Z"}</pre>
<script>const x = '<div class="card"><div class="card">';</script>
<section class="card"><header class="card-header">Title</header></section>`,
  });
  try {
    assert.deepEqual(report.findings.map((f) => [f.rule, f.line]), [['ai-gradient', 1], ['side-stripe', 2]]);
  } finally { done(); }
});

test('CLI exits 1 with findings, 0 when clean, 2 on bad usage, and emits parseable --json', () => {
  const slop = spawnSync(process.execPath, [script, fixture('left-border-slop'), '--json'], { encoding: 'utf8' });
  assert.equal(slop.status, 1);
  assert.ok(JSON.parse(slop.stdout).findings.some((f) => f.rule === 'side-stripe'));
  const clean = spawnSync(process.execPath, [script, fixture('calm-editorial')], { encoding: 'utf8' });
  assert.equal(clean.status, 0);
  assert.match(clean.stdout, /^slop-check: clean \(2 files scanned\)/);
  assert.equal(spawnSync(process.execPath, [script, '--strict'], { encoding: 'utf8' }).status, 2);
});
