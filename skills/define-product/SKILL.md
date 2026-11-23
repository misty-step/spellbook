---
name: define-product
description: "Author or reconcile a repository's present-tense PRODUCT.md Active Folio contract — observable outcomes, boundaries, and #depth without template bureaucracy."
---

# Define product

Maintain one present-tense `PRODUCT.md` at the repository root (or per standalone program), paired with `DESIGN.md` as the repository's **Active Folio** — living present-tense truth where git owns history, replacing stale ADR sprawl and ticket backlogs. Code is cheap to regenerate; clear product intent is the durable asset that prevents drift and implementation lock-in. State purpose, domain terms, observable user outcomes, business rules, and explicit non-goals — never frameworks, languages, vendors, file paths, or architecture choices. Keep exact headings and structure flexible to fit the project rather than enforcing rigid section templates.

Before scoping or building, push for depth over breadth: start from raw source data and real domain tools over pre-digested tables, set ambitious constraints, falsify assumptions against real telemetry, and name an outside judge to verify the result. Pass every line through two durability tests: if all code vanished, would omitting this line let a clean-room **recompile** break user trust, and would keeping it block a simpler implementation that delivers the same outcome? Shape intent in `PRODUCT.md` first, reconcile the running product directly against it (automatically or on demand) rather than materializing a backlog, and confirm with the user before dropping undocumented live behavior.
