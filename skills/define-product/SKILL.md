---
name: define-product
description: "When writing, bootstrapping or reconciling a program's PRODUCT.md: one implementation-free contract of user stories and business rules, accepted by the owner and reconciled against the running product."
metadata:
  owner: phaedrus
  prevents: "Implementation-anchored contracts, split product authorities, technical decisions leaking into the recompiler's context, and drift-prone ticket backlogs (ADR 0028; chat:phaedrus/t3479u-t3481u)."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-13"
---

# Define product

Every program has one `PRODUCT.md` at its repository root (or `<program>/PRODUCT.md` when one repository houses separate small programs). It is the **present-tense target state**: purpose, non-goals, domain terms (`## Terms`), user stories and business rules. On UI projects the visual system lives beside it in `DESIGN.md` ([design](../design/SKILL.md)). When `PRODUCT.md` equals the running product, the repository is at **homeostasis**.

## What goes where

- **`PRODUCT.md`: user stories and business rules only.** It names no tools, vendors, languages, frameworks, hosts, models, storage or architecture, and carries no file paths, build status or ticket numbers. Privacy, data-survival, authorization and external-interface promises belong here, stated as rules users can observe.
- **Technical decisions go to second-class context:** one page per project in the team's knowledge base (at Misty Step, the project's supercortex page). It is kept out of the recompiler's context on purpose and retrieved afterwards to guide iteration.
- **`ARCHITECTURE.md` and similar files are tossed or folded into that page on a recompile.** They never feed a rebuild.

Pass every line through two checks:

1. **Amnesia:** if all code vanished and a frontier model satisfied every line, could users get something wrong, spiritless, insecure or data-losing? Add the missing observable truth.
2. **Bitter lesson:** would this line stop a far stronger model from replacing the stack with a simpler design users love equally? Delete it, or rewrite it as the user outcome it served.

## Workflows

### 1. Author or change

Settle open product questions with the owner through [grilling](../grilling/SKILL.md), then write the synthesis into `PRODUCT.md`, defining new terms in `## Terms` first. The owner's acceptance of that synthesis in conversation is the merge approval: there is no separate review step for the owner. The agent that owns the change merges once the text matches the accepted synthesis, and changes nothing the owner did not accept.

**Done when:** every changed story, rule and term is in present-tense `PRODUCT.md`, the text matches the accepted synthesis, and every line passes both checks.

### 2. Bootstrap or consolidate

Read the existing contract files (`SPEC.md`, `VISION.md`, `DOMAIN.md`, `USER_STORIES.md`), `README.md` and the running product. Fold real user-facing behavior, terms and rules into one `PRODUCT.md`; never promote bugs or inherited architecture to requirements. Move technical content to the project's second-class page, migrate callers and delete the retired files. Take contradictions to the owner through grilling.

**Done when:** one `PRODUCT.md` owns the contract, retired files and dead callers are gone, technical content lives on the project page, and open questions are with the owner.

### 3. Reconcile to homeostasis

Compare `PRODUCT.md` with the running product on its real surface ([verification](../verification/SKILL.md)). Never turn the contract or its diff into a ticket backlog.

- **At homeostasis:** stop. No follow-up tickets.
- **Extra live behavior:** check Git history and confirm with the owner before removing value the contract may have omitted.
- **Confirmed drift:** close it through one [ship-loop](../ship-loop/SKILL.md) slice, parallel writers on disjoint paths, or a [recompile](../recompile/SKILL.md) when a blank-sheet rebuild beats patching. A recompile failure traced to a silent or ambiguous line amends `PRODUCT.md` directly.

**Done when:** the running product matches `PRODUCT.md` under real-path proof, and no tickets were generated from it.
