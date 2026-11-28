# spellbook

Portable craft and philosophy for coding agents. Formerly `mistystack`.

Models keep getting better; procedures rot. Spellbook keeps only what compounds as capability grows: **present-tense intent**, a few **standing invariants**, short skills that state **what and why**, and **deterministic scripts** for anything a machine can check. Everything else is left to the model.

Read it at <https://stack.mistystep.io> · the reasoning lives in [`docs/philosophy.md`](docs/philosophy.md).

## The idea

- **Intent outlives code.** Each repository keeps an **Active Folio** — `PRODUCT.md` (observable outcomes, domain terms, non-goals; no implementation lock-in), plus `DESIGN.md` for UI — as living present-tense truth while git owns history. Change the Folio first, reconcile code against it, and prove it complete with a clean-room rebuild from the Folio alone.
- **Say only what is unique.** Universal and surface-class baselines (Web App, Native/Desktop, CLI/Service, Evidence/Artifact) live in Spellbook, so a repository's Folio states only what makes that product itself.
- **Proof beats assertion.** Done means verified on the real running artifact, checked by a verifier from a different model family on two axes — real-path proof and simplicity — never mocks, summaries, or green CI alone.
- **Scripts beat prose.** When a check repeats, it becomes code, not another paragraph.

## What ships

- [`rules/core.md`](rules/core.md) — six always-on standing rules.
- [`skills/`](skills/) — fourteen short skills in open Agent Skills format: [`misty`](skills/misty/SKILL.md) (the core loop), [`foundations`](skills/foundations/SKILL.md), [`research`](skills/research/SKILL.md) (survey before you design), [`design`](skills/design/SKILL.md), [`design-exploration`](skills/design-exploration/SKILL.md) (distinct directions, judged before human eyes), [`verify`](skills/verify/SKILL.md) (two-axis proof and simplicity review that converges), [`present`](skills/present/SKILL.md) (show, don't tell), [`project-anatomy`](skills/project-anatomy/SKILL.md) (dated snapshots instead of drifting architecture docs), [`trace-mining`](skills/trace-mining/SKILL.md) (recurring corrections become craft), [`reflect`](skills/reflect/SKILL.md) (four maintenance loops that delete as much as they add), [`define-product`](skills/define-product/SKILL.md), [`security-audit`](skills/security-audit/SKILL.md), [`release-watch`](skills/release-watch/SKILL.md), and [`resolve-merge-conflicts`](skills/resolve-merge-conflicts/SKILL.md).
- Deterministic scripts — [`misty-check.mjs`](skills/foundations/scripts/misty-check.mjs) (a zero-dependency baseline auditor) and [`extract_conflict_context.py`](skills/resolve-merge-conflicts/scripts/extract_conflict_context.py).
- [`.githooks/`](.githooks/) — TruffleHog secret scanning on commit and push (`./scripts/bootstrap`).
- [`docs/philosophy.md`](docs/philosophy.md) — the why, for humans; never auto-loaded into agent prompts. [`docs/verification-philosophy.md`](docs/verification-philosophy.md) diagnoses why adversarial critics bloat code and how `verify` fixes it.

## Install

Any Agent Skills harness (Cursor, Codex, Antigravity, pi, OpenCode, …):

```sh
npx skills add misty-step/spellbook -g
```

Then copy [`rules/core.md`](rules/core.md) into your harness's always-on instruction file or `AGENTS.md`.

Claude Code:

```sh
claude plugin marketplace add misty-step/spellbook
claude plugin install mistystack@mistystack
```

The plugin keeps its original `mistystack@mistystack` identifier: Claude Code keys installs by that name, and renaming it would orphan every existing install.

Run `misty-check` directly:

```sh
node skills/foundations/scripts/misty-check.mjs /path/to/repo            # scorecard
node skills/foundations/scripts/misty-check.mjs /path/to/repo --json     # machine-readable
node skills/foundations/scripts/misty-check.mjs /path/to/repo --strict-layout
node skills/foundations/scripts/misty-check.mjs /path/to/repo --strict-observability
```

To run it standalone in another repository, copy `misty-check.mjs` together with its sibling `misty-check-observability.mjs`: the script imports that module and will not start without it.

List intentional legacy exceptions in a repo-root `.misty-check.allow` (one path or glob per line, `#` comments allowed). The observability audit applies to web apps, workers, and services; opt a repository out of a rule that does not fit with an `observability:` line such as `observability:client-errors` or `observability:*`. `--strict-observability` also exits `1` when its scan is incomplete (more than 2,000 scannable files, or an unreadable directory or file), and the baseline health check accepts `/healthz` or `/api/health`.

## Stable names

The rename changes the brand, not the contracts people already depend on: the `misty` skill, `misty-check.mjs` and its flags, `.misty-check.allow`, the `mistystack@mistystack` Claude plugin, and the `stack.mistystep.io` reader all keep working as before. `github.com/misty-step/mistystack` redirects here.

## Verify locally

```sh
./scripts/bootstrap
./scripts/check doctor
./scripts/check fast
node --test skills/foundations/scripts/misty-check.test.mjs
npm --prefix site ci && npm --prefix site run build && npm --prefix site run check
```

## License

MIT — see [LICENSE](LICENSE).
