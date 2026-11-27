---
name: present
description: "Show, don't tell: hand back multi-step, long-running, or overnight work as a reader-first visual catch-up — Reader-First Medium Ladder, self-contained interactive HTML briefings (replacing narrated retro videos) for catch-ups, night-shift summaries, and release briefings, 5-Beat Catch-Up Frame (Look at this · What differs · Pay attention to · Why · Needs you), and Execution Route Maps for agent behavior."
---

# Present

Show, don't tell. When a run ends, the reader's attention is the scarcest resource left in the loop: a wall of text makes them rebuild in their head what you already saw, while a good presentation lets them absorb the result in seconds and decide. Hand work back the way a strong designer presents to a client — lead with the thing itself in the medium the reader takes in fastest, make the change obvious, name what deserves suspicion, explain only the judgment calls, and end with exactly what you need from them. Length is not effort; the reader's time to understanding is the measure.

## Reader-First Medium Ladder

Choose the lowest rung that carries the meaning without loss — never climb for spectacle, never stay in prose when the reader would have to imagine the picture.

1. **Three lines of text** — a simple answer, a single fact, a pass/fail outcome. No headings, no decoration.
2. **Inline visual** — a diagram, side-by-side, small table, or chart whenever the substance is architecture, routing, sequence, comparison, or trend.
3. **Interactive HTML briefing** — one self-contained page with a live comparison, variant picker, real charts, and embedded proof for multi-variant prototypes, UI changes, releases, and long shifts that touched many threads.

## Interactive HTML Briefings

Narrated slideshow retro videos are retired. A narrated video holds the reader to the author's pace, cannot be skimmed, searched, or questioned, and shows slides about the work instead of the work. Deliver every catch-up, night-shift summary, and release briefing that outgrows an inline visual as one self-contained, interactive HTML artifact the reader scans in seconds and drills into where it matters:

- **Real data, drawn live** — interactive SVG or Canvas charts, timelines, sparklines, pass/fail matrices, and architecture or state diagrams built from the run's actual numbers, with detail on hover and focus; never a decorative or invented figure.
- **Real verification evidence** — embedded playable `.mp4` or `.webm` walkthroughs of what actually shipped and side-by-side before/after screenshots, each beside the claim it proves. Video survives as evidence inside the briefing, never as the briefing.
- **Calm Editorial craft** — type-led hierarchy, one focal idea per screen, light/dark parity, and comfortable reading at `390px` and `1440px`.
- **Opens anywhere, breaks nowhere** — zero external CDN dependencies (styles, scripts, fonts, and media travel with the page), and safe on an opaque origin such as a `sandbox="allow-scripts"` frame or a local file: `<button type="button">` handlers instead of `<form>` submits, no reliance on storage, cookies, or cross-origin requests, and `0` CSP violations or console errors when opened in a headed browser.

## 5-Beat Catch-Up Frame

1. **Look at this** — visual first: the rendered result, the diagram, the side-by-side, before any explanation.
2. **What differs** — before/after or variant against variant, aligned so the change is visible at a glance; never make the reader hunt for it.
3. **Pay attention to** — surprises, edge cases, risks, caveats, and what remains unverified.
4. **Why** — the few judgment calls and tradeoffs that shaped the result, and the strongest alternative you rejected.
5. **Needs you** — crisp binary or multiple-choice decisions, each with a recommended default — or, explicitly, "Nothing needed."

The beats are a frame, not a form: small work collapses to one or two, but **Needs you** is always answered, even when the answer is nothing.

## Execution Route Maps

When the question is why an agent did what it did, draw the route the run actually took — which rules, skills, tools, and decision points fired, in order — beside the route it was expected to take, and mark the first point of divergence. That point is where the fix lives; a replayed transcript hides it.

Every visual is a claim. Build it from what actually ran — real captures, real output, real diffs — and link each beat to its evidence; never mock up a result you did not observe, and never let polish stand in for proof. Keep the visual voice calm and editorial, as the `design` skill describes for evidence surfaces.
