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
  const dir = mkdtempSync(path.join(tmpdir(), 'slop-check-'));
  try {
    writeFileSync(path.join(dir, 'release.json'), '{"at": "2026-11-28T10:00:00Z"}');
    const named = spawnSync(process.execPath, [script, path.join(dir, 'release.json')], { encoding: 'utf8' });
    assert.equal(named.status, 0, 'an explicitly named non-CSS, non-markup file is not scanned');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const FULL_BTN = `
.btn { transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
.btn:hover { background: #222; }
.btn:active { transform: scale(0.97); }
.btn:focus-visible { outline: 2px solid #222; }
.btn:disabled { opacity: 0.5; }
.btn[aria-busy="true"] { cursor: progress; }
@media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
`;

test('button states are checked per button selector: an incomplete second button class fails', () => {
  const { report, done } = scratch({ 'b.css': `${FULL_BTN}.button { background: #222; color: white; }\n` });
  try {
    assert.deepEqual(report.findings.map((f) => [f.rule, f.line, f.detail]), [
      ['button-states', 9, '.button missing :hover, :active, disabled, pending, :focus-visible'],
    ]);
  } finally { done(); }
});

test('button states: complete per-selector states pass, variants inherit their base, the button element stands alone', () => {
  const complete = scratch({ 'b.css': `${FULL_BTN}.btn-quiet { background: transparent; }\n.btn .icon { width: 1em; }\n` });
  const sameSelectorList = scratch({
    'b.css': `
.btn, .button { color: white; }
.btn:hover, .button:hover { color: #eee; }
.btn:active, .button:active { transform: scale(0.97); }
.btn:focus-visible, .button:focus-visible { outline: 2px solid #222; }
.btn:disabled, .button[aria-disabled="true"] { opacity: 0.5; }
.btn[aria-busy], .button.is-loading { cursor: progress; }
`,
  });
  const strayElement = scratch({ 'b.css': `${FULL_BTN}form button { margin: 0; }\n.btn-group:hover { color: red; }\n:focus-visible { outline: 2px solid #222; }\n` });
  try {
    assert.deepEqual(complete.report.findings, []);
    assert.deepEqual(sameSelectorList.report.findings, []);
    assert.deepEqual(strayElement.report.findings.map((f) => f.detail), ['button missing :hover, :active, disabled, pending'],
      'a global :focus-visible ring covers every button, but `.btn` states never cover the `button` element');
  } finally { complete.done(); sameSelectorList.done(); strayElement.done(); }
});

test('reduced motion needs a real @media rule: a commented-out prefers-reduced-motion fails', () => {
  const motion = '.fade { transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1); }\n';
  const commented = scratch({ 'm.css': `/* TODO: add prefers-reduced-motion */\n${motion}` });
  const htmlComment = scratch({ 'm.html': `<!-- prefers-reduced-motion later --><style>${motion}</style>` });
  const real = scratch({ 'm.css': `${motion}@media (prefers-reduced-motion: reduce) { .fade { transition: none; } }\n` });
  const inStyleBlock = scratch({ 'm.css': motion, 'm.html': '<style>@media (prefers-reduced-motion: reduce) { .fade { transition: none; } }</style>' });
  try {
    assert.deepEqual(commented.report.findings.map((f) => [f.rule, f.line]), [['reduced-motion', 2]]);
    assert.deepEqual(htmlComment.report.findings.map((f) => f.rule), ['reduced-motion']);
    assert.deepEqual(real.report.findings, []);
    assert.deepEqual(inStyleBlock.report.findings, []);
  } finally { commented.done(); htmlComment.done(); real.done(); inStyleBlock.done(); }
});
