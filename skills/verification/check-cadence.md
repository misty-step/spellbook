# Check cadence (US-023, ADR 0029)

Before landing a slice, branch from `origin/verified` (or the default branch) and
run `./scripts/check fast`, affected `./scripts/check verify --changed`, and the
changed real consumer path using [Verification](SKILL.md). PR CI queues,
independent PR reviewers and PR bots are never merge gates. After a repair,
recheck affected criteria and regressions; reference still-valid proof.

## Standard `./scripts/check` contract and budgets

Every repository exposes one `./scripts/check` entrypoint enforcing zero-sum
wall-clock budgets and fail-closed surface closures (`git ls-files` coverage):

- `./scripts/check fast` (`<= 120s` hard budget): build, types, lint and fast unit/contract checks.
- `./scripts/check verify [--changed [base]] [--surface <name>] [--shard <i>/<n>]` (`<= 300s` per surface or shard hard budget): real-path surface checks, skipping unaffected surfaces on `non-exec` diffs (`<5s`) and failing closed to all surfaces on `shared` or unmapped paths.
- `./scripts/check doctor`: environment prerequisites, zero unmapped tracked files, and zero `on: pull_request` heavy CI workflows or active PR review bots.

Breaching `120s` or `300s` fails non-zero (`check_budget_exceeded`). Fix slow
checks in the same slice by loading pre-baked state fixtures, collapsing
combinatorial UI loops, parallel sharding (`--shard`), or pruning redundant checks
through [test-audit](../test-audit/SKILL.md)—never by raising budgets without a
recorded decision.

## Coalesced `refs/heads/verified` sweeps and flake quarantine

After landing on trunk, coalesced single-flight sweeps test integrated `main`
against affected surfaces and fast-forward `refs/heads/verified`. On a red
trunk sweep:

1. Retry the failing shard once on the exact tree. If retry passes, advance
   `verified` and log a flake event; `>= 2` flakes in 7 days is a blocking defect
   to repair or delete (blind multi-retry configuration is prohibited).
2. If retry fails, bisect `verified..HEAD` first-parent history across parallel
   [Boat workers](../boat-workers/SKILL.md) and automatically revert the offending
   red-transition commit (capped at two consecutive reverts before holding the train).

## Pinned-SHA release trains and Merkle proof receipts

Before deployment, pin one concrete candidate SHA (`refs/heads/verified` or
landed `main`) for the release train so new commits wait for the next train
instead of resetting an active countdown. Consume matching proof receipts
(`(surface, surface_input_merkle_sha, shared_core_merkle_sha, boat_snapshot_id, check_runner_sha, exit_code)`)
minted only by clean-checkout non-author runners, or run fast cached `./scripts/check`
directly when no valid receipt covers the candidate. Commission the single
release assessment limited to critical correctness and security, deploy, advance
`refs/heads/verified` on standalone repositories, and run the live journey.

Before deleting or rescheduling a check, name the consumer failure it catches
and where that proof will run. Keep independent contracts at their owner boundary
and keep maintained fixtures—not generated video or run output—out of functional
pass/fail coupling (`MIS-1115`).

Done when `./scripts/check doctor`, `fast`, affected `verify --changed` and the
real path pass within budget before merge, `refs/heads/verified` advances only
from clean non-author proof, and every retained check fits one named trigger. A
skipped required check is a gap, not a green result.
