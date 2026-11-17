# 0028: SPEC.md drives the application directly

Status: accepted, 2026-11-13.
Supersedes the tracker-published spec and ticket-backlog materialization flow of
[0024](0024-pocock-shaping-skills.md) (removing `to-spec` and `to-tickets` from
`vendor/pocock.lock.json`) and supersedes the Linear-as-product-intent-backlog
provision of [0020](0020-github-and-linear-replace-entire.md) while keeping
GitHub for pull requests and Linear for operational coordination.

## Context

Previously Mistystack split product truth across three places: Linear held
upstream product intent, `USER_STORIES.md` held numbered consumer contracts
with `US-NNN` history, and `DOMAIN.md` held vocabulary and invariants, while
`SPEC.md` trailed pull requests as downstream documentation and Matt Pocock's
`to-spec` and `to-tickets` materialized approved understanding into tracker
backlogs. Foundation article 3 also banned UI descriptions outright, which left
specs brittle on technical mechanics while under-specifying the product feel
a fresh rebuild needs.

On 2026-11-13, Phaedrus settled the model around recompiling a program from
first principles and keeping the live application synchronized with its
specification without ticket-backlog drift.

## Decision

1. **One shared `spec` skill.** Author, consolidate and reconcile `SPEC.md`
   through one maintained [define-product](../../skills/define-product/SKILL.md) skill rather than
   generating per-repository spec skills. Unlike per-app verification,
   spec-writing and drift reconciliation follow one universal method, with prose
   structure adapted freely to the program surface (narrative feel and journeys
   for UI/game surfaces; input/output contracts for CLIs, APIs and libraries).
2. **One `SPEC.md` per program.** Fold `DOMAIN.md` (vocabulary and invariants)
   and `USER_STORIES.md` (user capabilities) into root `SPEC.md` (or
   `<program>/SPEC.md` only where a repository houses separate small programs),
   rejecting `.spec/` or split `spec/` directories. Keep Google-standard
   `DESIGN.md` separate on UI projects so [recompile](../../skills/recompile/SKILL.md)
   can choose case by case whether to keep or regenerate aesthetic craft. Relocate
   the maintainer-only skill frontmatter contract to
   [agent-design](../../skills/agent-design/SKILL.md#skill-frontmatter).
3. **Bitter Lesson + Amnesia razors.** `SPEC.md` carries purpose, non-goals,
   domain terms, invariants, product experience (feel and hierarchy, not layout
   or routing boilerplate), user capabilities, and any trust or compatibility
   promise that genuinely earns survival across a blank-sheet rebuild. It omits
   architecture, tech stack, storage schemas, module structure, file paths,
   model names, build status and `US-NNN` sediment. No separate compatibility
   configuration is added; live production user data is protected by explicit
   dry-run, refusal and rollback at `recompile` cutover.
4. **Homeostasis replaces ticket materialization.** `SPEC.md` is always the
   upstream target for current state. Agents diff `SPEC.md` against the running
   product and close drift directly (`SPEC.md == running product` is
   homeostasis), citing
   [Nate Berkopec](https://x.com/nateberkopec/status/2121374054016028943). Delete
   `skills/to-spec/` and `skills/to-tickets/` and drop them from
   [`vendor/pocock.lock.json`](../../vendor/pocock.lock.json). Any automated bot
   dispatch or webhook scheduling triggered by `SPEC.md` diffs belongs in private
   `misty-step/workstation`, not shared method prose.

## Consequences

- Shaping flows from [grilling](../../skills/grilling/SKILL.md) straight into
  `SPEC.md` (product truth and terms) and `docs/decisions/` (architecture and
  stack exceptions).
- Retired site routes (`/domain/`, `/stories/`, `/library/skills/to-spec/`,
  `/library/skills/to-tickets/`) redirect permanently to `/spec/` and
  `/library/skills/spec/`, and historical ADR links to deleted `DOMAIN.md` and
  `USER_STORIES.md` resolve against the pinned `v0.4.0` commit through the
  archive map.
- Revisit if shared multi-file program boundaries prove too large for one
  `SPEC.md` without splitting into sub-programs, or if external coordination
  requires structured cross-repository links beyond `docs/decisions/` and
  operational tracker issues.
