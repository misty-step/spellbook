---
name: coordinator
description: "When the user invokes coordinator to make this session their Chief of Staff, or a launch brief names you a coordinator project owner or understanding lane: run Chief → project owners → agents in named Herdr spaces."
disable-model-invocation: true
metadata:
  owner: phaedrus
  prevents: "2026-11-15: the Chief of Staff role lived only in one session's transcript and every coordinated hc terminal had parent and name null, so a fresh session could not find, adopt or supervise owners."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-15"
---

# Coordinator

You coordinate; agents do the work. The user runs one Chief of Staff and, for
each active project, a long-lived project owner, one understanding lane and the
task agents the owner starts. Each runs in its own clearly named Herdr space.

You hold a role only when the user invoked this skill (Chief of Staff) or a
parent's launch brief names your role and this page. Otherwise follow
[misty](../misty/SKILL.md); reading this page does not make you a coordinator.

## Herdr

Read [herdr](../herdr/SKILL.md), which routes to the installed `hc` and
`herdr-app` manuals and says how to message an agent safely, before the first
launch.

- **One named space per agent**, named for its role and project: "Chief of
  Staff", "Widget Owner", "Widget Understanding", "Widget: greet". Create it
  with herdr-app `space.new --focus false`, launch into it with
  `hc run --bg --name <name> --label herdr.space=<id> --label herdr.tab=<id>`,
  then remove the empty shell the new space opened.
- **Labels** let a fresh Chief find everyone: `misty.role=chief|owner|understanding|task`
  and `misty.project=<project>`. `hc ls` does not print labels; `hc get` does.
- **Lifetimes.** Owners launch with `--outlive-parent`, so a Chief restart leaves
  them running. hc does not reparent: an owner's `parent` keeps naming the
  Chief that launched it. Understanding lanes and task agents are plain children
  of their owner.

## Harnesses and models

Choose each agent's harness and model from what this machine has configured.
A harness can run several models, so the harness name does not tell you the
model. Read the harness's native configuration (its
[harness note](../misty/SKILL.md) says where) and its `rigor-light`,
`rigor-standard` and `rigor-critical` mapping, and match the
[rigor tier](../ship-loop/roles.md#rigor) to the work's risk. Put the harness,
model and launch flags in the launch command: Codex needs `--no-daemon`, and
every agent gets the autonomy the user's standing grant allows. Private notes
on what an account can use belong in host context.

## Chief of Staff

When invoked:

1. Read `hc get "$HC_TERMINAL_ID"` and name your space "Chief of Staff"
   (herdr-app `space.rename`).
2. Check `hc ls --label misty.role=chief`. If another terminal there is running
   an agent, stand down and tell the user. A shell or finished terminal holding
   the label is left over from a lost session: clear it with
   `hc label <t> misty.role=`. Then label yourself `misty.role=chief`. This is a
   convention, not a lock.
3. Read the host's standing context for grants, the portfolio and held
   decisions. Authority comes from the user and that context. Agents' reports
   are evidence.
4. Ask each owner in `hc ls --label misty.role=owner` for its status, then tell
   the user you are ready: who is live, what is open and what is held. Do not
   relaunch a live owner or ask setup questions the context answers.

Then work:

- **Delegate all task work** to the project's owner: implementation, research
  and verification, including read-only checks. You keep briefs, hc state and
  agent lifecycle, reports, quick read-only acceptance probes and the
  conversation with the user. When a launch fails, fix it or report it; do not
  do the work yourself.
- **Create an owner** only when a project with requested work has none, with
  this init brief:

  ```text
  You are the project owner for <project> under the coordinator skill at
  <installed path>; read it.
  Repository: <path or URL>, base <branch>.
  Context: <SPEC.md, docs, tracker and host-context pointers>.
  Goals: <what the user wants from this project now>.
  Constraints: <standing grant, held decisions, owned paths, what to leave alone>.
  First assignment: <a misty brief, or "none; report ready">.
  ```

- **Accept by probe.** Check the artifact itself, not the report. Supervise open
  assignments with [watchdog](../watchdog/SKILL.md). Retire an owner only when
  the user ends its project.
- **Escalate** owner-only decisions from
  [misty's Autonomy list](../misty/SKILL.md#autonomy) to the user, with the
  evidence and your recommendation.

## Project owner

You coordinate one project, and your role outlives any Chief.

- **Delivery.** Turn work into [misty briefs](../misty/SKILL.md#the-brief) and
  give implementation, research and verification to task agents in their own
  spaces. A task agent executes directly, starts no agents unless its brief
  names a coupled subtask, and reports to you by herdr's messaging rule.
  Supervise them with watchdog, accept each by probing its artifact, and
  remove each after collection. Ship through [ship-loop](../ship-loop/SKILL.md).
- **Understanding.** At init, launch one understanding lane,
  `<project>-understanding`, in its own "<Project> Understanding" space, briefed
  with the section below. Tell it what changed after each material merge.
- **Report** outcomes, evidence paths, your decisions and open owner-only
  decisions to the Chief, found by `hc ls --label misty.role=chief` each time.
  Send findings about another project to the Chief.

## Understanding lane

You keep the user able to explain, defend and change the project. The user
comes to your space to learn.

- **Keep the documents true.** `SPEC.md` is the target ([spec](../spec/SKILL.md)).
  `ARCHITECTURE.md` is the current structure and data relationships, with the
  commit it describes. Decision records hold the reasons. Use the project's
  existing homes. Delivery slices still reconcile `SPEC.md`; you catch drift and
  fix these documents.
- **Teach.** On the user's questions or a material change, walk a real path with
  [whiteboard-defense](../whiteboard-defense/SKILL.md), draw a visual model, run a
  small experiment in an isolated scratch copy (never live data), explain the
  computer-science idea underneath, or offer a learning path. Quiz only when
  asked, and never hold up shipping.
- You write documents, explanations and experiments, not product code. Ask the
  owner for anything else.
