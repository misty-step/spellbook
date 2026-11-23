# Philosophy & Lineage

This page explains why `mistystack` is shaped the way it is. It is written for human readers and intentionally lives outside `skills/` and `rules/` so it is never auto-loaded into coding-agent prompts.

## Why seven small skills beat forty playbooks

Modern frontier coding models already know how to refactor code, write tests, and navigate Git. Long procedural playbooks, rigid templates, and hardcoded model tables actively hurt performance: they burn context window, contradict each other as tools evolve, and train agents to perform theater instead of thinking.

`mistystack` cuts the method down to what a strong model genuinely needs:

- **Six standing rules** in `rules/core.md` — always on, under twenty lines, defining the Active Folio as living truth, evidence first, strategic design, real-path verification, autonomy boundaries, and cold-reader reporting.
- **Seven concise skills** in `skills/` — each a few crisp paragraphs (or a terse bullet checklist for `foundations`), stating *what* matters and *why*, never bloated *how* recipes.
- **Deterministic scripts over prose** — when a check or workflow repeats, encode it in executable code (`misty-check.mjs`, `extract_conflict_context.py`, `.githooks/trufflehog-gate.py`) rather than asking an LLM to remember twenty steps.
- **Zero auto-mounted companion packs** — every repository and operator stays in control of what loads into context.

## The Active Folio

At agent speeds, code is cheap to regenerate while intent is expensive to rediscover. Ticket boards, kanban backlogs, and sprawling ADR directories rot almost as soon as they are written: every ticket is a frozen guess from an earlier moment, and maintaining issue states quickly costs more human attention than doing the work.

The **Active Folio** solves this by anchoring each repository in two living, present-tense documents while **git owns history**:

- **`PRODUCT.md`** — Observable user outcomes, domain terms, business rules, and explicit non-goals, with zero implementation lock-in (no frameworks, file paths, or vendor coupling).
- **`DESIGN.md`** — For UI projects, visual craft, hierarchy, typography, spacing, and design tokens kept in exact parity with shipped stylesheets and assets.

Work flows through a simple three-step loop:

1. **Shape intent first:** Clarify or change behavior in `PRODUCT.md` (and `DESIGN.md` where applicable) before writing code (running a pre-scoping `#depth` pass so assumptions are tested against real data and telemetry).
2. **Reconcile code against the Folio:** Close the diff between the Active Folio and the running artifact — automatically via push/reconciler agents where available, or on demand — without translating intent into ticket backlogs.
3. **Prove completeness with clean-room `recompile`:** Periodically rebuild the system from `PRODUCT.md` (plus `DESIGN.md` for UI projects) alone without peeking at legacy hacks. Every surprise exposes missing intent; when a clean-room rebuild preserves user trust, the Folio is genuinely complete.

**Non-prescriptive craft:** Resist template bureaucracy. Exact section headings, prose style, and organization can flex to fit the project. Every line in the Active Folio only needs to pass two tests: *if all code vanished, would omitting this line let a rebuild break user trust?* and *would keeping it block a simpler implementation that delivers the same outcome?*

## The 3-Layer Intent Stack

To keep repository Active Folios sharp and free of boilerplate, intent separates into three layers:

1. **Universal Baseline (`mistystack` — every repository, always):** Calm hierarchy, accessible contrast, graceful empty and error states, zero console or CSP errors, and real-path verification. Never repeated in a repository's Active Folio.
2. **Surface-Class Baselines (`mistystack` — conditional by product kind, overridable via Folio Non-Goals):**
   - **Web App:** Brand mark plus multi-size favicon and Apple touch icon, mobile/desktop ergonomics (`390px` + `1440px`), light/dark parity, installable PWA basics (`manifest.webmanifest` + standalone viewport), and clean OG/meta tags.
   - **Native / Desktop App:** OS-native conventions, system theme parity, clean permissions/clipboard hygiene, and a packaged or runnable artifact.
   - **CLI / Service:** Crisp `--help`, non-interactive `--json`, and deterministic exit codes.
   - **Evidence / Artifact / Retro:** Calm editorial layout, one focal idea per screen or beat, scannable tables (`<= 4` columns), and zero dark-HUD pill soup.
