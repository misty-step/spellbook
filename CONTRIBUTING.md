# Contributing

Spellbook is a method for coding agents on any harness. Start with [AGENTS.md](AGENTS.md), use
[SPEC.md](SPEC.md) terms, and name the reconciled section in [SPEC.md](SPEC.md).
Fleet machinery belongs in private `misty-step/workstation`.

Keep the smallest useful change. Follow the [skill frontmatter convention](skills/agent-design/SKILL.md#skill-frontmatter),
retain source notices, and migrate every caller when a fact moves.
Human instructions belong in [docs/guide/](docs/guide/); upstream reading belongs
in [docs/exemplars.md](docs/exemplars.md), not an installed skill pack.

Run `./scripts/bootstrap` once for repository secret-scanning hooks. Prove the
affected running consumer through
[verify-mistystack](.agents/skills/verify-mistystack/SKILL.md), using a snapshot-backed
Boat worker for portable checks. Keep generated proof outside the checkout and
link the checked revision, actions and observed results from the PR. Merge when
your proof passes, without CI or review. Fast CI and one critical assessment run
only at the pre-deploy release gate.

Use a Conventional Commit title and include the reconciled `SPEC.md` section
(plus `Fixes` issue when an operational tracker item exists), the rigor tier and
reason, Merge Danger, and diff size in the PR. Keep CHANGELOG.md generated;
Landmark owns the release path described in [docs/release-convention.md](docs/release-convention.md).
