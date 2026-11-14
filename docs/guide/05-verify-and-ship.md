# 5. Verify and ship

[Verification](../../skills/verification/SKILL.md) drives the real running app or
installed artifact. A repository without a verification skill gets one written by
[its recipe](../../skills/verification/recipe.md). Consequential ordering, concurrency
and durability get a [formal check](../../skills/verification/SKILL.md#formal-properties) as well. A test suite or a successful send alone does not prove the journey.

[Ship-loop](../../skills/ship-loop/SKILL.md) owns delivery: branch from `origin/verified` (falling back to the default branch), run `./scripts/check fast` (`<= 120s`), `./scripts/check verify --changed` (`<= 300s` per surface or shard) and real-path proof yourself, and squash-merge without PR CI or PR review bots. Do not rebase just to catch up. Resolve actual conflicts and repeat their affected path.

Coalesced single-flight sweeps keep `refs/heads/verified` green via single-retry flake tracking and parallel bisect auto-revert. Each release train pins one candidate revision (never resetting on concurrent trunk landings), verifies clean-runner Merkle proof receipts or runs fast checks directly alongside one assessment limited to critical correctness/security, publishes and deploys the checked artifact, advances `verified` where no sweep daemon runs, and uses
[release-watch](../../skills/release-watch/SKILL.md) to prove serving identity and
a critical live journey. No PR CI or per-PR approval process gates landing.

Use [test-audit](../../skills/test-audit/SKILL.md) for meaningful contract coverage.
For instruction comparisons, [agent-design](../../skills/agent-design/SKILL.md#instruction-eval)
owns blind evaluation, not a shipping judge. Keep the slice's prepared
[Boat worker](../../skills/boat-workers/SKILL.md), stop it when idle and delete it
when finished. [Watchdog](../../skills/watchdog/SKILL.md) supervises open-ended
agents until acceptance and cleanup, not a deadline.

The [release convention](../release-convention.md) owns versions and generated
notes. Report only the merged, published, artifact or live boundary actually
observed, and say what the check did not cover, under
[Misty's reporting rules](../../skills/misty/SKILL.md#reporting).

Next: [Principles](06-principles.md).
