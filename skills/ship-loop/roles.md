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

Before launching an agent, choose its harness, model class and effort from the
agent's role and the work in front of it. Concrete models, accounts, quotas and
reserved models are host facts. They live in the host's provisioning card, which
its standing context names, and that card binds each class below to a real seat.
Keep native assignments in harness configuration as
[setup-mistystack](../setup-mistystack/SKILL.md) describes.

| Model class | What it is for |
| --- | --- |
| frontier | Planning, design, review, second opinions, recompiles and critical work |
| build | Multi-file features with a clear brief |
| reader | Long-context or multimodal reading and synthesis |
| fast | Lookups, readbacks and fully specified small slices |

| Agent | Class | Effort |
| --- | --- | --- |
| Chief of Staff | frontier | medium, interactive |
| Project owner | frontier or build | high, long and unattended |
| Understanding lane | reader or build | medium |
| Builder, light tier | fast | low |
| Builder, standard tier | build | medium |
| Builder, critical tier | frontier, never weaker than the dispatcher | high |
| Release reviewer, second opinion, recompile grader | frontier from a different model family than the author's | high |
| Lookup or readback | fast | low |

- **Vendor harness.** Run a vendor's models in that vendor's own harness, and
  other model families in a neutral harness. In the November 2026 Conductor
  rebuild trial, the only seat that ran a vendor model through a neutral
  harness was the only build that would not start on its target runtime, the
  only metered bill and the only one to hang.
- **Effort.** Interactive work starts at medium, long unattended work at high
  and fully specified slices at low. Go above high only where a measured gain
  justifies the tokens, and re-check the choice when the model changes. Effort,
  not prompt wording, sets how much the model thinks.
- **Fallback.** When a seat fails or runs out of quota, retry once on the next
  class up or on another account. A host's reserved models are not a fallback
  for non-critical work.
- **A usage limit is missing evidence, not a failure.** Record it, rerun once,
  and report the gap rather than a score.
- **Name the seat.** A launch and its report name the harness, model and effort
  that actually ran.

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