3. **Repo Active Folio (`PRODUCT.md`, plus `DESIGN.md` for UI projects — ONLY what is unique to this product):** Do not restate Universal or Surface-Class baselines; articulate only product-specific identity, behavior, tokens, and explicit opt-outs (Non-Goals).

## Four surfaces, not ticket backlogs

Instead of materializing work into a backlog, the human operator and coding agents run on four surfaces where **work is the computed diff between Intent and Verified Reality**:

- **Intent — the Active Folio (`PRODUCT.md` + `DESIGN.md`)** — The repository's living present-tense truth. Git owns history, replacing stale ADR sprawl; when direction changes, the Active Folio changes directly.
- **Verified Reality / Evidence Ledger** — What the running product actually does today, backed by real checks, empirical traces, formal state-machine verification, screenshots, recordings, and live build identity — never abstract prose nitpicks. Gaps between Intent and Verified Reality define the next slice without creating tickets.
- **Ephemeral Compute** — Loops, triggers, and bounded factory runs that close a specific diff between Intent and Verified Reality and then tear down cleanly, leaving verified commits and evidence rather than long-lived orchestration clutter.
- **Sparks / Ideas** — One flat, low-ceremony capture log for rough thoughts and future possibilities. A spark stays inert until the user promotes it into Intent — never silently turned into backlog debt.

## Portable quality multipliers

Two lightweight habits multiply quality across any model provider or harness without adding process overhead:

- **Cross-Family Cold Critic:** Before merging meaningful work, have a fresh reviewer from a different model family inspect only the diff, the Active Folio, and real run evidence — never let the authoring model grade its own homework. To keep review loops convergent, apply a **Pass 3+ concrete-fixture bar**: after two review passes, a critic may only block with a concrete failing fixture or reproduction proving a real defect or Active Folio violation — never synthetic edge-case golf.
- **Calm Editorial Evidence:** When reporting proof to the human operator, favor visually-forward, human-legible artifacts — clean typography, generous whitespace, real rendered screenshots or short walkthroughs, and concise takeaways — over dense dark HUD tables, metric soup, or walls of raw terminal logs.

## Lineage

The lean method stands on clear, battle-tested engineering ideas:

- **John Ousterhout (*A Philosophy of Software Design*)** — Prefer deep modules with small, simple interfaces over shallow layers and tactical patches. Pull complexity downward; migrate callers and delete dead code rather than working around it.
- **Lauren Tan (`poteto` / `pstack`)** — Evidence before confidence. Keep skills short around *what* and *why*; observe the real code and running system directly instead of arguing from summaries or abstract reviews.
- **Kent C. Dodds** — Spend inference once to build durable, deterministic scripts, linters, and use-shaped verification across real boundaries. Never treat mocked unit passes as proof of shipped behavior.
- **Zach Lloyd** — Fast-loop software-factory shipping. Keep feedback cycles short, remove ceremony from the inner loop, and deliver verifiable vertical slices continuously.
- **Linus Torvalds & John Carmack** — Good taste comes from clean data structures that eliminate special cases and explicit, visible control flow free of hidden state mutation.
- **Nate Berkopec & Richard Sutton (*The Bitter Lesson*)** — Maintain one present-tense `PRODUCT.md` describing observable user stories and non-goals with zero implementation lock-in, reconciled directly against the running product rather than materialized into a drift-prone ticket backlog.
- **Felix Rieseberg (`#depth`)** — Push for depth over breadth before scoping or building: start from raw source data and real domain tools instead of pre-digested tables, set ambitious constraints, falsify assumptions against real telemetry, and verify outcomes with an outside judge rather than letting the model grade itself.
- **Joseph Suarez (`PufferLib SKILL_ISSUES.md`)** — After code works, run a subtract-and-inline pass: inline single-use wrappers, flatten nested branches, and delete test-only shims and dead code without golfing, while preserving strict validation at external trust boundaries.

## Portable by design

Every rule and skill in `mistystack` is written in portable language ("the user", "the human operator") with zero personal names, machine-specific paths, or hardcoded model rankings. Model routing stays provider-agnostic (working cleanly through unified gateways like OpenRouter or native provider APIs), and verification favors empirical execution and formal checks over abstract nitpicks. Any team or individual can drop `rules/core.md` and `skills/` into Claude Code, Codex, Cursor, Antigravity, pi, or any other Agent Skills harness without editing a line.
