# spellbook

Portable craft and philosophy for coding agents. Formerly `mistystack`.

Models keep getting better; procedures rot. Spellbook keeps only what compounds as capability grows: **present-tense intent**, a few **standing invariants**, short skills that state **what and why**, and **deterministic scripts** for anything a machine can check. Everything else is left to the model.

Read it at <https://stack.mistystep.io> · the reasoning lives in [`docs/philosophy.md`](docs/philosophy.md).

## The idea

- **Intent outlives code.** Each repository keeps an **Active Folio** — `PRODUCT.md` (observable outcomes, domain terms, non-goals; no implementation lock-in), plus `DESIGN.md` for UI — as living present-tense truth while git owns history. Change the Folio first, reconcile code against it, and prove it complete with a clean-room rebuild from the Folio alone.
- **Say only what is unique.** Universal and surface-class baselines (Web App, Native/Desktop, CLI/Service, Evidence/Artifact) live in Spellbook, so a repository's Folio states only what makes that product itself.
- **Proof beats assertion.** Done means verified on the real running artifact, reviewed by a cold critic from a different model family — never mocks, summaries, or green CI alone.
- **Scripts beat prose.** When a check repeats, it becomes code, not another paragraph.

## What ships

- [`rules/core.md`](rules/core.md) — six always-on standing rules.
- [`skills/`](skills/) — seven short skills in open Agent Skills format: [`misty`](skills/misty/SKILL.md) (the core loop), [`foundations`](skills/foundations/SKILL.md), [`design`](skills/design/SKILL.md), [`define-product`](skills/define-product/SKILL.md), [`security-audit`](skills/security-audit/SKILL.md), [`release-watch`](skills/release-watch/SKILL.md), and [`resolve-merge-conflicts`](skills/resolve-merge-conflicts/SKILL.md).
- Deterministic scripts — [`misty-check.mjs`](skills/foundations/scripts/misty-check.mjs) (a zero-dependency baseline auditor) and [`extract_conflict_context.py`](skills/resolve-merge-conflicts/scripts/extract_conflict_context.py).
- [`.githooks/`](.githooks/) — TruffleHog secret scanning on commit and push (`./scripts/bootstrap`).
- [`docs/philosophy.md`](docs/philosophy.md) — the why, for humans; never auto-loaded into agent prompts.

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
```

List intentional legacy exceptions in a repo-root `.misty-check.allow` (one path or glob per line, `#` comments allowed).

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
