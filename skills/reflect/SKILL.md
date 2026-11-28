---
name: reflect
description: "Five compounding maintenance loops run on a cadence by a cold reader: session reflection into skill and rule pruning, verification health checks without tautological tests, a Day-1 entropy audit that deletes duplicate implementations, shallow wrappers and dead shims, learning extraction into atomic active-recall items for the human operator, and harness ablation that proves empirically which skills, rules and design packs earn their place."
---

# Reflect

Entropy accumulates by default. Every session adds a rule, a test, a guard or a shim; nothing removes them unless a loop does. These five loops are the recurring hygiene that keeps a codebase and its method compounding instead of silting up. Each runs on a cadence, is done by a cold reader that did not produce the work, and ends in one reviewable change — usually with more lines deleted than added — presented as the `present` skill describes.

## 1. Session reflection → skill and rule pruning

After a significant session or a batch of runs, turn repeated friction into the smallest durable fix and retire what no longer earns its place. Extraction, triage, graduation and measurement belong to the `trace-mining` skill; this loop adds the **deletion test**: a standing rule or skill paragraph stays only if removing it changes behavior on a recent real task. Re-run one such task without it; if a current model does as well, delete it.

## 2. Verification health check

Run the real-path verification against the current build and ask whether it still exercises what users actually do. Fix or remove flaky and slow checks, delete tests that mirror the implementation, duplicate another check or cover removed behavior, and add coverage only for failure modes the intent names. Prove each surviving check still bites: a deliberately broken build must fail it — a check that passes on a broken build is not a check. Keep the suite inside its time budget.

## 3. Entropy audit

Ask: *if this were day one, with every requirement we know today, would we build it this way?* Scan for duplicate implementations of one idea, layers that only forward calls, flags and compatibility shims whose callers are gone, configuration nobody sets, and modules whose interface is as large as their implementation. Back each claim with evidence — a snapshot from the `project-anatomy` skill shows depth and churn at a glance. Rank by cost and ship the top few as deletions with their callers migrated, not as a report.

## 4. Learning extraction

A session that discovered why one design beat another, or how a system really fails, leaves the human operator smarter only if the insight is captured. Pick the few high-leverage architectural insights and tradeoffs from recent work and turn each into an atomic active-recall item — one question, one answer, a link to the evidence — for the operator's spaced-repetition tool. Few and durable: no trivia, no secrets, nothing a search answers faster.

## 5. Harness ablation and empirical pruning

The deletion test above asks whether one rule still earns its place. Ablation asks it continuously and with numbers, so the harness — skills, rules, prompts, design packs, model routing — shrinks to what measurably helps instead of growing by accretion.

- **One variable per delta.** On routine work that would run anyway, run a control arm on the current harness and one treatment arm that differs in exactly one thing: omit one skill, drop one rule or paragraph, swap one design-skill pack, or change one model route. Same brief, same fixtures, same model elsewhere. Two changes at once teach nothing.
- **Judge blind, on outcomes.** Grade both arms on what the work is for, never on compliance with the removed text: did it pass the Verifier on the real path, how many review passes did it take, how many lines did it add, and, for UI, which one did the owner pick blind. A UI delta runs as a two-arm arena with the `design-exploration` skill's `arena.mjs` (`--config control --config minus:<rule>`), so verdicts land in the same durable ledger. A two-arm delta never stands in for the three-arm Design Arena that new UI surfaces, redesigns and visual-system changes require; when the work under test is one of those, the delta rides inside that arena as two of its three arms (house control, single-variable treatment, plus a distinct challenger) and the control-against-treatment ranking is the ablation result.
- **Log every run durably.** Append one record per arm to a ledger that outlives the session — date, task, the single variable, arm, outcome measures, verdict and a link to the evidence. A delta that was run and not logged did not happen.
- **Decide on accumulated evidence, then act.** When a component shows no measurable loss across several independent tasks, delete it in one reviewable change that cites the ledger. When removing it reliably hurts, keep it and note which outcome it protects. When a challenger pack or route keeps winning, promote it and retire the incumbent the same way. Inconclusive results stay in the ledger and keep running; nothing is deleted on one anecdote, and nothing is kept on habit.
- **Let periodic reflection read the ledger.** Scheduled reflection or dreaming passes tally the ledger, surface the cheapest deletion with the strongest evidence and propose it; the human operator accepts or holds. Track harness size over time next to outcome quality — size should fall or hold while quality holds or rises.

## Cadence

| Loop | When | Hands back |
| --- | --- | --- |
| Reflection and pruning | After large sessions or weekly | Graduated checks and deleted rules |
| Verification health | Weekly, and after big refactors | A leaner suite that still fails on broken builds |
| Entropy audit | Monthly, or before a recompile | Merged deletions with migrated callers |
| Learning extraction | After sessions that taught something | A handful of recall items |
| Harness ablation | Continuously on routine work; tallied weekly | Ledger-backed deletions and promotions |

Measure each loop by what it removes and whether the targeted friction recurs. A loop that only ever adds is not hygiene; revise or drop it.
