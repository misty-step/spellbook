---
name: trace-mining
description: "Continuously mine session transcripts, human corrections, friction logs and agent traces for recurring failures and flows; triage by leverage; graduate each recurring pattern into the smallest durable artifact (a deterministic check, a sharper skill rule with its why, or a pruned workflow); and measure whether it stops recurring."
---

# Trace mining

Every correction a human types, every harness stall and every "no, not like that" is free signal about where the method is wrong. Left in transcripts, it is lost, and the same failure returns next week in another repository with another agent. Trace mining turns that exhaust into craft on a regular cadence — and, as often, into deleting scaffolding that no longer earns its place.

## Sources

Read raw material, not summaries: session transcripts and chat logs, review comments and rejected changes, friction logs and postmortems, archived agent traces (tool calls, retries, timeouts, aborted runs), and diffs where a human rewrote agent output. Redact secrets and personal data before anything leaves its source; quote only the evidence a cluster needs and link to the rest.

## Extract

Cluster by failure shape, not surface wording:

- **Rejections** of UI, copy or visual output, and what the human asked for instead.
- **Repeated human corrections** — the same instruction restated across sessions is the loudest signal there is.
- **Tool and harness stalls** — hangs, retry loops, permission walls, flaky checks, context blowouts.
- **Recurring multi-step flows** — sequences agents rebuild by hand every time.

Each cluster records a one-line pattern name; its count and spread (sessions, repositories, agents, weeks); two or three verbatim excerpts with links; and the first point where the run diverged from what was wanted, drawn as an Execution Route Map from the `present` skill.

## Triage by leverage

A one-off bug is fixed where it lives or ignored; it never becomes method. A pattern graduates only when it recurs across sessions or contexts, costs real human attention or rework, and has a cause the method can move. Rank by frequency × cost × fixability and take the top few, not the whole list. Look for the shared root under the symptoms: five separate copy rejections may be one missing rule.

## Graduate

Turn each graduating pattern into the smallest durable artifact that would have prevented it, preferring the first that fits:

1. **Deterministic check** — a lint, test, script or harness guard whenever a machine can detect the failure; a check never forgets.
2. **Sharper skill rule** — one or two sentences stating the invariant and *why*, placed in the skill that already owns that judgment, with a concrete counterexample from the evidence; never a new playbook.
3. **Pruned or reshaped workflow** — remove the step that caused the stall, fold a repeated flow into a script, or fix the harness default.

Graduation is also subtraction. In the same change, delete rules, steps and guards the evidence shows are obsolete, contradicted or absorbed by model capability. Keep graduated text portable: state the pattern, never the incident, its people or its project.

## Measure

Each graduated artifact names the signal that proves it works — the cluster it targets and how to count it in fresh traces. The next mining pass checks whether that failure stopped recurring. If it recurs, the fix was wrong or in the wrong place: revise or remove it instead of stacking another rule on top. Keep a short ledger (pattern, evidence links, artifact, date, recurrences since) beside the method, outside every agent's always-on context.

## Cadence

Mine on a schedule — weekly, or after each large batch of runs — as a cold reader: an agent that did not produce the traces, reading the raw logs. Hand back clusters, proposed graduations and proposed deletions as one reviewable change, presented as the `present` skill describes, so the decision-maker chooses what graduates.
