---
name: verification
description: "Before merge, prove changed behavior against the real running app; generate missing real-path or formal verification skills and maintain their check cadence."
metadata:
  owner: phaedrus
  prevents: "'Fix still fails / regression' (36 corrections); evidence-packet loaded in 12 audited sessions; changed-path scope repaired in mistystack PR #455."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-11-27"
---

# Verification

Build, drive the changed real consumer path with `./scripts/check fast` and
affected `./scripts/check verify --changed`, then land without PR CI queues or
review bots. The [delivery procedure](../ship-loop/SKILL.md) combines coalesced
post-land `refs/heads/verified` sweeps, clean-runner Merkle proof receipts and
one critical-correctness/security assessment on a pinned release candidate,
followed by deployment and a live journey check.

## 1. Name the proof

Tie each changed behavior to its story/request criterion, exact scenario,
outside check and expected observation before editing. Name the exact command,
journey or measurement. Choose the shortest real consumer path that can reject
the plausible defect; a mock, self-report or green unit suite alone is not that
boundary. For fixes, comparisons, persistence and performance, capture a baseline
with the same fixture; show the check rejecting the relevant base defect or an
injected fault, then passing on the candidate.

- **Jump to state via fixtures, never replay setup.** Keep one cold-onboarding
  smoke journey from initial boot or sign-up; every feature check loads a
  deterministic pre-baked state fixture (seeded DB snapshot, emulator save-state,
  pre-authed browser state) right before the decision point under test.
- **Collapse combinatorial loops.** Prove parameter combinations at the narrowest
  state or data boundary and drive one representative through the full runtime
  surface unless surface logic itself branches on that variant.
- **Assert observable behavior, never source text (`MIS-1115`).** Keep source-byte
  assertions and generated-doc drift checks out of functional `fast` and `verify`
  suites so unrelated slices do not break on untouched source files.

- Product journey: before merge, drive the built, running app through the
  repository's verification skill and feature map in production-like isolation. Cover success,
  rejection and recovery where the change reaches them. Read consequential state
  at its owner; sender success is not delivery. After deployment, repeat the
  changed journey on the live surface within authorized scope.
- Documents: read changed rendered/published text and check affected links/commands.
- Installed guidance/configuration: install, load and read the changed result.
- CLI/library/internal change: exercise the real consumer or composition boundary.

For a defect, trace its mechanism and fix the failure class at the highest layer
that can hold it: structure, automated check, guidance, then human review. Use
[test-audit](../test-audit/SKILL.md) to retain one primary proof per consumer
contract inside zero-sum `./scripts/check` budgets (`<= 120s` `fast`, `<= 300s`
per `verify` surface or shard).

Widen for shared config, lockfiles, auth, migrations or uncertain impact.
Ordering, concurrency and durability changes need the applicable formal check
below as well as running-app proof. Required skipped or unavailable checks leave
proof incomplete; report the exact limit instead of substituting an easier check.

## 2. Drive and inspect

When the repository has no verification skill, write one by [recipe.md](recipe.md) and prove it before relying on it. Keep one canonical source exposed through the active harness; repository instructions stay in `AGENTS.md`. A documents-only change does not inherit missing product infrastructure.

Its Accounts section follows the [QA sign-in contract](#qa-sign-in-contract);
mark unauthenticated surfaces n/a. Its Evidence section follows [evidence.md](evidence.md).

Delegate only under [Misty's delegation rules](../misty/SKILL.md#delegation). Place execution through
the [Boat worker procedure](../boat-workers/SKILL.md). Use authorized disposable
data and clean only what the run created. Capture action and result, inspect each
artifact, and publish proof by [evidence.md](evidence.md). After a repair, re-drive
the affected criteria and fix-introduced regressions; reference unchanged proof.

Done when the original real path passes, the linked observation identifies the
checked revision, and that revision and the item's Done status are on the shared
remote before anyone is told it is done. An exact unproved claim and missing
prerequisite still leave proof incomplete. Follow
[Misty's reporting rules](../misty/SKILL.md#reporting).

## Formal properties

Ordering, concurrency and durability are where tests pass and users still lose
data, so model them. Write the state machine down first: its states, events and
the transitions that must never happen. Then check it with a tool that explores
every interleaving. Keep the specification, its rerun command and its mapping to
real code in the repository's verification skill.
Choose the costly user promise that tests can miss, not the easiest target.
TLA+ is the default for bad event orders; use a code-level verifier or proof
assistant when the property concerns the implementation for all inputs.

Keep formal specifications separate from their proofs. Bend-2's
[laws/proofs convention](https://github.com/bendlang/bend/blob/ea66e0044fc1632c28e35b7b0f0d2263d77e3449/guide/GUIDE.md#laws-and-proofs)
is one implementation-level option where the language and property fit, not
evidence about a different production implementation. Map each property and
atomic step to real code. Record tool version, coverage, assumptions, bounds,
one rerun command and the last confirmed source commit. Show the check rejecting
a scratch defect in the covered real code, then restore it and recheck. Do not
weaken a property to pass or claim a bounded model proves the whole system.
Draw the checked model as a statechart when a reader needs to follow it, and
replay counterexamples against the real app or code. Formal proof supplements,
never replaces, the running consumer path.

## QA sign-in contract

For a journey with sign-in, use a dedicated QA identity. Prove production sign-in
and the required owner/admin role through the real app. A sent email, HTTP 200
or login without the required role is not that proof. Missing access is
`owner sign-in UNPROVEN: needs <access/role>`; continue reachable proof and name
the blocked criterion.

## Commissioned upkeep

For a verification-skill or feature-map audit, follow the upkeep section of
[recipe.md](recipe.md). Resolve the
target from the request and repository; ask only if they cannot disambiguate it.
Combine small related source slices; [delegate](../misty/SKILL.md#delegation) only genuinely independent ones. A feature not reached stays unverified, with the
exact prerequisite and attempted route, never passed.
For check placement, deletion or schedule repair, use [check-cadence.md](check-cadence.md).
For recurring product QA, agents use distinct user personas to walk pre-release
and live SPEC stories and file bugs/friction in the owned backlog. Such walks
prove behavior, not demand or benefit; compare actual use to the initiative's
outcome criterion before continuing, revising or stopping it.
