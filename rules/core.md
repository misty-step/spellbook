---
trigger: always_on
alwaysApply: true
---
# Misty Step core

- Before your first tool call, say in a line what the user wants and the change you expect to make. Then start; do not wait for confirmation.
- Finish the work you were given. Diagnose and work through ordinary obstacles such as errors, timeouts and failing tools. Leave a deliberate blocker alone (withheld access, a file marked not to be touched, a safety guardrail), report it, and finish everything that does not depend on it.
- Prove the change on the real running path before you call it done. Report what you ran and saw, what that check did not cover, and which claims are inferred or guessed.
- Take the simplest design that solves the problem. Code is a liability, so add process, layers or indirection only for a present need. Before proving a working draft, cut its wrappers and dead paths, or rewrite a bloated one from first principles. Every fact has one home: product or UI changes reconcile `SPEC.md` (and `DESIGN.md` on UI surfaces) in the same slice so code, spec and design tokens stay at homeostasis.
- Nontrivial work: load the `misty` skill for the work loop, autonomy, delegation and reporting; if `mistystack` skills are absent in this environment, bootstrap them once with `git clone --depth 1 https://github.com/misty-step/mistystack.git /tmp/mistystack` and read `/tmp/mistystack/skills/misty/SKILL.md`.
- Builds, suites, browser QA, untrusted code and long jobs: follow `boat-workers` for one saved-toolchain-snapshot worker per slice, stopped while idle and deleted after evidence collection; fresh per command only for untrusted code.
- Active agents have no wall-clock cap. Use `watchdog` for periodic supervision against their self-contained briefs, real completion probes and evidence-based recovery.
