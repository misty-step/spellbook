---
name: research
description: "Pre-design research before locking a Folio capability, architecture, subsystem, dependency or visual direction: Quick and Deep modes, primary sources over memory (pinned docs, exemplary open-source code, postmortems), three or more genuinely different approaches compared honestly on simplicity, depth, operational burden and failure modes, and a short cited research note."
---

# Research

The first plausible design is an anchor, not an answer. Looking costs minutes; rebuilding a subsystem built on the wrong idea costs weeks, and model memory of an ecosystem is always a little stale. Before writing a Folio section that locks a capability, an architecture or protocol choice, a new subsystem, a dependency, or the references behind a visual direction, survey what already exists and how it fails. Skip it for small, reversible changes — research is a lever for one-way doors, not a ritual.

## Two modes

- **Quick** — one sitting, minutes. For reversible choices and library picks: the current primitives and tools, three approaches, a recommendation.
- **Deep** — hours, for one-way doors: storage layout, wire formats, auth, public interfaces, anything that migrates data. Read the source of the strongest reference implementations, their issue trackers and postmortems, and run a throwaway spike that tries to falsify the riskiest assumption before the design depends on it.

State the mode up front and stop when the decision is clear, not when the sources run out.

## Sources

Prefer primary material and cite it precisely:

- Official documentation and specifications at the version you will actually run.
- Source code of exemplary open-source implementations — the files that do the work, not the README.
- Postmortems, incident write-ups and long-lived issues: how the approach fails in production is worth more than how it is pitched.
- This repository's own history, Active Folio and running behavior.

Blog posts, benchmarks and model recall are leads to verify, never evidence alone. Mark anything you could not check as unverified.

## Compare honestly

Lay out at least three genuinely different approaches — always including an existing tool or service and the smallest thing that could work — and judge each on:

- **Simplicity and depth** — how much capability hides behind how small an interface.
- **Operational burden** — what must run, be upgraded or be watched, and by whom.
- **Failure modes** — how it breaks, how you would know, and how it recovers.
- **Fit** — with the Active Folio, the likely-to-change decisions and the system's real operating contract.
- **Reversibility** — what it costs to back out in six months.

Steelman each option before rejecting it, and name the evidence that would change the recommendation.

## Research note

Hand back one short note beside the decision it feeds (the brief, the pull request, the design review), not a living document:

1. **Question** — the decision this research informs, and the mode.
2. **Options** — a small table: approach · exemplar or source · strength · failure mode.
3. **Recommendation** — and the strongest rejected alternative, with why.
4. **Riskiest assumption** — and how it was falsified, or how it will be.
5. **Sources** — every claim linked to a URL at a revision or a `path:line`; unverified items marked.

Only the resulting intent moves into the Active Folio. Visual directions continue from these references as the `design-exploration` skill describes.
