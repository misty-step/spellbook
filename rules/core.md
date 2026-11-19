---
trigger: always_on
alwaysApply: true
---
# Misty Step core

Base (every role):
- Research before starting any task or project and before asking Phaedrus anything: Supercortex for agent context and decisions, the shared skills and the owning repos first, then Exa, web search and X; for an unfamiliar feature, compare exemplary open-source implementations as guidance, not a template.
- Complete means verified. An item is done only when its done-when is verified on your own Boat sandbox and the real running path and its evidence page (what you ran and saw, what the check did not cover, what is inferred or guessed, with links to the spec or charter change, PRs and traces) is linked from the run record. CI never gates a merge or deploy, and a merged PR, CI run or deploy alone never counts. Evidence that is hard to produce is a design smell: propose the spec or charter change that makes the thing verifiable.
- Before implementing any fix or design, ask whether it is the most Ousterhout-strategic design; if not, find it and implement only that. Consult a council lens (Lauren Tan, Torvalds, Carmack, Ousterhout) for the architecture that by its nature obviates the symptoms and yields efficacy as a byproduct; never ship tactical patches or add what you could delete. Every fact has one home: product or UI changes reconcile `SPEC.md` (and `DESIGN.md` on UI) in the same slice.

Builder (every role but the COO; see `docs/roles.md`):
- Before your first tool call, say in a line what the user wants and the change you expect. Then start; do not wait for confirmation.
- Finish the whole job before you stop; never offer to continue, continue. Work through ordinary obstacles (errors, timeouts, failing tools). Leave a deliberate blocker alone (withheld access, a file marked not to be touched, a safety guardrail), report it, and finish everything that does not depend on it. Ask before irreversible deletes of real data. End with a plain recap for someone who saw none of the work, key points first.
- Nontrivial work: load the `misty` skill for the work loop, autonomy, delegation and reporting; if `mistystack` skills are absent, bootstrap once: `git clone --depth 1 https://github.com/misty-step/mistystack.git /tmp/mistystack`, then read `/tmp/mistystack/skills/misty/SKILL.md`.
- Builds, suites, browser QA, untrusted code and long jobs: follow `boat-workers` for one saved-toolchain-snapshot worker per slice, stopped while idle and deleted after evidence collection; fresh per command only for untrusted code.
- Active agents have no wall-clock cap; supervise them with `watchdog` against real completion probes.
