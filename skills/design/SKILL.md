---
name: design
description: "Visual and interaction craft: DESIGN.md Active Folio parity, brief inference and art direction before code, anti-slop bans, purposeful sub-300ms ease-out motion with immediate pending states, complete accessible interface states, Calm Editorial Evidence, and a deterministic zero-LLM slop-check gate."
---

# Design

Pair `DESIGN.md` with `PRODUCT.md` as the visual half of the **Active Folio** — living present-tense visual craft, hierarchy, typography, spacing, motion and design tokens kept in exact parity with shipped stylesheets and assets so a clean-room rebuild preserves visual trust without drift. Following the **3-Layer Intent Stack**, keep `DESIGN.md` to product-specific identity, tokens and explicit opt-outs rather than restating universal or surface-class baselines; let its headings fit the project.

## Infer the brief, then direct

Before any markup, write down in a few lines who uses this surface, the one job they came for, the real content and assets it must carry, and what success looks like — persuading, operating a tool, reading, or experiencing the work itself. That mode sets the ambition: a landing page earns one committed visual idea; an app screen spends its craft on precision, density and restraint. Choose a direction on purpose (type system, color discipline, density, one reference it borrows from) instead of accepting a component library's defaults. Ship the real thing: the product's actual screens, photographs, marks and data, approved assets by path, icons from one drawn set in one stroke weight — never emoji, Unicode glyphs or lookalike logos standing in. When several directions are worth comparing, run them as the `design-exploration` skill describes.

## Anti-slop bans

These are the reflexes that make generated UI look generated. Each is a default to refuse, not a style to soften; only an explicit brief earns one back.

- **Decorative side stripes** — a colored bar down one side of a card, callout or nav item (one-sided border, inset shadow or pseudo-element). Use a full hairline border, a tint, or a leading icon or label. A quotation's typographic rule is the one exception.
- **Card soup** — cards inside cards, or same-size icon-heading-text cards as the whole page structure. One container level; let spacing and type do the grouping.
- **Generic gradients and glows** — violet-to-cyan washes, gradient text, zero-offset neon halos, hard offset block shadows outside a world that chose them. One accent, placed where the decision lives; depth from soft, offset shadows.
- **Labels the heading does not need** — eyebrows, kickers, section numbers that carry no sequence, taglines restating the heading. Delete them.
- **Raw metadata dumps** — JSON blobs, ISO timestamps, internal IDs and enum names shown as prose. Show the few fields a reader needs, labelled and formatted for people.
- **Uncalibrated spacing and type** — ad-hoc pixel values instead of a spacing scale in tokens; sizes without a clear step between body, title and display. Tight inside groups, generous between them, more space above a heading than below.
- **Browser defaults left undesigned** — selection, focus rings, scrollbars, caret and tabular numerals are part of the surface; theme them from the palette.

## Motion and interaction

Motion exists to give feedback, preserve continuity or explain a state change — never as ornament. The more often an interaction happens, the less it should move: shortcuts and command palettes not at all, hover barely, modals and toasts a little, first-run moments most.

- **Fast and ease-out.** UI feedback stays under `300ms` (press `100–160ms`, tooltips `125–200ms`, menus `150–250ms`); modals and drawers may reach `500ms`. Entrances and responses use a strong custom ease-out such as `cubic-bezier(0.23, 1, 0.32, 1)`; on-screen movement uses ease-in-out. Never `ease-in` for UI: it delays the first frame, the moment the user watches most closely.
- **Physical.** Nothing appears from nothing: enter from `scale(0.95)` with opacity, never `scale(0)`. Popovers grow from their trigger (`transform-origin`). Animate `transform` and `opacity`, list properties explicitly, never `transition: all`.
- **Interruptible.** Use transitions (or springs for gestures) that retarget mid-flight, not keyframes that restart. Gestures track the pointer one-to-one, capture it once dragging starts, and dismiss on velocity, not only distance.
- **Never dead.** Every pressable thing answers instantly: a subtle press (`scale(0.97)` on `:active`), then an immediate pending state on any action that waits on the network — disabled against double-submit, `aria-busy`, a spinner or optimistic result within one frame. A click with no visible response is a bug.
- **Reduced motion.** Every animation has a `prefers-reduced-motion` alternative that keeps the state change and drops the movement.

## Complete, accessible states

Every interactive element ships all of its states: default, hover, active, `:focus-visible`, disabled, pending, error and empty — with real content at short, typical and very long lengths. Keyboard reaches everything; focus rings are visible and never removed without a replacement; icon-only buttons carry a label; inputs have labels, correct types and inline errors that say what to do next; async updates announce through `aria-live`. Prevent layout shift: give images and media explicit dimensions, reserve space for late content, keep skeletons in the shape of what loads. Body text meets `4.5:1` contrast and large text `3:1`.

## Surface-class craft

Apply universal craft everywhere (calm hierarchy, accessible contrast, graceful empty and error states, keyboard control, zero console or CSP errors) plus conditional surface-class craft unless opted out in Folio Non-Goals: **Web Apps** ship a brand mark, multi-size favicon and Apple touch icon, responsive ergonomics at `390px` and `1440px` without horizontal overflow, light/dark parity, installable PWA basics (`manifest.webmanifest` plus a standalone viewport) and clean OG/meta tags; **Native/Desktop Apps** honor OS-native conventions, system theme parity, and clean permissions and clipboard hygiene; **Evidence / Artifact / Retro** surfaces use **Calm Editorial Evidence** — visually-forward, human-legible proof with one focal idea per screen or beat, scannable tables (`<= 4` columns), and no dark-HUD pill soup or raw log walls.

## Gate and proof

Run the deterministic gate before any human sees a surface: `node skills/design/scripts/slop-check.mjs <paths> [--json]` scans CSS and HTML-like markup with no model in the loop and exits `1` on the bans above that a parser can see — side stripes, nested cards, violet gradients, gradient text, glows, hard shadows, eyebrows, raw dumps, `transition: all`, `ease-in`, `scale(0)`, slow UI motion, missing reduced motion, removed focus outlines, incomplete button states, unsized images and uncalibrated spacing. Point it at built output when styles come from packages. A file opts out of one rule only with a justified comment (`slop-check-allow: <rule> -- <reason>`). Then prove every visual change on the real rendered surface in a headed browser across target viewports and both themes, with zero console errors and zero broken states. When a review keeps catching a new smell, graduate it into the checker as the `trace-mining` skill describes.
