---
name: design-exploration
description: "Run high-signal design explorations: problem-first framing, genuinely distinct structural and typographic directions instead of costume themes, zero narrator copy, locked canonical assets, a headed visual pre-critique gate before human eyes, a three-config blind Design Arena on every new UI surface, redesign and visual-system change with durable owner verdicts fed back into taste and skills, and compact Bitter-Lesson briefs and rubrics."
---

# Design exploration

An exploration exists to widen the decision-maker's real options and then narrow them fast. Its usual failures are systemic, not cosmetic: interfaces that narrate their own mechanics, "distinct directions" that are one layout in different costumes, approved marks redrawn from a prose description, and candidates shown to a human before anyone looked at them rendered. Fix these at the brief and the gate, never one surface at a time. The `design` skill owns standing taste; this skill owns how to explore it.

## Problem-first framing and anti-kitsch direction

Before any pixel, state in two or three sentences who the user is, the job they came to do, the real content, and the one decision the screen must make easy. Directions then differ on the axes that change how the product works and reads: information architecture and density, layout and reading order, type system (families, scale, measure, rhythm), color discipline (how few colors, where the accent lives), and motion that carries meaning (state change, continuity, feedback). Ground each direction in a real craft reference — an editorial grid, a dense instrument panel, a printed timetable, a well-set book — and name what it borrows and why it fits this problem.

A direction is a structural and typographic stance, not a theme. Reject costume moves: novelty display faces standing in for a type system, faux textures and skeuomorphic props, emoji ornaments, neon glows, gratuitous gradients, illustration that carries no information, period pastiche. **Collapse test:** strip color and imagery from every direction; any two that reduce to the same wireframe were one direction. Restraint is the default — at most one bold move per direction, and the problem must earn it.

## Zero narrator copy

The interface should not describe itself. Narrator copy is any text that explains what hierarchy, position, affordance or the content already shows — "this is where your results appear", "the only line you get to see", "click below to begin", a subtitle paraphrasing its heading, helper text restating its label. It reassures the author and tells the user the design did not work. Prefer spatial affordance, real sample data and labels of one to three words (verbs on actions, nouns on regions) over sentences. Audit every string before review:

- **Delete test** — remove it; if a first-time user loses nothing the layout does not already give them, it stays deleted.
- **Self-reference test** — if it talks about the interface ("here", "below", "this panel", "you can") rather than the user's world, rewrite or delete it.
- **Earned words** — what remains is content, labels, errors that say what to do next, and the consequences of irreversible actions. Empty states show the shape of what will be there or offer one next action, not an essay.

## Canonical asset lock-in

Approved marks, logos, diagrams, icons and tokens are artifacts, not descriptions. Once approved, check them in as source files (SVG, token JSON or CSS) with a checksum manifest — for example `sha256sum mark.svg > mark.svg.sha256`, verified with `sha256sum -c` — and hand every downstream builder the path, hash or verbatim code. Never paraphrase an approved asset into prose ("a rounded hexagon with a small notch") for another agent to redraw: each transcription drops the detail that made it approved. Changing a locked asset is an explicit decision that reopens approval and updates its hash in the same change, and proof shows the shipped surface rendering the locked bytes, not a lookalike.

## Visual pre-critique gate

No candidate reaches the decision-maker unseen. Render every direction in a headed browser on real or realistic data at `1440x900` and `390x844`, in light and dark, and inspect each capture at full size for overflow, clipping, contrast, focus, broken states and console errors. Run `slop-check` from the `design` skill on each candidate's built output and fix what it flags. Then give only the captures and the brief — not your rationale — to a Verifier (the current name for the independent, cross-family reviewer the `verify` skill describes), and have it grade each direction on:

- **Restraint** — what could be removed without loss?
- **Copy economy** — any narrator copy left?
- **Typography** — a coherent system of scale, measure and rhythm, or ad-hoc sizes?
- **Motion** — meaningful feedback and continuity, or ornament?
- **Real-data fidelity** — does it hold with long names, empty, many and error states?
- **Distinctness** — does it survive the collapse test against its siblings?

Fix or drop what fails. Present the survivors side by side as the `present` skill describes.

## Design Arena on new surfaces, redesigns and visual-system changes

Taste is learned from verdicts, not asserted. One rule decides when that costs three builds:

- **Required:** every new product UI surface, every redesign, and every visual-system change — tokens, type scale, color, layout grid, shared component styling or motion language. These run as an arena of three distinct `model+pack` candidates and a blind owner pick, never as a single attempt.
- **Not required:** a documentation or tool-reference page that inherits an existing locked site layout and adds no new component or token, and a fix or copy edit on a settled surface. Say so in the hand-off; the `design` skill's `slop-check` gate and headed-browser proof still apply. A page that needs a new component or bends the locked layout is a visual-system change and runs the arena.

An arena runs in four steps:

1. **Three configurations.** Dispatch the same brief, fixtures and locked assets to three arms that differ in model, design-skill pack, or both, each labelled `model+pack` (for example the current house pack against a challenger pack, and a second model family on the house pack). Keep everything else identical, so the difference is the configuration.
2. **Blind slots.** Open the arena with `node skills/design-exploration/scripts/arena.mjs open --brief <id> --config <arm> --config <arm> --config <arm>`; it shuffles the arms into numbered slots and keeps the key in the ledger. Each arm passes the pre-critique gate above. The owner sees slots `1`, `2`, `3` side by side — never model, pack or maker names.
3. **Durable verdicts.** Record the owner's pick, optional full ranking and one-line reason with `arena.mjs verdict --arena <id> --winner <slot> --ranking 2,1,3 --reason "..."` before anyone reveals the key (`arena.mjs reveal`). Verdicts append to `verdicts.jsonl` in a ledger kept somewhere that outlives the session — the product repository or the operator's durable store, never a scratch directory. A verdict recorded after the reveal is kept but marked not blind and never counted.
4. **Feed it back.** `arena.mjs tally` joins blind verdicts with revealed keys and reports wins and mean rank per arm and per part, so a skill pack's record shows across the models it ran with. Ship the winner. Turn recurring loss reasons into taste invariants in the `design` skill or new `slop-check` rules; route future passes toward the arms that keep winning; and when an arm or pack keeps losing, test its removal as the `reflect` skill's ablation loop describes.

**Composing with harness ablation.** The `reflect` skill's ablation is a two-arm, single-variable delta (control against one treatment) that runs on routine work whether or not that work needs an arena; when the delta touches UI it is recorded as a two-arm arena (`--config control --config minus:<rule>`) in the same ledger. A two-arm ablation never satisfies the three-arm requirement above. When a pass that requires an arena also carries an ablation, fold the delta into the arena instead of running both: the house configuration is the control arm, the single-variable treatment is the second arm and a distinct challenger is the third — one blind pick ships the winner, and the control-against-treatment ranking is the ablation result.

## Compact briefs and rubrics

Brief strong models as you would a senior designer: the why (user, job, decision, constraint), the few taste invariants that matter here (no narrator copy, one accent, type-led hierarchy, locked assets by path), real fixtures (actual content, edge-case data, the locked files) and the gate the work will face. Leave out brittle CSS checklists, pixel prescriptions and step-by-step recipes — they cap the output at the brief-writer's imagination and rot with every model generation. Score rendered captures against a short rubric of observable invariants, not compliance with instructions; when one rubric line keeps catching the same failure, graduate it into a deterministic check as the `trace-mining` skill describes.
