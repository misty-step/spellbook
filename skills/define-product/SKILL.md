---
name: define-product
description: "Author or reconcile a repository's present-tense PRODUCT.md as an implementation-free contract of user stories and non-goals."
---

# Define product

Maintain one `PRODUCT.md` at the repository root (or per standalone program) written entirely in the present tense as the target state of the product. State purpose, domain terms, observable user stories, business rules, and explicit non-goals — never frameworks, languages, vendors, file paths, or architecture choices. Pass every line through two tests: if all code vanished, would omitting this line let a rebuild break user trust, and would keeping it block a simpler implementation that delivers the same outcome. Keep technical and stack decisions out of `PRODUCT.md` so the contract stays durable across rewrites. Reconcile `PRODUCT.md` directly against the running product rather than materializing a drift-prone ticket backlog, confirming with the user before dropping undocumented live behavior.
