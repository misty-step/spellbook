# Shaping facts

The shaping skills are Matt Pocock's, vendored unchanged under [the Pocock lock](../../vendor/pocock.lock.json): [grilling](../grilling/SKILL.md), [grill-me](../grill-me/SKILL.md), [grill-with-docs](../grill-with-docs/SKILL.md), [domain-modeling](../domain-modeling/SKILL.md) and [to-questionnaire](../to-questionnaire/SKILL.md). Agents find the facts and the owner decides each question. Do not run `setup-matt-pocock-skills`; the facts below replace the per-repository files it would write.

- **Spec and domain:** `SPEC.md` is the single target-state authority for product intent, stories, domain terms (`## Terms`) and invariants, owned by [define-product](../define-product/SKILL.md). Where the skills say `GLOSSARY.md` or `CONTEXT.md`, use the repository's `SPEC.md`. Where they say `docs/adr/`, use `docs/decisions/` and its `0000-template.md`.
- **Outputs and reconciliation:** after the owner confirms shared understanding in a grilling session, write product intent, stories and domain terms directly to `SPEC.md` (ahead of or alongside code) and architecture or stack decisions to a decision record. Do not publish feature specs to a tracker or split `SPEC.md` into a ticket backlog; reconcile `SPEC.md` against the running product directly through [define-product](../define-product/SKILL.md) and [ship-loop](../ship-loop/SKILL.md) until `SPEC.md` equals the running product.
- **Operational tracker:** Misty Step work starts from a committed `PRODUCT.md` or `DESIGN.md` change, a production alert or an Executive charter, and its state lives in the run record ([Foundation article 2](../foundation/checklist.md#article-2)); Linear is frozen. An R90 obligation keeps its Habitat record and native workflow states (`Todo` when ready).

Planning how to execute a settled outcome is ordinary work under [the loop](SKILL.md#the-loop); it does not decide product intent.

## Looking back

[retro](../retro/SKILL.md) is also Matt Pocock's, under the same lock. It reviews a session, by default the current one, for changes to the environment that would improve the next run. These facts replace its assumptions:

- **Reviewer and coding standards:** no per-PR reviewer runs under [ship-loop](../ship-loop/SKILL.md). A rule that a machine can check becomes a lint, type, test or script. A judgment call becomes a wording or trigger change in the owning skill or `AGENTS.md`, through [agent-design](../agent-design/SKILL.md).
- **Harness and spend:** also review model and role choices, effort levels, subagent fan-out, worker placement, wall time and spend observed in the session.
- **Standing instructions:** look for cautions and rules whose reason no longer holds, in `AGENTS.md`, skills, memory and notes. Delete them, or rewrite an absolute rule so that it states its scope and reason. Instructions pile up, and a model that follows them closely will hold back routine work.
- **Routing each accepted candidate:** repository checks and docs, harness configuration, models, credentials and extensions go to the repository that owns them. Each lands as a ship-loop slice.
- **Re-run proposals:** when a change claims better quality, cost or time, record it on the tracker as an experiment: the source session, starting commit, the single change and the check. Human answers may differ in the re-run; outside systems are recreated, not skipped. Running it depends on persistent traces ([MIS-889](https://linear.app/misty-step/issue/MIS-889)) and replay ([MIS-890](https://linear.app/misty-step/issue/MIS-890)).
