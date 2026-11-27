# Philosophy & Lineage

Why Spellbook is shaped the way it is. This page is for human readers; it lives outside `skills/` and `rules/` so it is never auto-loaded into coding-agent prompts.

## The bitter lesson, applied to method

General methods that ride growing capability beat hand-encoded cleverness — not always at first, but eventually and decisively. Agent method is no exception. Each model generation already knows more about refactoring, testing, and Git than a playbook can teach, and every step-by-step recipe written for last year's model becomes friction for this year's.

So Spellbook encodes only what capability cannot supply on its own:

- **Intent** — what the product must do for its users, stated in the present tense.
- **Invariants** — the few standing rules that hold however capable the agent becomes: evidence over assertion, verification on the real running artifact, clear autonomy boundaries.
- **Taste** — short skills that say *what* matters and *why*, never a *how* recipe.
- **Checks** — anything a machine can verify becomes a deterministic script, not a paragraph an agent must remember.

Everything else is left to the model, and improves when the model does.

## Why a few small skills beat forty playbooks

Long procedural playbooks, rigid templates, and hardcoded model tables burn context, contradict each other as tools evolve, and train agents to perform theater instead of thinking. Spellbook keeps:

- **Six standing rules** in `rules/core.md` — always on, under twenty lines.
- **Ten concise skills** in `skills/` — each a few paragraphs (or a terse checklist for `foundations`).
- **Deterministic scripts over prose** — `misty-check.mjs` (including its structural layout thresholds, its observability guard for anything deployed, and the `.misty-check.allow` ratchet), `extract_conflict_context.py`, and `.githooks/trufflehog-gate.py`.
- **Zero auto-mounted companion packs** — every repository and operator decides what loads into context.

## The Active Folio

At agent speed, code is cheap to regenerate while intent is expensive to rediscover. Ticket boards and sprawling decision logs rot as soon as they are written: every ticket is a frozen guess from an earlier moment, and maintaining their states soon costs more attention than the work.

The **Active Folio** anchors each repository in living, present-tense documents while **git owns history**:

- **`PRODUCT.md`** — observable user outcomes, domain terms, business rules, and explicit non-goals, with zero implementation lock-in (no frameworks, file paths, or vendors).
- **`DESIGN.md`** — for UI projects, visual craft, hierarchy, typography, spacing, and design tokens in exact parity with shipped assets.

Greenfield or legacy, work flows through one loop:

1. **Intent first.** Change `PRODUCT.md` (and `DESIGN.md` for UI) before code whenever product-specific intent changes, after a `#depth` pass that tests assumptions against real data. Landing in a repository without a Folio, bootstrap one from user intent and observed behavior before making big changes.
2. **Reconcile.** Close the diff between the Folio and the running artifact — through push/reconciler hooks where wired, or on demand — without translating intent into a backlog.
3. **Recompile.** Periodically rebuild from the Folio alone without peeking at legacy code. Every surprise exposes missing intent; when the rebuild preserves user trust, the Folio is complete.

Headings and structure flex to fit the project. Every line only has to pass two tests: *if all code vanished, would omitting this line let a rebuild break user trust?* and *would keeping it block a simpler implementation of the same outcome?*

## The 3-Layer Intent Stack

Intent separates into three layers so each Folio stays free of boilerplate:

1. **Universal baseline (Spellbook — every repository):** calm hierarchy, accessible contrast, graceful empty and error states, zero console or CSP errors, and real-path verification.
2. **Surface-class baselines (Spellbook — by product kind, overridable through Folio Non-Goals):**
   - **Web App:** brand mark with multi-size favicon and Apple touch icon, `390px` and `1440px` ergonomics, light/dark parity, installable PWA basics, and clean OG/meta tags.
   - **Native / Desktop App:** OS-native conventions, system theme parity, permission and clipboard hygiene, and a packaged or runnable artifact.
   - **CLI / Service:** crisp `--help`, non-interactive `--json`, and deterministic exit codes.
   - **Evidence / Artifact / Retro:** a self-contained interactive HTML briefing rather than a narrated slideshow video, with calm editorial layout, one focal idea per screen, scannable tables (`<= 4` columns), and no dark-HUD pill soup.
3. **Repository Folio (`PRODUCT.md`, plus `DESIGN.md` for UI):** only what is unique to this product — identity, behavior, tokens, and explicit opt-outs.

## Four surfaces, not ticket backlogs

Work is the computed diff between Intent and Verified Reality:

- **Intent** — the Active Folio. When direction changes, the Folio changes directly.
- **Verified Reality** — real runs, traces, screenshots, recordings, and live build identity, plus state-machine and simulation proofs of transition invariants. Gaps between Intent and Verified Reality define the next slice without creating tickets.
- **Ephemeral Compute** — bounded runs that close one specific diff and tear down, leaving verified commits and evidence instead of orchestration clutter.
- **Sparks** — one flat, low-ceremony log of rough ideas. A spark stays inert until the user promotes it into Intent.

## Decompose around decisions, not steps

Flowchart decomposition splits code along execution steps (`input -> transform -> sort -> output`), so every module shares raw formats and ordering assumptions, and one representation change breaks every stage together. The information-hiding criterion, later expanded into deep modules, is the cure:

