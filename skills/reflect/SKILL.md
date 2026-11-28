---
name: reflect
description: "Four compounding maintenance loops run on a cadence by a cold reader: session reflection into skill and rule pruning, verification health checks without tautological tests, a Day-1 entropy audit that deletes duplicate implementations, shallow wrappers and dead shims, and learning extraction into atomic active-recall items for the human operator."
---

# Reflect

Entropy accumulates by default. Every session adds a rule, a test, a guard or a shim; nothing removes them unless a loop does. These four loops are the recurring hygiene that keeps a codebase and its method compounding instead of silting up. Each runs on a cadence, is done by a cold reader that did not produce the work, and ends in one reviewable change — usually with more lines deleted than added — presented as the `present` skill describes.

## 1. Session reflection → skill and rule pruning

After a significant session or a batch of runs, turn repeated friction into the smallest durable fix and retire what no longer earns its place. Extraction, triage, graduation and measurement belong to the `trace-mining` skill; this loop adds the **deletion test**: a standing rule or skill paragraph stays only if removing it changes behavior on a recent real task. Re-run one such task without it; if a current model does as well, delete it.

## 2. Verification health check

Run the real-path verification against the current build and ask whether it still exercises what users actually do. Fix or remove flaky and slow checks, delete tests that mirror the implementation, duplicate another check or cover removed behavior, and add coverage only for failure modes the intent names. Prove each surviving check still bites: a deliberately broken build must fail it — a check that passes on a broken build is not a check. Keep the suite inside its time budget.

## 3. Entropy audit

Ask: *if this were day one, with every requirement we know today, would we build it this way?* Scan for duplicate implementations of one idea, layers that only forward calls, flags and compatibility shims whose callers are gone, configuration nobody sets, and modules whose interface is as large as their implementation. Back each claim with evidence — a snapshot from the `project-anatomy` skill shows depth and churn at a glance. Rank by cost and ship the top few as deletions with their callers migrated, not as a report.

## 4. Learning extraction

A session that discovered why one design beat another, or how a system really fails, leaves the human operator smarter only if the insight is captured. Pick the few high-leverage architectural insights and tradeoffs from recent work and turn each into an atomic active-recall item — one question, one answer, a link to the evidence — for the operator's spaced-repetition tool. Few and durable: no trivia, no secrets, nothing a search answers faster.

## Cadence

| Loop | When | Hands back |
| --- | --- | --- |
| Reflection and pruning | After large sessions or weekly | Graduated checks and deleted rules |
| Verification health | Weekly, and after big refactors | A leaner suite that still fails on broken builds |
| Entropy audit | Monthly, or before a recompile | Merged deletions with migrated callers |
| Learning extraction | After sessions that taught something | A handful of recall items |

Measure each loop by what it removes and whether the targeted friction recurs. A loop that only ever adds is not hygiene; revise or drop it.
