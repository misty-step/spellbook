#!/usr/bin/env node
/**
 * Blind Design Arena and harness-ablation ledger. Node built-ins only.
 *
 *   node arena.mjs open    --brief <text> --config <label> --config <label> [--config <label> ...] [--ledger <dir>] [--id <id>]
 *   node arena.mjs verdict --arena <id> --winner <slot> [--ranking 2,1,3] [--reason <text>] [--judge <name>] [--ledger <dir>]
 *   node arena.mjs reveal  --arena <id> [--ledger <dir>]
 *   node arena.mjs tally   [--ledger <dir>] [--json]
 *
 * A config label names one arm, e.g. "model-a+design" or "control" vs "minus:rule-7". Parts joined by "+"
 * are tallied separately too, so a skill pack's record shows across the models it ran with.
 * The ledger (default ./design-arena, or $DESIGN_ARENA_LEDGER) holds arenas/<id>.json keys and an
 * append-only verdicts.jsonl. Exit codes: 0 ok, 1 refused, 2 usage.
 */

import { randomBytes, randomInt } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export class Refusal extends Error {}

const keyPath = (ledger, id) => path.join(ledger, 'arenas', `${id}.json`);
const readKey = (ledger, id) => {
  if (!/^[\w.-]+$/.test(id ?? '')) throw new Refusal(`invalid arena id ${JSON.stringify(id)}`);
  if (!existsSync(keyPath(ledger, id))) throw new Refusal(`no arena ${id} in ${ledger}`);
  return JSON.parse(readFileSync(keyPath(ledger, id), 'utf8'));
};
const readVerdicts = (ledger) => {
  const file = path.join(ledger, 'verdicts.jsonl');
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
};

/** Shuffle configs into numbered blind slots and write the key. */
export function open(ledger, { brief, configs, id, now = new Date() }) {
  if (!brief) throw new Refusal('open needs --brief');
  if (configs.length < 2) throw new Refusal('open needs at least two --config arms');
  if (new Set(configs).size !== configs.length) throw new Refusal('config labels must be distinct');
  const arenaId = id ?? `${now.toISOString().slice(0, 10)}-${randomBytes(3).toString('hex')}`;
  if (existsSync(keyPath(ledger, arenaId))) throw new Refusal(`arena ${arenaId} already exists`);
  const order = [...configs];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const key = { id: arenaId, brief, openedAt: now.toISOString(), revealedAt: null, slots: Object.fromEntries(order.map((c, i) => [String(i + 1), c])) };
  mkdirSync(path.dirname(keyPath(ledger, arenaId)), { recursive: true });
  writeFileSync(keyPath(ledger, arenaId), `${JSON.stringify(key, null, 2)}\n`, { flag: 'wx' });
  return key;
}

/** Append one judge's verdict by slot number; a verdict after the reveal is kept but marked not blind. */
export function verdict(ledger, { arena, winner, ranking, reason = '', judge = 'owner', now = new Date() }) {
  const key = readKey(ledger, arena);
  const slots = Object.keys(key.slots);
  const order = ranking ? ranking.split(',').map((s) => s.trim()) : [String(winner)];
  if (winner !== undefined && order[0] !== String(winner)) throw new Refusal('--ranking must start with --winner');
  if (!order.length || order.some((s) => !slots.includes(s)) || new Set(order).size !== order.length) {
    throw new Refusal(`slots must be distinct values from ${slots.join(', ')}`);
  }
  const record = { arena, at: now.toISOString(), judge, winner: order[0], ranking: order, reason, blind: key.revealedAt === null };
  appendFileSync(path.join(ledger, 'verdicts.jsonl'), `${JSON.stringify(record)}\n`);
  return record;
}

/** Reveal the slot key once verdicts are in. */
export function reveal(ledger, { arena, now = new Date() }) {
  const key = readKey(ledger, arena);
  if (!readVerdicts(ledger).some((v) => v.arena === arena)) throw new Refusal(`record a verdict for ${arena} before revealing its key`);
  if (key.revealedAt === null) {
    key.revealedAt = now.toISOString();
    writeFileSync(keyPath(ledger, arena), `${JSON.stringify(key, null, 2)}\n`);
  }
  return key;
}

