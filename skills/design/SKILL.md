---
name: design
description: "Use for every UI or visual task: build, fix, redesign, polish, visual artifact, review, or motion."
metadata:
  owner: phaedrus
  prevents: "Design defaults drifting and state-specific defects escaping review: design-studio loaded only 4 times in the usage audit; Foundations article 10 requires a finished face."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-11-27"
---

# Design

Misty Step rewrite of the sources disclosed in [sources.md](sources.md).

## Principles

Three people open every screen: the user experience (UX), developer experience (DX), and agent experience (AX) that edits it next. Serve all three, or you're robbing one to pay another.

Kill any label that only exists to explain the layout. If the screen needs a caption, the screen is broken.

## Defaults

Start from the user's experience of the task and work back to the implementation.

Neutral, professional, plain words. Standard product design at Linear, Vercel
and GitHub quality; no decorative theme or metaphor unless authorized product
intent requires it. Support light and dark; default to the system setting.

[Foundation article 10](../foundation/checklist.md#article-10) is the bar:
primary information and action first; every element serves the task or required
information. No gratuitous text, eyebrow labels, or secondary label repeating
the primary. Fix hierarchy and layout before adding copy; cut taglines and
helper text where structure can do their job. Keep accessible units and disclose
provenance, uncertainty and calculation details when needed to interpret a result.

Use the product's own materials and existing design system as references.
Do not use Mobbin.

## Method

1. **Frame.** Read `SPEC.md` and `DESIGN.md` alongside the existing surface and
   design conventions. Name the user's task, the behavior to preserve and the
   outside check that will prove the result. Review-only work produces findings;
   polish preserves identity; redesign replaces visual structure without silently
   changing product facts. When a redesign or UI change alters routes, views, user
   flows or visual identity, reconcile [SPEC.md](../spec/SKILL.md) and
   `DESIGN.md` in the same slice. Done: the target surface, affected states and
   any spec or design updates are named.
2. **Build or inspect.** Reuse tokens and components, and keep `DESIGN.md` in
   exact parity with live stylesheets and assets: never declare fonts, geometry
   or tokens in `DESIGN.md` that shipped CSS omits, or leave unreferenced
   font or style assets in the tree. Alternatives differ in hierarchy or
   behavior, not merely color. For motion implementation, naming, review,
   performance or opportunity-finding, read [motion.md](motion.md).
   For artifacts, inspect at their actual viewing size; a generated mockup is a
   direction, not evidence of working UI. Any paid generation needs authorization;
   keep private data out of external prompts and generated media out of Git.
   Done: the requested change or review covers the whole affected path.
3. **Prove.** Follow [review.md](review.md): drive the real surface with your
   harness's browser automation, capture and inspect every named affected state,
   and test existing behavior for regressions. Record **UX**, **DX** and **AX** outcomes separately;
   pass only when all three improve together and existing behavior still works.
   Follow [Misty's reporting rules](../misty/SKILL.md#reporting); an inaccessible or unexercised state remains
   unverified.

[Sources and cut decisions](sources.md) disclose the rewritten upstream material.
