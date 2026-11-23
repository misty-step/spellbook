# mistystack

Lean, portable engineering method for coding agents in Agent Skills format (`skills/<name>/SKILL.md`), paired with `rules/core.md` and the static reader in `site/` (`stack.mistystep.io`).

- `rules/core.md`: 6-bullet always-on standing rules (Active Folio first).
- `skills/`: 7 lean skills (`misty`, `foundations`, `design`, `define-product`, `security-audit`, `release-watch`, `resolve-merge-conflicts`) plus deterministic scripts (`misty-check.mjs`, `extract_conflict_context.py`).
- `.claude-plugin/`, `.agents/`, `package.json`: thin native manifests with zero external companion packs.
- `.githooks/`: TruffleHog secret-scanning hooks (`./scripts/bootstrap`).
- `docs/philosophy.md`: human-readable philosophy and lineage (never auto-loaded into agent prompts).
- `site/`: Astro static reader for `stack.mistystep.io`.

Keep every skill brief (what and why only), portable ("the user" / "the human operator"), and free of personal names or rotting model tables. Prefer deterministic scripts over prose.

Verify before PR: `./scripts/check doctor && ./scripts/check fast`, `node --test skills/foundations/scripts/misty-check.test.mjs`, and `npm --prefix site run build && npm --prefix site run check`.
