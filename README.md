# mistystack

A lean, portable engineering method for coding agents built around the **Active Folio** (`PRODUCT.md` + `DESIGN.md` as living present-tense truth): **6 always-on rules**, **7 crisp skills** in open Agent Skills format (`skills/<name>/SKILL.md`), and **deterministic scripts** instead of bloated prose.

Browse the live reader at <https://stack.mistystep.io>.

## The Active Folio

Code is cheap to regenerate; clear present-tense intent is the durable source of truth that prevents drift, ticket sprawl, and implementation lock-in while git owns history.

- **Intent (`PRODUCT.md`, plus `DESIGN.md` for UI projects):** `PRODUCT.md` states observable user outcomes, domain terms, and non-goals with zero implementation details; `DESIGN.md` captures visual craft, hierarchy, and design tokens in parity with shipped assets.
- **Operating loop:** Shape intent in the Active Folio first → reconcile code against the Folio (automatically via reconciler runs or on demand) → periodically prove completeness with a clean-room **recompile** from the Folio alone.
- **Non-prescriptive craft:** Exact headings and templates can flex to fit the project — what matters is present-tense truth, parity with the running artifact, and passing the *"if all code vanished, would a rebuild preserve user trust?"* test.

## What ships

- [`rules/core.md`](rules/core.md): Six standing rules loaded in every session — Active Folio first, real evidence, strategic design, real-path verification, autonomy boundaries, and cold-reader recaps.
- [`skills/misty/SKILL.md`](skills/misty/SKILL.md): Core software-factory loop — Active Folio operating loop, real evidence first, strategic design, subtract-and-inline craft, cross-family cold critic, calm editorial evidence, and autonomous delivery.
- [`skills/foundations/SKILL.md`](skills/foundations/SKILL.md): Baseline project-health standards paired with [`misty-check.mjs`](skills/foundations/scripts/misty-check.mjs), a zero-dependency Node baseline auditor (`--json`, `--strict`) with non-rigid Active Folio awareness.
- [`skills/design/SKILL.md`](skills/design/SKILL.md): Visual craft, `DESIGN.md` Active Folio parity, Calm Editorial Evidence, hierarchy, accessibility, and anti-slop taste invariants.
- [`skills/define-product/SKILL.md`](skills/define-product/SKILL.md): Present-tense `PRODUCT.md` Active Folio contract of observable outcomes, boundaries, and `#depth` without template bureaucracy.
- [`skills/security-audit/SKILL.md`](skills/security-audit/SKILL.md): Evidence-backed boundary and exploit verification.
- [`skills/release-watch/SKILL.md`](skills/release-watch/SKILL.md): Merged ≠ live — verify deployed identity and a real user journey.
- [`skills/resolve-merge-conflicts/SKILL.md`](skills/resolve-merge-conflicts/SKILL.md): Compact hunk extraction via [`extract_conflict_context.py`](skills/resolve-merge-conflicts/scripts/extract_conflict_context.py).
- [`.githooks/`](.githooks/): TruffleHog secret-scanning `pre-commit` and `pre-push` hooks (`./scripts/bootstrap`).
- [`docs/philosophy.md`](docs/philosophy.md): Human-readable philosophy, Active Folio operating loop, quality multipliers, and lineage (never auto-loaded into agent prompts).

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