- **Change-Decision Decomposition Check:** before splitting a system, list the **3–5 difficult or likely-to-change design decisions** (storage layout, protocol, auth, external wire format, execution order) and hide each behind **one** module boundary.
- **Minimal interfaces:** reveal only what callers need, so nobody depends on accidental ordering or format.
- **Acyclic `uses` hierarchy:** lower layers never depend on higher ones, so they stay reusable and upper layers stay prunable.

## Explicit state machines & Deterministic Simulation Testing

Systems rarely fail because a pure helper computed the wrong integer; they fail between scattered boolean flags (`isPending`, `hasRetried`, `cancelled`) and rare event interleavings.

- **Explicit state machines:** make lifecycle, protocol, billing, queue, retry, and multiplayer states small, total transition tables with clear invariants — backed by formal specs such as **Quint** or **TLA+** when state-space bugs are costly.
- **Deterministic Simulation Testing over unit-test sprawl:** mocked unit tests lock in implementation details and miss the interleavings that break production. Seeded simulators that control clocks, randomness, faults, and delivery order drive thousands of valid and adversarial sequences against those invariants, turning rare races into one-seed reproductions.

## Portable quality multipliers

- **Cross-family cold critic:** before merging meaningful work, a fresh reviewer from a different model family reads only the diff, the Folio, and real run evidence; the author never grades its own homework. After two passes, a critic blocks only with a concrete failing fixture, so reviews converge.
- **Calm editorial evidence:** proof for the human operator is visual and legible — real screenshots, playable walkthroughs, concise takeaways — not metric soup or walls of terminal logs.
- **Deployed means observable:** every deployed web app, worker, or service reports its own failures from the first deploy — a truthful health endpoint, production telemetry with release identity, and forwarded browser errors and CSP violations feeding automated triage — so the human operator never learns of a regression from a user. `misty-check.mjs` audits it on every repository.
- **Show, don't tell:** after a long or multi-step run, the reader's attention is the scarcest resource left. The `present` skill picks the lowest medium that carries the meaning (three lines, an inline visual, or a self-contained interactive HTML briefing with real charts and embedded proof video, which replaces the narrated retro video) and catches the reader up in five beats — *Look at this · What differs · Pay attention to · Why · Needs you* — so the result lands in seconds and the only work left for the human is the decision.
- **Explore wide, judge before showing:** a design exploration offers directions that differ in structure and typography rather than costume, lets layout and real content speak instead of narrator copy, passes approved assets through as checked-in files rather than prose, and puts every candidate through a headed, cross-family visual critique before a human sees it (`design-exploration`).
- **Mine the exhaust:** every human correction and harness stall is signal about where the method is wrong. The `trace-mining` skill clusters recurring ones from raw traces, graduates each into the smallest durable fix — a check first, then a sharper rule, then a pruned workflow — deletes what the evidence shows is obsolete, and watches whether the failure stops recurring.

## Lineage

Spellbook restates well-tested engineering ideas in its own words:

- **Information hiding** (*On the Criteria To Be Used in Decomposing Systems into Modules*, 1972) — decompose around likely-to-change decisions rather than flowchart steps, keep interfaces minimal, and keep the `uses` hierarchy acyclic.
- **Deep modules** (*A Philosophy of Software Design*) — small interfaces over deep implementations; pull complexity downward, migrate callers, and delete dead code instead of working around it. `misty-check.mjs` guards against shallow file sprawl (`> 15` source files per directory) and mega-files (`> 2,000` lines).
- **Evidence before confidence** (`pstack`) — keep skills short around *what* and *why*; observe the real code and running system rather than arguing from summaries.
- **Spend inference once** — turn repeated judgment into durable scripts, linters, and use-shaped verification across real boundaries; a mocked unit pass is not proof of shipped behavior.
- **Fast-loop shipping** — short feedback cycles, no ceremony in the inner loop, verifiable vertical slices delivered continuously.
- **Good taste** — clean data structures that eliminate special cases, and visible control flow without hidden state mutation.
- **Present-tense product intent** — one `PRODUCT.md` of observable user stories and non-goals, reconciled against the running product instead of a drift-prone backlog.
- **The Bitter Lesson** — methods that scale with capability win; encode intent and invariants, not procedures.
- **Depth over breadth** (`#depth`) — start from raw data and real domain tools, set ambitious constraints, falsify assumptions against telemetry, and let an outside judge verify the outcome.
- **Show, don't tell** (`present`) — present finished work the way a designer does: visual first, the difference made obvious, risks named, judgment calls explained, and only crisp decisions left for the reader.
- **Subtract and inline** (PufferLib's `SKILL_ISSUES.md`) — once code works, inline single-use wrappers, flatten branches, and delete test-only shims and dead code, while keeping strict validation at trust boundaries.

Named credit for each idea lives in the repository's `ATTRIBUTION.md`; published method content stays in portable voice.

## Portable by design

Every rule and skill is written in portable language ("the user", "the human operator") with no personal names, machine-specific paths, or hardcoded model rankings. Model routing stays provider-agnostic, and verification favors real execution and formal checks over abstract nitpicks. Any team can drop `rules/core.md` and `skills/` into Claude Code, Codex, Cursor, Antigravity, pi, or any other Agent Skills harness without editing a line.
