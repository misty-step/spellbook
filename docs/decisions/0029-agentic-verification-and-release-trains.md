# 0029: Agentic verification, surface closures and release trains

Status: accepted, 2026-11-14.

Refines [0023](0023-live-verification-and-release-gate.md) for high-concurrency agent output, adding a universal `./scripts/check` contract, latency budgets, fail-closed surface closures, three check-authoring laws, coalesced `refs/heads/verified` sweeps and pinned-candidate release trains while superseding its "CI runs only at release" wording where automated post-land trunk sweeps run. Preserves [0023](0023-live-verification-and-release-gate.md)'s removal of PR CI, per-PR review gates and agent run caps.

## Measured root cause

Agent-generated suites and legacy triggers failed along three failure modes observed on live repositories on 2026-11-13–14:

1. **Unbounded per-change waste on non-executable diffs.** In `moomooskycow/team-rocket`, a 17-line `AGENTS.md` edit triggered `Private build and boot` on both `pull_request` (`29m 29s`, PR `#181`) and `push` to `master` (`59m 04s` queued behind itself), alongside PR `#180` (`29m 27s`, `job/132304337100`). Across `1,767s` in that job, runner setup plus building the ROM took `70s` (`4.0%`) while 43 serial full-campaign playthroughs with `QA_FILM=1` burned `1,697s` (`96.0%`). Running everything unconditionally on `pull_request` and `push` made trivial edits pay full campaign cost.
2. **Trunk interaction regressions without an isolation cursor (`MIS-1115`).** `misty-step/conductor` PRs `#23` (`74b1079`, source-anchored `test/wiki.test.mjs`) and `#77` (`acf4a1c`, `src/factory.js`) were each green in isolation, collided after landing on `main` across 6 wiki snapshot checks, and caused three downstream verification runs (`#88`, `#89`, `#93`) to rediscover an already-red trunk.
3. **Release-train starvation (`MIS-1072`).** Resetting a 15-minute release countdown whenever mutable `main` advances prevents deployment whenever landing rate exceeds four merges per hour, while rebuilding from scratch in release CI duplicates proof already completed on clean isolated runners.

## Decision

Adopt a three-stage verification and release topology across Misty Step repositories, keeping [ship-loop](../../skills/ship-loop/SKILL.md) free of pre-merge PR CI queues and review bots:

```text
slice builds from origin/verified (fallback: default branch)
  → pre-land: ./scripts/check fast + ./scripts/check verify --changed + real-path proof
  → land directly (squash-merge PR or pre-reviewed direct push-to-main)
  → post-land: coalesced single-flight sweep tests main HEAD → fast-forwards refs/heads/verified
  → release train: pins one concrete verified SHA for check/receipt validation + countdown → deploy + live journey
```

1. **Standard `./scripts/check` entrypoint and zero-sum wall-clock budgets.** Every product repository exposes `./scripts/check` with three subcommands and self-enforced wall-clock limits:
   - `fast` (`<= 120s` P95): build, types, lint and fast unit/contract checks.
   - `verify [--changed [base]] [--surface <name>] [--shard <i>/<n>]` (`<= 300s` per surface or shard): real running-product verification across declared surfaces.
   - `doctor`: environment prerequisites, complete file-closure mapping check and rejection of `on: pull_request` heavy CI or active PR review bots.
   Exceeding `120s` or `300s` fails non-zero (`check_budget_exceeded`). Adding new coverage without blowing the budget requires checkpointing state, sharding in parallel or pruning redundant tests under [test-audit](../../skills/test-audit/SKILL.md), unless a repo decision record documents an owner-approved exception.
2. **Fail-closed surface input closures.** Every tracked `git ls-files` path belongs to `non-exec` (`<5s` lint cutoff), one or more named runtime `surfaces`, or `shared` (triggers every surface). Unmapped files fail `doctor` and fail closed to all surfaces during `--changed`.
3. **Three check-authoring laws.** Under [verification](../../skills/verification/SKILL.md): (a) jump straight to decision points via deterministic state fixtures after one cold-onboarding smoke journey; (b) test parameter combinations at the narrowest state/data boundary and run one representative through the full runtime surface unless surface logic branches on the variant; (c) assert observable consumer behavior rather than source-text snapshots or generated docs (`MIS-1115`).
4. **Coalesced `refs/heads/verified` cursor, single-retry flake quarantine and parallel bisect auto-revert.** Builders and verifiers branch from fast-forward-only `refs/heads/verified` (falling back to the repository's default branch where absent; updated by coalesced single-flight trunk sweeps where active, or by the release pipeline on standalone repositories). On a red trunk sweep: retry the failing shard once on the identical tree; if Retry passes, advance `verified` and record a flake defect (`>= 2` flakes in 7 days blocks until fixed or deleted; blind multi-retry config is prohibited); if Retry fails, parallel [Boat workers](../../skills/boat-workers/SKILL.md) bisect `verified..HEAD` first-parent history and automatically revert the red-transition commit (bounded to 2 consecutive auto-reverts before holding the train).
5. **Clean-runner Merkle proof receipts and pinned-SHA release trains.** Release gates accept cached proof receipts `(surface, surface_input_merkle_sha, shared_core_merkle_sha, boat_snapshot_id, check_runner_sha, exit_code)` minted solely by isolated, clean-checkout non-author runners, falling back to running `./scripts/check` directly when no matching receipt exists. Release trains lock one candidate SHA so concurrent landings enter the next train rather than resetting an active countdown.
6. **Clean layer separation.** `mistystack` owns the method skills, `./scripts/check` contract and [Foundation conformance](../../skills/foundation/checklist.md); `misty-step/conductor` owns `verified` sweep scheduling, parallel bisection/auto-revert, receipt storage and pinned-SHA release trains; private `misty-step/workstation` and `runners` own Boat snapshot builds and signing keys.

## Consequences

- Trivial `non-exec` edits (`AGENTS.md`, `SPEC.md`, docs) clear verification in `<5s` while touching shared or unmapped files still forces full-surface checks cleanly.
- Author iterations stay fast on slice workers without turning release pipelines into 30-minute rebuild bottlenecks.
- Standalone repositories without an active sweep daemon suffer zero adoption tax: their release pipeline verifies directly if needed and fast-forwards `refs/heads/verified` on publish.
- **Revisit if:** any surface cannot fit inside `300s` per shard through checkpointing and sharding, requiring a recorded repo-level budget exception.
