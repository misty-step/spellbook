---
name: ship-loop
description: "For confirmed delivery scope: build, prove the real running path, merge, then release through fast CI and one critical review."
metadata:
  owner: phaedrus
  prevents: "Per-PR review and CI queues displaced real-app proof, repeated rebases and duplicated work; owner correction, 2026-11-03."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-11-27"
---

# Ship loop

Build → verify on the running product → merge → release gate → deploy → verify live.
The author owns the first proof. CI and review belong only to the pre-deploy
release gate, not a PR or push. Reconcile behavioral intent from
[SPEC.md](../spec/SKILL.md) and link the repository's operational tracker from
[Foundation article 2](../foundation/checklist.md#article-2) when an external
or cross-repository issue exists.

## 1. Settle and build the slice

Carry confirmed intent forward. Resolve unsettled product intent with the owner
through [grilling](../grilling/SKILL.md) into `SPEC.md`; planning execution of a
settled outcome is ordinary work under [Misty's loop](../misty/SKILL.md#the-loop).
Give the builder [Misty's briefing contract](../misty/SKILL.md#the-brief), owned
paths, a base branch, acceptance criteria and the
[risk-appropriate role](roles.md#rigor). Keep independently useful slices separate
and sequence only genuine dependencies. Use
[boat-workers](../boat-workers/SKILL.md) for one snapshot-backed worker per slice
and [watchdog](../watchdog/SKILL.md) for open-ended supervision.

Implement the smallest complete change. Migrate every caller and delete obsolete
paths. On UI and product-surface slices, reconcile both `SPEC.md`
(implementation-free target state per [spec](../spec/SKILL.md)) and `DESIGN.md`
before proof. Before proving, [cut the draft](../misty/principles.md#cut-the-draft-before-proof):
if it accumulated wrappers, parallel state or retained legacy code, rewrite it
from first principles first. Open the PR body with a one-sentence `## Why` in the user's terms. Record
the reconciled `SPEC.md` section (plus `Fixes MIS-<n>` when closing an operational
tracker item), `Rigor: <tier> — <changed-path risk>`, the observed proof and
`Unproved: <claims|none>`. A change
that cannot be undone after release (a migration, a deletion, a published
contract) is standard rigor or higher and carries its rollback or restore proof. The PR record's **Merge Danger** section carries
[merge-risk](../merge-risk/SKILL.md)'s output: the overall verdict and every
per-category verdict with its risk-increasing gaps. A generator-only release PR
contains only generator output and needs no invented product story.

**Complete when:** the specified behavior exists and its real consumer can run.

## 2. Prove and merge

Follow [verification](../verification/SKILL.md). Start the actual app or installed
artifact and exercise the affected user journey, including its relevant rejection
and recovery. When the repository lacks that procedure, write it as verification describes.
For ordering, concurrency or durability, add its formal check and retain the
properties, assumptions, bounds and proof result.
Run the narrow affected native checks on the slice's worker; a unit test alone
is not real-path proof. Fix a failed acceptance criterion and repeat its affected
path until it works. Record what actually ran and what remains unproved.

Once that proof passes, squash-merge the PR yourself with a Conventional Commit
title. Do not request a review, start CI, wait for checks, or add a judge.
Do not rebase merely because trunk advanced. If the forge reports a conflict,
merge the target branch into the owned branch, use
[resolve-merge-conflicts](../resolve-merge-conflicts/SKILL.md), running its script
from the installed skill directory and not from the working repository, and
repeat the affected real path before merging. Prefer independent branches to stacked-merge choreography.
Confirm the PR reads `MERGED` against the intended target; queued is not merged.

**Complete when:** the author has exercised the changed behavior and the PR is merged.

## 3. Release gate

For a deployable or installable change, run the repository's release path on one
candidate. CI runs here only: fast, focused checks with cached toolchains and
reused build artifacts. Remove duplicated setup and redundant reruns; repair a
slow gate instead of normalizing its delay. No CI runs on PRs or pushes.

Commission **one** review of the release candidate, limited to critical correctness
and security. Give that reviewer the release diff, invariants, real-path and formal
proof, and concrete risk. Include a [merge-risk](../merge-risk/SKILL.md) verdict
for this candidate, with its per-category verdicts, in that same assessment.
It is one release assessment, not a per-PR review cycle or an additional review.
Report noncritical observations separately without blocking deployment or
inventing a backlog outside `SPEC.md`. A critical defect stops deployment:
repair it and prove the affected behavior; do not restart a broad review process.

Publish and deploy the candidate that passed the fast checks and critical review,
using the repository's native release/version/rollback mechanism. Generated notes
remain the generator's output; [the release convention](../../docs/release-convention.md)
owns that path. An internal change with no published artifact records `no deploy`
and skips release queries rather than inventing a service.

**Complete when:** the release candidate has fast CI evidence and its single
critical-correctness/security assessment, and the native pipeline deployed it.

## 4. Verify live and finish

Use [release-watch](../release-watch/SKILL.md) to read back the serving release
identity and run a critical live journey. Follow its authorized recovery path if
that fails. Collect evidence, stop idle workers and delete each slice's worker
when its deliverables are retained. The watchdog ends only after owned work and
resource cleanup finish, not after elapsed time.

Report the consumer outcome, merged PRs, release, exercised checks and remaining
blockers under [Misty's reporting rules](../misty/SKILL.md#reporting).
Distinguish `merged`, `released`, `artifact verified` and `live behavior proven`.

**Complete when:** the deliverable meets [Conformance](../foundation/checklist.md#conformance); an unreachable prerequisite remains explicitly unproved.