/** Join blind verdicts with revealed keys: wins, appearances and mean rank per arm and per arm part. */
export function tally(ledger) {
  const dir = path.join(ledger, 'arenas');
  const keys = new Map((existsSync(dir) ? readdirSync(dir) : []).filter((f) => f.endsWith('.json')).map((f) => {
    const key = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    return [key.id, key];
  }));
  const rows = new Map();
  const bump = (label, rank, won) => {
    const row = rows.get(label) ?? { label, judged: 0, wins: 0, rankSum: 0 };
    row.judged++;
    row.wins += won ? 1 : 0;
    row.rankSum += rank;
    rows.set(label, row);
  };
  let counted = 0;
  let pending = 0;
  for (const v of readVerdicts(ledger)) {
    const key = keys.get(v.arena);
    if (!key || !v.blind) continue;
    if (key.revealedAt === null) { pending++; continue; }
    counted++;
    for (const [slot, label] of Object.entries(key.slots)) {
      const idx = v.ranking.indexOf(slot);
      const rank = idx === -1 ? v.ranking.length + 1 : idx + 1;
      const parts = label.split('+');
      for (const name of parts.length > 1 ? [label, ...parts.map((p) => `  ${p}`)] : [label]) bump(name, rank, slot === v.winner);
    }
  }
  const arms = [...rows.values()].map((r) => ({ label: r.label, judged: r.judged, wins: r.wins, winRate: r.wins / r.judged, meanRank: r.rankSum / r.judged }))
    .sort((a, b) => b.winRate - a.winRate || a.meanRank - b.meanRank || a.label.localeCompare(b.label));
  return { verdicts: counted, pendingReveal: pending, arms };
}

function parse(argv) {
  const opts = { configs: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--json') { opts.json = true; continue; }
    const value = argv[i + 1];
    if (!flag.startsWith('--') || value === undefined) throw new Error(`unexpected ${flag}`);
    i++;
    if (flag === '--config') opts.configs.push(value);
    else if (['--brief', '--ledger', '--id', '--arena', '--winner', '--ranking', '--reason', '--judge'].includes(flag)) opts[flag.slice(2)] = value;
    else throw new Error(`unknown flag ${flag}`);
  }
  return opts;
}

function main([command, ...argv]) {
  let opts;
  try { opts = parse(argv); } catch (error) {
    process.stderr.write(`arena: ${error.message}\nUsage: arena.mjs <open|verdict|reveal|tally> [flags]; see the header of this file.\n`);
    return 2;
  }
  const ledger = path.resolve(opts.ledger ?? process.env.DESIGN_ARENA_LEDGER ?? 'design-arena');
  try {
    if (command === 'open') {
      const key = open(ledger, { brief: opts.brief, configs: opts.configs, id: opts.id });
      process.stdout.write(`arena ${key.id}: ${Object.keys(key.slots).length} blind slots\n${Object.entries(key.slots).map(([s, c]) => `  slot ${s} <- ${c}`).join('\n')}\nDispatch each arm to its slot; show the judge slot numbers only.\n`);
    } else if (command === 'verdict') {
      const record = verdict(ledger, { arena: opts.arena, winner: opts.winner, ranking: opts.ranking, reason: opts.reason, judge: opts.judge });
      process.stdout.write(`recorded ${record.blind ? 'blind' : 'NOT blind (key already revealed)'} verdict: slot ${record.winner} wins ${record.arena}\n`);
    } else if (command === 'reveal') {
      const key = reveal(ledger, { arena: opts.arena });
      process.stdout.write(`${Object.entries(key.slots).map(([s, c]) => `slot ${s} = ${c}`).join('\n')}\n`);
    } else if (command === 'tally') {
      const t = tally(ledger);
      if (opts.json) process.stdout.write(`${JSON.stringify(t, null, 2)}\n`);
      else {
        process.stdout.write(`${t.verdicts} blind verdicts${t.pendingReveal ? `, ${t.pendingReveal} awaiting reveal` : ''}\n`);
        for (const a of t.arms) process.stdout.write(`${a.label.padEnd(32)} ${String(a.wins).padStart(3)}/${String(a.judged).padEnd(3)} wins  mean rank ${a.meanRank.toFixed(2)}\n`);
      }
    } else {
      process.stderr.write('Usage: arena.mjs <open|verdict|reveal|tally> [flags]; see the header of this file.\n');
      return 2;
    }
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    process.stderr.write(`arena: ${error.message}\n`);
    return 1;
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
