# Verification philosophy: why adversarial critics bloat code, and the two-axis fix

This page is for human readers. The agent-facing rules live in [`skills/verify/SKILL.md`](../skills/verify/SKILL.md); this explains why they are shaped that way.

## The primitive comes first

Verification is one principle: **independent proof, on the real running path, that the change achieves its stated intent.** Every rule in the skill is a consequence of it. Independence is why the reviewer comes from another model family and reproduces proof rather than reading the builder's account. The real running path is why mocks, summaries and green CI are never proof. Stated intent is why every review starts from acceptance criteria and a failure model, and why findings outside them do not block.

Naming the principle before the role matters because roles get renamed. This repository called the reviewer a *cold critic*; it now calls it the **Verifier**. Both are labels for the same principle, and a future harness may choose another. When a label's connotations pull against the principle — "critic" invites hunting for faults, which is exactly the gradient described below — the principle decides.

The principle also says what verification is not. Refactoring, tidying, redesign and full-project recompilation are valuable, but they answer a different question ("is this the codebase we would build today?") on a different cadence. Folded into a slice's review, they turn a bounded proof into an open-ended rewrite. So the Verifier grades simplicity and names deletions, and the structural work itself runs in separately scheduled or triggered passes: the [`reflect`](../skills/reflect/SKILL.md) loops, a recompile, a design arena.

## The symptom

A recent slice shipped with a green unit suite, a passing live walkthrough on the real running path, and syscall-level proof that its writes reached disk. It still went through eight review passes. Each pass was run by a fresh, capable, cross-family critic told to be adversarial and to answer `VERDICT: FAIL` if anything was wrong, and each found something: a crash between two writes, then power loss in the same window, then a hand edit to a data file during a hundred-millisecond request, then the same edit against a legacy schema mid-upgrade. Every finding was technically real. Almost none described a failure the tool's single operator would ever meet. The builder answered each with another guard and another test, and the module came out of review larger, shallower and harder to change than it went in.

That is not one bad review. It recurs wherever a strong model is handed an open-ended gate, and the cause is structural.

## Four root causes

1. **Asymmetric incentive gradient.** An adversarial critic is rewarded, implicitly, for finding any defect, and charged nothing for the complexity its findings cause. A guard against an impossible race costs the critic nothing and the codebase forever. Optimizing a reviewer for "defects found" is Goodhart's law: the measure stops tracking quality once it becomes the target.
2. **Unbounded failure-model scope.** Without an explicit statement of what this system must survive — derived from who runs it and what is at stake — there is no floor under the next hypothetical. `SIGKILL` leads to power loss, to a concurrent manual edit, to a legacy upgrade that drops a column twice. Each step is plausible in isolation, and a capable model can generate them indefinitely.
3. **No simplicity counter-pressure.** The gate asks "can any synthetic reproduction break this?" and never "did this pass make the module deeper or more tangled?". Nothing in the loop values deletion, so complexity only flows one way. Deep modules — small interfaces over substantial implementations, as *A Philosophy of Software Design* argues — are what make software cheap to change, and nothing defended them.
4. **Pass-count amnesia.** Every pass starts cold, so pass six reviews with the energy of pass one. It cannot see that the curve has flattened, that earlier passes already closed the real defects, or that it is now polishing armor with diminishing returns.

## The redesign

The [`verify`](../skills/verify/SKILL.md) skill keeps what works — an independent Verifier from a different model family that reproduces proof instead of trusting the builder — and removes each cause structurally rather than by asking reviewers to be nicer:

| Root cause | Structural counter |
| --- | --- |
| Asymmetric incentive | `FAIL` is reserved for four classes (broken acceptance, in-model regression, leak, missing or dishonest proof), and every blocker needs a reproduction. Before asking for a guard or test, the verifier must name the failure-model line it defends. |
| Unbounded scope | A written failure model, proportional to the real operating contract, precedes the review. Edge cases outside it are never blocking. |
| No counter-pressure | Axis 2 grades every diff deeper, neutral or shallower, and names defensive over-engineering, forwarding layers, speculative shims and tautological tests. It never blocks alone, so taste does not become a new open-ended gate, but it is always visible. |
| Pass-count amnesia | The verifier receives the pass number and earlier verdicts. Pass 2 only confirms closure and checks the fixes, plus any leak; from pass 3 only a reproduced catastrophe blocks — a real security, secret, data or isolation leak, loss or corruption of real data, or core user behavior completely broken or unusable — and everything else, cosmetic mismatches included, becomes `PASS_WITH_MINOR_FINDINGS` or a follow-up Spark. |

Three things deliberately do not change: real security, secret, data and isolation leaks block at every pass — pass 1, pass 2 and pass 3 onward, even when the leak predates the change — and neither the cap nor failure-model scope overrides that, so a real leak may cite the safety rule directly even when the written failure model omitted that boundary; proof still runs on the real path, never on mocks or green CI; and a wrong failure model is escalated to the human operator as a question about intent rather than patched around.

## Why this is a bitter-lesson design

It encodes incentives and invariants, not a checklist of edge cases. A stronger model under this contract finds real defects faster and still converges, because what bounds the review is the failure model and the pass cap, not the reviewer's imagination. The same contract applies to any harness and any model pair.

## How to tell it works

Count, in fresh traces, passes to convergence and net lines added per review pass after the first. Both should fall without an increase in post-merge regressions. If regressions rise, the failure models are being written too narrowly; fix them there, not by reopening the gate. The [`trace-mining`](../skills/trace-mining/SKILL.md) skill owns that measurement, and the [`reflect`](../skills/reflect/SKILL.md) loops keep the verification suite itself lean.

Named credit for the ideas here lives in [`ATTRIBUTION.md`](../ATTRIBUTION.md).
