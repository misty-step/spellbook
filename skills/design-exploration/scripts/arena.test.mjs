import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { open, Refusal, reveal, tally, verdict } from './arena.mjs';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'arena.mjs');
const ledgerDir = () => mkdtempSync(path.join(tmpdir(), 'arena-'));
const slotOf = (key, label) => Object.entries(key.slots).find(([, c]) => c === label)[0];

test('open shuffles distinct arms into numbered blind slots and refuses duplicates or a single arm', () => {
  const ledger = ledgerDir();
  try {
    const key = open(ledger, { brief: 'pricing page', configs: ['a+design', 'b+design', 'a+impeccable'], id: 'p1' });
    assert.deepEqual(Object.keys(key.slots), ['1', '2', '3']);
    assert.deepEqual(Object.values(key.slots).sort(), ['a+design', 'a+impeccable', 'b+design']);
    assert.equal(key.revealedAt, null);
    assert.throws(() => open(ledger, { brief: 'x', configs: ['a', 'a'] }), Refusal);
    assert.throws(() => open(ledger, { brief: 'x', configs: ['a'] }), Refusal);
    assert.throws(() => open(ledger, { brief: 'x', configs: ['a', 'b'], id: 'p1' }), Refusal);
  } finally { rmSync(ledger, { recursive: true, force: true }); }
});

test('verdicts append durably by slot, reveal needs a verdict, and late verdicts are marked not blind', () => {
  const ledger = ledgerDir();
  try {
    open(ledger, { brief: 'settings', configs: ['x', 'y'], id: 's1' });
    assert.throws(() => reveal(ledger, { arena: 's1' }), /before revealing/);
    assert.throws(() => verdict(ledger, { arena: 's1', winner: '3' }), /slots must be/);
    assert.throws(() => verdict(ledger, { arena: '../etc', winner: '1' }), /invalid arena id/);
    assert.equal(verdict(ledger, { arena: 's1', winner: '2', reason: 'calmer hierarchy' }).blind, true);
    reveal(ledger, { arena: 's1' });
    assert.equal(verdict(ledger, { arena: 's1', winner: '1' }).blind, false);
    const lines = readFileSync(path.join(ledger, 'verdicts.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(lines.map((l) => [l.winner, l.blind, l.reason]), [['2', true, 'calmer hierarchy'], ['1', false, '']]);
  } finally { rmSync(ledger, { recursive: true, force: true }); }
});

test('tally counts only blind verdicts on revealed arenas, per arm and per arm part', () => {
  const ledger = ledgerDir();
  try {
    for (const id of ['t1', 't2']) {
      const key = open(ledger, { brief: id, configs: ['m1+packA', 'm2+packA', 'm1+packB'], id });
      const best = slotOf(key, 'm1+packA');
      const rest = Object.keys(key.slots).filter((s) => s !== best);
      verdict(ledger, { arena: id, winner: best, ranking: [best, ...rest].join(',') });
    }
    open(ledger, { brief: 'unrevealed', configs: ['m1+packB', 'm2+packA'], id: 't3' });
    verdict(ledger, { arena: 't3', winner: '1' });
    reveal(ledger, { arena: 't1' });
    reveal(ledger, { arena: 't2' });
    const t = tally(ledger);
    assert.equal(t.verdicts, 2);
    assert.equal(t.pendingReveal, 1);
    const arm = (label) => t.arms.find((a) => a.label === label);
    const part = (label) => t.parts.find((a) => a.label === label);
    assert.deepEqual([arm('m1+packA').wins, arm('m1+packA').judged, arm('m1+packA').meanRank], [2, 2, 1]);
    assert.equal(t.arms[0].label, 'm1+packA', 'the arm that always won ranks first');
    assert.deepEqual([part('packA').judged, part('packA').wins, part('packB').wins, part('m1').judged], [4, 2, 0, 4]);
  } finally { rmSync(ledger, { recursive: true, force: true }); }
});

test('CLI walks open, verdict, reveal and tally with exit codes 0, 1 and 2', () => {
  const ledger = ledgerDir();
  const run = (...args) => spawnSync(process.execPath, [script, ...args, '--ledger', ledger], { encoding: 'utf8' });
  try {
    assert.equal(run('open', '--brief', 'b', '--config', 'control', '--config', 'minus:rule-7', '--id', 'c1').status, 0);
    assert.equal(run('reveal', '--arena', 'c1').status, 1);
    assert.equal(run('verdict', '--arena', 'c1', '--winner', '1').status, 0);
    assert.equal(run('reveal', '--arena', 'c1').status, 0);
    const t = JSON.parse(run('tally', '--json').stdout);
    assert.equal(t.verdicts, 1);
    assert.deepEqual([t.arms.length, t.parts], [2, []], 'labels without + have no parts');
    assert.equal(run('bogus').status, 2);
    assert.equal(run('open', '--nope', 'x').status, 2);
  } finally { rmSync(ledger, { recursive: true, force: true }); }
});
