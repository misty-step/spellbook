# 0023: Verify the running product, merge, then gate the release

Status: accepted, 2026-11-03. Owner directive from Phaedrus. Refined on 2026-11-14 by
[0029](0029-agentic-verification-and-release-trains.md) for `./scripts/check`
budgets and surface closures, `refs/heads/verified` trunk sweeps and pinned-SHA
release trains (superseding only the release-only CI phrasing below where
automated trunk sweeps run). Supersedes the
shipping, execution-lifecycle and supervision provisions of
[0022](0022-pstack-governs-owner-rulings.md), the delivery machinery in
[0020](0020-github-and-linear-replace-entire.md) and
[0019](0019-entire-is-the-forge.md), and the corresponding historical Foundation
review obligations. Pstack remains the baseline outside these explicit changes.

## Measured root cause

The source inspection found a method that trained agents to wait for process
rather than finish their own real-product verification:

- `skills/ship-loop/SKILL.md`, `judge.md`, `roles.md` and `merging.md` required an
  independent ruling before every authored change could merge. The helper and
  its tests enforced a PR-comment state machine, a repair allowance, repeated
  reporter/judge dispatches and patch-identity carries after stacked rebases.
- Historical Foundation decisions 003/006 required independent review of every
  PR. The feature and vertical-slice procedures and USER_STORIES.md carried the
  same assumption. Newly vendored pstack delivery playbooks reintroduced
  per-PR verifier verdicts, review/CI waiting and mandatory rebase choreography.
- The installed `rules/core.md` and Boat skill required a new environment for
  each heavy command, reinstalling toolchains instead of keeping a slice's
  prepared worker. ADR 0022 subsequently removed the public provider route,
  so the newer owner directive restores it with a different lifecycle.
- The coordinator identified OMP's `task.softRequestBudget=200`: wrap-up at
  200 requests and forced stop at 300. The coordinator set it to `0`. No written
  forty-minute agent limit was found. This is a reported native-runtime cause,
  not a newly measured benchmark or a reason to invent another timer.
- While this repair was in flight, the published
  [d450f02 delivery defaults](https://github.com/misty-step/mistystack/blob/d450f02e46527717c35db9b8436b3a778284d58a/skills/ship-loop/SKILL.md#delivery-defaults)
  explicitly told agents to give each role a deadline. That is a measured
  written agent cap even though it names no forty-minute duration. The cutover
  removes this intervening instruction as well as the earlier native budget.

The repeated behavior followed executable instructions and enforced tools.
Replacing a summary alone would leave those causes in the agent's next path.

## Decision

The delivery method is:

```text
build the slice
  → author verifies the real running app or installed artifact
  → merge without CI or review
  → release gate: fast CI + one critical-correctness/security assessment
  → publish/deploy the checked artifact
  → read back live identity and exercise a critical live journey
```

[Ship-loop](../../skills/ship-loop/SKILL.md) is the single delivery authority.
[Verification](../../skills/verification/SKILL.md) uses pstack's canonical
`create-verification-skill`; consequential ordering, concurrency and durability
use `create-formal-verification-skill` for explicit specs, properties and proofs.
A passing unit test, mock, build or sender-side success does not replace the real
consumer path.

There is no authored-change judge, PR CI requirement, repair-round ledger,
review cycle or requirement to rebase merely because trunk advanced. Resolve an
actual merge conflict and re-prove its affected behavior. Remove obsolete
procedures, scripts, tests and current links in the same cutover. Record inherited
pstack changes as exact patches, including hash-checked removals, so a future
vendor refresh cannot silently restore them. Historical release notes remain
history; old decision records identify their supersession and do not supply a
second active shipping procedure.

CI runs only in the pre-deploy release workflow, never on PRs or pushes. Cache
toolchains and dependencies, run each maintained contract once, build the static
artifact once and deploy those bytes. Slow CI is a defect to repair, not accepted
waiting time. Review the release once for critical correctness/security only;
noncritical improvements become work items. A critical defect stops deployment
and gets a targeted repair and real-path proof, not another broad review cycle.
GitHub merge settings must not require checks or reviews.

## Execution and supervision

[Boat workers](../../skills/boat-workers/SKILL.md) owns one worker per slice.
Save the clean toolchain with `boat snapshot <id> <name>` and start from it with
`boat new --from <name>`. Stop the worker when idle, resume for the same slice,
retain its evidence and delete it at slice end. Fresh-per-command isolation is
for untrusted code, not routine builds or test commands. Credentials do not go
into snapshots; hostile-code egress and privilege controls remain required.

[Watchdog](../../skills/watchdog/SKILL.md) replaces agent run caps with periodic
supervision using the harness's native observations and controls. Compare the
agent's observable actions with its brief: progress, drift, stalls and wasted
spend. Steer a recoverable run; interrupt only the exact failed run and restart
with a self-contained brief when needed. A separate Boat agent may supervise
through `boat prompt`. Elapsed wall-clock time alone never ends an agent's work.
Idle resource stopping and bounded individual probes are not agent deadlines.

## Release and installed-consumer proof

Mistystack keeps Landmark's generated-notes PR and immutable publication path.
The dispatched release prepares and merges generated notes without PR checks,
checks one landed candidate, publishes it, and deploys the artifact already built
by that check. The dispatcher supplies the source revision and the URL of the
single critical assessment. The site checks serving identity and the delivery /
watchdog reading journey. [The release convention](../release-convention.md)
owns the commands and evidence boundary.

After publication, refresh the native installed plugin through
[setup-mistystack](../../skills/setup-mistystack/SKILL.md). Observe a fresh
session's core and skill loading, not just the catalog version. Audit maintained
source and installed skills for surviving obsolete guidance; report excluded
historical/provenance matches distinctly from active instructions.
