---
name: project-anatomy
description: "Generate an on-demand, timestamped, self-contained interactive HTML snapshot of a repository's real current anatomy — system map, module depth and state ownership, live routes, endpoints and hooks, Active Folio versus reality, and recent evolution — derived from the checked-out revision instead of hand-maintained architecture prose, and archived as a dated milestone to compare across time."
---

# Project anatomy

Hand-written architecture documents drift the day after they are written and keep sounding authoritative long after they stop being true. A snapshot generated from the real tree is true on its date and never claims to be current. Generate one on demand — when onboarding, before a large change, at a milestone, before a recompile — archive it, and compare snapshots across time instead of maintaining prose.

## Derive, don't transcribe

Build every section from the checked-out revision and, where one is available, the running system: the source tree, import graph, entrypoints, route, endpoint, command and hook registrations, schemas and migrations, configuration keys, and `git log`. The Active Folio supplies intent. Existing documentation and comments are claims to check, never sources. Each section names the paths or commands that produced it, so the next snapshot can regenerate it rather than copy it.

## Sections

1. **Identity stamp** — repository, branch, full commit, generation time in UTC, and the generator. A snapshot without a revision is a rumor.
2. **System map** — modules, their acyclic `uses` graph, and external boundaries (stores, queues, third-party APIs), drawn as inline SVG — or Mermaid pre-rendered to SVG, never loaded from a CDN. Cycles are drawn, not hidden.
3. **Module depth and state ownership** — for each module, interface size (exports, endpoints, commands) against implementation size, the design decision it hides, and the state it owns. Flag shallow modules, cycles, and state with more than one writer.
4. **Live surface** — routes, endpoints, CLI commands, hooks, scheduled jobs and queues, each with its registration site and, when a running instance is reachable, whether it answered.
5. **Folio versus reality** — each Active Folio capability marked shipped, partial or missing, plus behavior that runs but appears in no intent, each with its evidence.
6. **Recent evolution** — churn by module over a stated window, the largest additions and deletions, and hotspots; against the previous snapshot, what appeared, disappeared, or got deeper or shallower.

Mark interpretation apart from derivation: "the decision this module hides" is a judgment, a file count is a fact. Show unknowns as unknown. Render configuration keys, never their values, and redact anything secret-shaped before the page leaves the machine.

## Snapshot contract

- One self-contained page that follows the interactive briefing contract of the `present` skill, which owns its medium, craft and portability; this skill owns only what the page says and how it is derived.
- Named `anatomy-<repo>-<YYYY-MM-DD>-<short-sha>.html` and published to the operator's artifact host as a permanent, immutable milestone — a new snapshot never overwrites an old one.
- Carries an embedded JSON block (modules, edges, depth figures, live surface, Folio status) so the next snapshot can diff against it mechanically.
- Lives outside the repository. Checked in, it would become the drifting document it replaces.
