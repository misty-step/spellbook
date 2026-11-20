# Philosophy & Lineage

This page explains why `mistystack` is shaped the way it is. It is written for human readers and intentionally lives outside `skills/` and `rules/` so it is never auto-loaded into coding-agent prompts.

## Why seven small skills beat forty playbooks

Modern frontier coding models already know how to refactor code, write tests, and navigate Git. Long procedural playbooks, rigid templates, and hardcoded model tables actively hurt performance: they burn context window, contradict each other as tools evolve, and train agents to perform theater instead of thinking.

`mistystack` cuts the method down to what a strong model genuinely needs:

- **Five standing rules** in `rules/core.md` — always on, under twenty lines, defining evidence, strategic design, real-path verification, autonomy boundaries, and cold-reader reporting.
- **Seven concise skills** in `skills/` — each 3 to 8 sentences (or 12 terse bullets for `foundations`), stating *what* matters and *why*, never bloated *how* recipes.
- **Deterministic scripts over prose** — when a check or workflow repeats, encode it in executable code (`misty-check.mjs`, `extract_conflict_context.py`, `.githooks/trufflehog-gate.py`) rather than asking an LLM to remember twenty steps.
- **Zero auto-mounted companion packs** — every repository and operator stays in control of what loads into context.

## Lineage

The lean method stands on clear, battle-tested engineering ideas:

- **John Ousterhout (*A Philosophy of Software Design*)** — Prefer deep modules with small, simple interfaces over shallow layers and tactical patches. Pull complexity downward; migrate callers and delete dead code rather than working around it.
- **Lauren Tan (`poteto` / `pstack`)** — Evidence before confidence. Keep skills short around *what* and *why*; observe the real code and running system directly instead of arguing from summaries or abstract reviews.
- **Kent C. Dodds** — Spend inference once to build durable, deterministic scripts, linters, and use-shaped verification across real boundaries. Never treat mocked unit passes as proof of shipped behavior.
- **Zach Lloyd** — Fast-loop software-factory shipping. Keep feedback cycles short, remove ceremony from the inner loop, and deliver verifiable vertical slices continuously.
- **Linus Torvalds & John Carmack** — Good taste comes from clean data structures that eliminate special cases and explicit, visible control flow free of hidden state mutation.
- **Nate Berkopec & Richard Sutton (*The Bitter Lesson*)** — Maintain one present-tense `PRODUCT.md` describing observable user stories and non-goals with zero implementation lock-in, reconciled directly against the running product rather than materialized into a drift-prone ticket backlog.

## Portable by design

Every rule and skill in `mistystack` is written in portable language ("the user", "the human operator") with zero personal names, machine-specific paths, or hardcoded model rankings. Any team or individual can drop `rules/core.md` and `skills/` into Claude Code, Codex, Cursor, Antigravity, pi, or any other Agent Skills harness without editing a line.
