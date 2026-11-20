# mistystack

A lean, portable engineering method for coding agents: **5 always-on rules**, **7 crisp skills** in open Agent Skills format (`skills/<name>/SKILL.md`), and **deterministic scripts** instead of bloated prose.

Browse the live reader at <https://stack.mistystep.io>.

## What ships

- [`rules/core.md`](rules/core.md): Five standing rules loaded in every session.
- [`skills/misty/SKILL.md`](skills/misty/SKILL.md): Core software-factory loop — real evidence first, strategic design, deterministic scripts, real-path verification, and autonomous delivery.
- [`skills/foundations/SKILL.md`](skills/foundations/SKILL.md): Baseline project-health standards paired with [`misty-check.mjs`](skills/foundations/scripts/misty-check.mjs), a zero-dependency Node baseline auditor (`--json`, `--strict`).
- [`skills/design/SKILL.md`](skills/design/SKILL.md): Visual craft, hierarchy, accessibility, and anti-slop taste invariants.
- [`skills/define-product/SKILL.md`](skills/define-product/SKILL.md): Present-tense `PRODUCT.md` user stories and non-goals with zero implementation lock-in.
- [`skills/security-audit/SKILL.md`](skills/security-audit/SKILL.md): Evidence-backed boundary and exploit verification.
- [`skills/release-watch/SKILL.md`](skills/release-watch/SKILL.md): Merged ≠ live — verify deployed identity and a real user journey.
- [`skills/resolve-merge-conflicts/SKILL.md`](skills/resolve-merge-conflicts/SKILL.md): Compact hunk extraction via [`extract_conflict_context.py`](skills/resolve-merge-conflicts/scripts/extract_conflict_context.py).
- [`.githooks/`](.githooks/): TruffleHog secret-scanning `pre-commit` and `pre-push` hooks (`./scripts/bootstrap`).
- [`docs/philosophy.md`](docs/philosophy.md): Human-readable philosophy and lineage (never auto-loaded into agent prompts).

## Install

### Any Agent Skills harness (Cursor, Codex, Antigravity, pi, OpenCode, etc.)

```sh
npx skills add misty-step/mistystack -g
```

Copy [`rules/core.md`](rules/core.md) into your harness's always-on instruction file or `AGENTS.md`.

### Claude Code plugin

```sh
claude plugin marketplace add misty-step/mistystack
claude plugin install mistystack@mistystack
```

### Run `misty-check` directly

```sh
node skills/foundations/scripts/misty-check.mjs /path/to/repo
node skills/foundations/scripts/misty-check.mjs /path/to/repo --json
```

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
