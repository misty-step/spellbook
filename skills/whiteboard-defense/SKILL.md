---
name: whiteboard-defense
description: "When the user wants to understand a project's architecture, data relationships or design trade-offs, or prepare to explain and defend a shipped system from evidence."
metadata:
  owner: phaedrus
  prevents: "Owner request, 2026-11-15: an agent's confident architecture summary does not give the human enough understanding to explain and defend the system."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-15"
---

# Whiteboard defense

Help the user build a working mental model: what the system does, how its parts
and data relate, and why its important choices hold up under challenge. The goal
is the human's understanding, not the agent declaring confidence or memorizing
symbol names. This is an understanding session, not authorization to change code.

Use the depth the question earns. Customer-facing shipped systems warrant a
defensible explanation of trust, failures and trade-offs. PoCs, demos and
experiments can prioritize speed; do not impose this as a universal release gate,
exhaustive audit or quiz for ordinary tasks.

1. **Choose the journey.** Establish the system and question from the user's
   context, their familiarity and what they want to be able to explain. Start
   with one representative customer journey; ask only for missing context that
   changes the walkthrough. State the revision and boundaries you can inspect.
2. **Trace from raw evidence.** Read the entry points, code paths, schemas,
   configuration and relevant tests, then compare docs, decision records and
   available running behavior. Follow input through decisions, persistence and
   output. Identify data structures, identities, relationships, ownership,
   invariants and lifecycle: creation, updates, deletion and retention where
   relevant. Explain who can read or change each important object and where
   control passes to another process or external system. Follow the important
   edge rather than inventorying every file.
3. **Build the explanation progressively.** Start with the purpose and a small
   map of responsibilities; walk a concrete example through it, then unpack the
   structures and boundaries the user needs. Use a sequence, relationship or
   component diagram when it clarifies the model. Label arrows and cite the
   inspected sources so the user can follow them. Define unfamiliar terms in
   context; line-level name recall is not the learning objective.
4. **Defend the choices honestly.** For each consequential choice, connect the
   requirement or constraint to its benefit and cost. Separate observed source
   facts, recorded decision rationale and your inference. An alternative in an
   ADR or discussion is evidence it was considered; an alternative you propose
   now is a present-day comparison, not invented history. Compare plausible
   alternatives on the constraint that matters and say what would change the
   choice. When historical reasons are missing, say so.
5. **Challenge the boundaries.** Use the same journey to consider a malicious
   actor and a realistic failure: authorization and tenant separation, untrusted
   input, retries, partial writes, concurrency, unavailable dependencies or data
   loss as applicable. Locate the actual enforcement and recovery paths. A
   comment or a test's existence does not prove the guarantee. Distinguish what
   source suggests, what a recorded run demonstrates, and what is unverified;
   name a concrete check that could falsify each important uncertain claim.
   Exercise only safe, authorized probes; proposed checks remain proposed.
6. **Give the model back to the user.** Close with the journey, key trade-offs
   and unresolved questions at a level they can explain themselves. Carry the
   same evidence labels and scope limits into this recap: compression must not
   turn inferred rationale into a recorded decision or a local finding into a
   system-wide guarantee. Offer an
   optional teachback or a few defense questions, such as how a duplicate request
   behaves or which constraint favors the chosen structure. If they take it up,
   use gaps in their explanation to revisit the relevant evidence. Do not claim
   they understand merely because you delivered a walkthrough.

Completion is an evidence-linked explanation of the selected journey, its data
and choices, with uncertainty and unexercised checks visible. Broaden only when
the user's question or a discovered dependency needs it. Missing source or runtime
access narrows the claims; it is not a reason to invent a complete architecture.

Use [domain-modeling](../domain-modeling/SKILL.md) when the user wants to refine
domain language, and [verification](../verification/SKILL.md) when they authorize
proving behavior. Those are follow-on tasks, not prerequisites to understanding.

Inspired by Mitchell Hashimoto's whiteboard-defense idea, supplied by the user:
people shipping customer-facing systems should be able to explain and defend
their design; experimental work need not carry the same burden. This procedure
is Misty's adaptation, not a quotation or a claim of endorsement.
