---
name: spec
description: "When writing, updating, bootstrapping or reconciling a project's SPEC.md: keep one implementation-free target state per program and close drift against the running product."
metadata:
  owner: phaedrus
  prevents: "Implementation-anchored specs, split DOMAIN.md/USER_STORIES.md authorities and drift-prone ticket backlogs; Phaedrus's 2026-11-13 ruling (ADR 0028)."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-13"
---

# Spec

Every program has one `SPEC.md` (`SPEC.md` at repository root, or `<program>/SPEC.md` only when one repository houses separate small programs with explicit interfaces; never a `.spec/` or split `spec/` directory). `SPEC.md` is always the **present-tense target state** for that program, holding its purpose, domain vocabulary (`## Terms`), domain invariants, product experience and user capabilities together in one home (replacing separate `DOMAIN.md` and `USER_STORIES.md` files). On UI projects, visual tokens and aesthetic craft stay separate in `DESIGN.md` (following Google's `DESIGN.md` standard through [design](../design/SKILL.md)) so a future rebuild can keep or regenerate the visual aesthetic independently of product behavior.

When `SPEC.md` equals the live running product, the repository is at **homeostasis**. When they diverge, reconcile directly instead of copying requirements into an issue backlog.

## What belongs in SPEC.md

Shape the prose to the program surface: narrative experience, interaction feel, information hierarchy and user journeys for interactive applications and games; crisp input, output and error contracts for CLIs, APIs and libraries.

- **Include:** purpose and explicit non-goals; coined or load-bearing domain terms (`## Terms`) and business or safety invariants; product experience, feel and key hierarchy; observable user capabilities, acceptance behavior and edge-case semantics; privacy, data-survival, authorization and external interface promises that genuinely earn survival across a blank-sheet rebuild.
- **Omit:** system architecture, language/framework/database picks, storage schemas, cache topology, internal module splits, file or test paths, model or host names, whether a feature is already built, and changelog or ticket-number (`US-NNN`) sediment. Architecture, stack choices and deviations belong in `docs/decisions/`.

Pass every line through both questions:

1. **Amnesia check (catches underspecification):** *If all code vanished tonight and a frontier model satisfied every line here, could it build something users experience as wrong, spiritless, insecure or destructive to their data?* If yes, add the missing observable truth. Any trust or compatibility rule worth preserving across a rebuild earns its place right here as a product requirement rather than in a separate compatibility ledger.
2. **Bitter-lesson check (catches overspecification):** *If a far stronger model wanted to replace the entire stack, storage and internal decomposition with a radically simpler design that users love equally, would this line block it?* If yes, delete it or rewrite it as the user outcome it served.

## Workflows

### 1. Author or change intent

Write target behavior directly in `SPEC.md`, either when the owner edits it or after settling open product questions through [grilling](../grilling/SKILL.md). Define any new domain concept in `## Terms` first so code, commits and prose share one word, and record stack or architecture trade-offs in `docs/decisions/`. When a request changes product behavior, update `SPEC.md` ahead of or alongside the code change so target state leads implementation.

**Done when:** every changed capability and coined term lives in present-tense `SPEC.md`, open product ambiguities are settled with the owner, and every line passes the amnesia and bitter-lesson checks.

### 2. Bootstrap or consolidate a repository

Read any existing `SPEC.md`, `DOMAIN.md`, `USER_STORIES.md`, `README.md`, `docs/decisions/` and the running product. Inspect the live application to uncover undocumented behavior, but never elevate accidental bugs or inherited architecture into specification requirements. Fold live capabilities, domain terms and invariants into one `SPEC.md`, strip implementation anchoring and story-ID sediment, migrate callers referencing `DOMAIN.md` or `USER_STORIES.md` and delete those retired files. Take genuine product contradictions or ambiguous boundaries to the owner via [grilling](../grilling/SKILL.md).

**Done when:** one `SPEC.md` owns terms, invariants and target behavior, retired `DOMAIN.md`/`USER_STORIES.md` files and dead callers are removed, and unresolved product questions are recorded with the owner.

### 3. Reconcile to homeostasis

Compare `SPEC.md` against the running product (exercised on its real consumer surface through [verification](../verification/SKILL.md)) and the codebase. Never materialize `SPEC.md` or its diff into a backlog of tracker issues: turning a specification into discrete tickets introduces drift and removes stopping backpressure.

- **At homeostasis (`SPEC.md == running product`):** stop. Create no follow-up tickets or unrequested scope.
- **Extra live behavior:** if the running product has user-facing behavior absent from `SPEC.md` that a recent spec edit did not intentionally remove, check Git history and confirm with the owner before deleting unrecorded product value that may be a spec omission.
- **Confirmed drift:** close the gap directly through one [ship-loop](../ship-loop/SKILL.md) slice when changes are coupled, ephemeral parallel writers in isolated worktrees when slices own disjoint paths and checks, or [recompile](../recompile/SKILL.md) when a blank-sheet rebuild from `SPEC.md` beats patching inherited structure. Keep [Foundation article 3](../foundation/checklist.md#article-3) and the running product in agreement at cutover.

Failures a recompile round traces to a silent or ambiguous `SPEC.md` amend it directly, not as tickets.

**Done when:** the running product matches `SPEC.md` under real-path proof (or confirmed drift is handed directly to the active delivery/rebuild path) and zero backlog tickets were generated from the spec.
