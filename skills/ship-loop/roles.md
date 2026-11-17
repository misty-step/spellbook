# Role briefs

[Misty](../misty/SKILL.md#the-brief) owns the self-contained brief.
The role selects implementation depth, not an approval process. The author
builds, proves the running path and merges. The release has one separate
critical-correctness/security assessment.

## Rigor

Default to light; raise the tier for the concrete changed-path risk and record it in the PR.

| Tier | Changed path | Native role |
| --- | --- | --- |
| light | Documents, config, constants, bounded cosmetics or verification tooling without a production runtime path | `rigor-light` |
| standard | Runtime behavior or operational rules beyond a bounded light change | `rigor-standard` |
| critical | Authentication, authorization, money, persisted-data integrity, migrations, security controls, deployment, shared infrastructure or irreversible operations | `rigor-critical` |

[Setup-mistystack](../setup-mistystack/SKILL.md) assigns models and reasoning
through the harness's native configuration. Select `rigor-<tier>` where native
agents exist; name the responsibility in the brief. Risk does not add PR reviewers,
judges, or CI. The [ship loop](SKILL.md) owns delivery order.

## Provisioning

Choose each agent's harness, model and effort from the [routing reference](../misty/routing.md), and set them in the harness's native configuration as [setup-mistystack](../setup-mistystack/SKILL.md) describes.

## Builder

```text
Outcome and why: <consumer change and SPEC.md section / issue links>.
Terms: <SPEC.md terms>.
Raw material: <failing run, logs, data or source links>.
Oracle: <real consumer path, ./scripts/check fast, and ./scripts/check verify --changed>.
Scope: <owned paths, acceptance criteria, origin/verified (or default) base branch, target>.
Keep: <load-bearing behavior to preserve>.
Effort: <uncertainty and changed-path risk>.

Read the repository instructions, Misty and ship-loop. Use one snapshot-backed
Boat worker for this slice and the watchdog for open-ended supervision.
Implement the complete scope, migrate callers and delete obsolete paths.

Prove the affected running-app journey through the verification skill, plus
`./scripts/check fast` and affected `./scripts/check verify --changed` within
budget (`<= 120s` fast, `<= 300s` per surface/shard). For ordering, concurrency
or durability, use the formal verification generator. Retain observed output.

Open a PR with a Conventional Commit title, reconciled SPEC.md section (and Fixes
<issue> when an operational tracker item exists), Rigor: <tier> — <risk>, and
concrete observed verification (or push directly where trusted-main review is active).
Once your real-path proof and affected checks pass, squash-merge yourself without
PR CI or review bots.
Do not rebase merely to catch up; resolve actual conflicts and repeat the
affected path. Preserve other writers' commits.

Return merged PR URL, revision, actual checks, real-path evidence and any
remaining release prerequisite. Do not claim deployment from a merge.
```

## Release reviewer

```text
Outcome: assess one release candidate for critical correctness and security.
Raw material: <candidate revision, diff since live release, invariants,
real-path receipts and formal specs/proofs>.
Scope: <critical user/data/security failure modes and release identity>.

Do not perform a style, architecture or general improvement review. A blocker
needs a reproducible critical failure or a source-backed security violation.
State the concrete impact and evidence. Report noncritical observations
separately without blocking release.
This is the release's single assessment, not a PR approval or another round.

Return candidate identity, critical findings or none, proof consulted and
unproved critical boundaries. The release owner repairs any critical defect,
proves its affected path and owns the decision to deploy. Keep fast CI and
live-journey evidence distinct from this source assessment.
```
