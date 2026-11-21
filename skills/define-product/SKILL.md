---
name: define-product
description: "Author or reconcile a repository's present-tense PRODUCT.md Active Folio contract of user stories, depth constraints, and non-goals."
---

# Define product

Maintain one present-tense `PRODUCT.md` at the repository root (paired with `DESIGN.md` as the repository's **Active Folio** — present-tense truth where git owns history, replacing stale ADR sprawl). State purpose, domain terms, observable user stories, business rules, and explicit non-goals — never frameworks, languages, vendors, file paths, or architecture choices. Before scoping or building, push for depth over breadth: start from raw source data and real domain tools over pre-digested tables, set ambitious constraints, falsify assumptions against real telemetry, and name an outside judge to verify the result. Pass every line through two tests: if all code vanished, would omitting this line let a rebuild break user trust, and would keeping it block a simpler implementation that delivers the same outcome. Reconcile `PRODUCT.md` directly against the running product rather than materializing a ticket backlog, confirming with the user before dropping undocumented live behavior.
