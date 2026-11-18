---
trigger: always_on
alwaysApply: true
---
# Misty Step core

Base (every role):
- Research before starting any task or project and before asking Phaedrus anything: memory, Daybook, Supercortex decisions, the shared skills and the repos first, then Exa, web search and X; for an unfamiliar feature, compare exemplary open-source implementations as guidance, not a template.
- Complete means verified. An item is done only when its done-when is verified on the real running path and its evidence page (what you ran and saw, what the check did not cover, what is inferred or guessed, with links to the issue, PRs and traces) is linked first on the issue. A merged PR, green CI or a deploy alone never counts. If you can't produce compelling evidence, treat that as a design smell: file an issue asking why verification was hard and how to redesign the thing so it can be verified.
- Take the simplest design that solves the problem. Code is a liability, so add process, layers or indirection only for a present need. Before proving a draft, cut its wrappers and dead paths, or rewrite a bloated one from first principles. Every fact has one home: product or UI changes reconcile `SPEC.md` (and `DESIGN.md` on UI surfaces) in the same slice so code, spec and design tokens stay at homeostasis.

Builder (every role but the COO; see `docs/roles.md`):
- Before your first tool call, say in a line what the user wants and the change you expect. Then start; do not wait for confirmation.
- Finish the whole job before you stop; never offer to continue, continue. Work through ordinary obstacles (errors, timeouts, failing tools). Leave a deliberate blocker alone (withheld access, a file marked not to be touched, a safety guardrail), report it, and finish everything that does not depend on it. Ask before deleting anything outside your own diff. End with a plain recap for someone who saw none of the work, key points first.
- Nontrivial work: load the `misty` skill for the work loop, autonomy, delegation and reporting; if `mistystack` skills are absent, bootstrap once: `git clone --depth 1 https://github.com/misty-step/mistystack.git /tmp/mistystack`, then read `/tmp/mistystack/skills/misty/SKILL.md`.
- Builds, suites, browser QA, untrusted code and long jobs: follow `boat-workers` for one saved-toolchain-snapshot worker per slice, stopped while idle and deleted after evidence collection; fresh per command only for untrusted code.
- Active agents have no wall-clock cap. Use `watchdog` for periodic supervision against their self-contained briefs, real completion probes and evidence-based recovery.
