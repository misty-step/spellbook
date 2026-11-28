---
name: verify
description: "Principle-first verification: one independent Verifier proves on the real running path that a change achieves its stated intent, with blocking real-path functional and safety proof, a non-blocking simplicity and anti-bloat counter-pressure, a failure model scoped to the system's real operating contract, a hard two-pass convergence cap,, a fixed PASS / PASS_WITH_MINOR_FINDINGS / FAIL verdict format, and refactoring, redesign and recompilation routed to their own scheduled passes."
---

# Verify

## The primitive

Verification is one principle: **independent proof, on the real running path, that the change achieves its stated intent.** Everything below serves it. *Independent* means someone other than the builder — a reviewer from a different model family that reads the intent, the diff and the evidence, never the builder's rationale, and reproduces the proof itself. *Real running path* means the artifact users meet: a headed browser for UI, the real CLI, worker or service for systems — never mocks, summaries or green CI alone. *Stated intent* bounds the review: the acceptance criteria and Active Folio lines this change claims, inside a failure model proportional to how the system actually runs.

The role that does this is the **Verifier**. The name is only the current label for the principle; earlier harnesses called it a cold critic, and a later one may rename it again. When a name and the principle disagree, the principle wins.

What verification is not: refactoring, tidying, redesign, dependency upgrades and full-project recompilation. Those are real work with their own cadence, and folding them into a slice's review turns proof into an open-ended rewrite. The Verifier grades simplicity and names deletions (Axis 2), but larger structural work routes to a separately scheduled or triggered pass — the `reflect` loops, a recompile, a design arena — never into the blocking gate of the change under review.

## Why two axes

Review answers two questions, not one: **does the change do what its intent says on the real running path**, and **did it leave the code deeper or more tangled**. A reviewer asked only "can you break it?" is rewarded for every defect it finds and never charged for the code its findings add, so with no stated failure model and no memory of earlier passes it keeps inventing narrower hypotheticals, and the builder keeps bolting on guards and tests that mirror the implementation. This skill keeps the independence and removes the gradient that turns review into armor.

## Before reviewing

Write down three things; a verdict without them is not a verdict.

- **Intent** — the acceptance criteria and the Active Folio lines this change claims to satisfy.
- **Failure model** — two or three lines derived from the real operating contract: who runs it, how many writers, what is at stake, which failures the intent names. A single-operator CLI must survive a crash mid-write; it need not survive a hand edit racing an in-flight request. A multi-tenant ledger puts concurrency, idempotency and tenant isolation in scope. Proportion is the point: test what this system will actually meet.
- **Pass number** — taken from the brief, with the earlier verdicts (verdicts only, not builder argument). Each pass knows where it sits on the curve.

## Axis 1 — Real-path proof (blocking)

Run the change the way its users meet it, as the primitive requires. `FAIL` is reserved for four things:

1. An acceptance criterion is not met.
2. A regression on a normal path, or on a failure mode inside the stated failure model.
3. A security, secret, data or isolation leak.
4. Proof that is missing, fabricated or does not reproduce.

Every blocking finding carries its reproduction — exact command or steps, expected versus observed — and names the intent or failure-model line it violates. No reproduction, no block.

## Axis 2 — Simplicity (counter-pressure)

Grade the diff's effect on design: **deeper**, **neutral** or **shallower**, with file references. Scope it to what this diff touched; structural debt elsewhere becomes a Spark for the next scheduled `reflect` pass, not a request to rewrite it here. Look for defensive code against failures outside the failure model, shallow layers that only forward calls, speculative compatibility shims and flags with no caller, tests that mirror the implementation (asserting mocks were called, snapshotting source, restating constants) instead of observable behavior, duplicated logic, and growth out of proportion to the behavior added. Recommend deletions as readily as additions.

Apply the axis to the review itself: before asking for a guard or a test, name the failure-model line it defends and the smallest change that would satisfy it. If neither exists, it is not a finding. Axis 2 never blocks alone — taste as an open-ended gate rebuilds the gradient this skill removes — but it is always graded and always visible.

## Convergence cap

Safety takes precedence over the cap: a real security, secret, data or isolation leak blocks at every pass — pass 1, pass 2 and pass 3 onward — whether the change introduced it or it was already there. Failure-model scope does not narrow it either: a real leak may cite this safety rule directly as the line it violates, even when the written failure model omitted that boundary. Nothing below narrows that rule.

- **Pass 1** — full review on both axes; any of the four `FAIL` classes may block.
- **Pass 2** — confirms the pass-1 blockers are closed and that the fixes neither regressed nor bloated. New blockers only for a leak, or where a fix introduced a blocker.
- **Pass 3 onward** — blocks only on a reproduced catastrophe: a real security, secret, data or isolation leak; loss or corruption of real data; or core user behavior completely broken or unusable. A minor or cosmetic mismatch — label punctuation, wording, a narrower edge case — goes to `PASS_WITH_MINOR_FINDINGS` or a follow-up Spark, never another blocking pass.

At every pass, an edge case outside the failure model is never blocking. If the failure model itself looks wrong, that is a question about intent for the human operator, raised as a Spark — not a patch loop.

## Verdict format

The first line is exactly one of three values; the rest follows this shape.

```
VERDICT: PASS | PASS_WITH_MINOR_FINDINGS | FAIL
Intent: <one-line stated intent>
Pass: <n> · Failure model: <one line>

## Axis 1 — Observed on the real path
<what ran, exact commands or steps, what was seen>

## Axis 2 — Simplicity & architecture
Depth: deeper | neutral | shallower — <why, with file references>

## Findings
### Blocking
- <claim> — repro: <steps> — expected / observed — violates: <intent or failure-model line>
### Follow-up Sparks / Minor
- <claim> — <smallest fix, preferably a deletion>
```

`FAIL` if and only if Blocking is non-empty; `PASS_WITH_MINOR_FINDINGS` if only the second list has items; `PASS` if both are empty.

## Receiving a verdict

Fix every blocking finding at its root. Take a minor finding now only when it deletes code or is trivially small; log the rest as Sparks. Never add a test that restates the implementation, or a guard for a failure outside the model, just to quiet a reviewer — say why and leave it for the human operator to decide.
