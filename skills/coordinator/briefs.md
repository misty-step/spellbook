# Coordinator briefs

Copy-ready launch briefs for the [coordinator](SKILL.md) roles. Each one follows
[the misty brief](../misty/SKILL.md#the-brief); fill every `<...>`. Write long
briefs to a file and pass its contents.

## Launch an agent into a tab

Read `herdr-app ls` for the space ID. If the project has no space yet, create
one named for the project with `herdr-app do space.new --focus false` (see
`herdr-app commands` for its arguments). Then:

```sh
hc run --bg --outlive-parent --keep --name <project>-<role> --cwd <repository> \
  --label herdr.space=<space id> --label misty.role=<role> --label misty.project=<project> \
  <agent command> "<brief>"
herdr-app ls                                   # find the new tab's ID
herdr-app do tab.rename --id <tab id> --name <Ownership|Understanding|task name>
```

A `herdr.space` label opens a new tab, which Herdr names by its number. The
`where` label follows the tab's name, so set the name with `tab.rename` and not
with `where`. Add `--label herdr.tab=<tab id>` to put the agent in an existing tab
instead. Task agents that start, finish and are removed within a project owner's
session can drop `--outlive-parent` and `--keep`.

## Owner

```text
You own <repository> as its coordinator project owner, reporting to Chief of
Staff <chief terminal>; read <coordinator SKILL.md path>, <misty SKILL.md path>
and <ship-loop SKILL.md path>.
Context: <SPEC.md, docs, tracker, standing context>.
Goals: <what the user wants now>.
Constraints: <grants, held decisions, what to leave alone>.
First task: <brief or none>.
Report to the Chief when done or blocked, messaging it under herdr rule 6, and
stay alive in your space's "Ownership" tab.
```

## Understanding lane

```text
You are <project>-understanding, the understanding lane for <repository>,
launched by its owner <owner terminal>. Read <whiteboard-defense SKILL.md path>,
the "Project owner" section of <coordinator SKILL.md path> (the understanding
bullet is your role), <spec SKILL.md path> and <domain-modeling SKILL.md path>.

Outcome and why: the user can explain and defend <project>'s architecture, data,
trust boundaries and design choices from evidence, and SPEC.md, ARCHITECTURE.md
and the decision records stay true to the running system.
Raw material: <repository paths, history, PR list, read-only background>.
First task: <trace the system; write or reconcile ARCHITECTURE.md with file:line
citations on a local branch in a worktree; list SPEC.md disagreements as open
questions; write a whiteboard kit (purpose, component map, one sequence diagram,
data relationships, threat boundaries, 8 to 12 evidence-cited quiz questions) at
<path>>.
Scope and keep: you own only that branch and <kit path>. Do not push, open PRs,
merge, deploy, change configuration or start agents. <Paths the owner is editing.>
Effort: documentation, but every claim cites a file and line, and anything
unverified is marked inferred.
Return: report to the owner under herdr rule 6 with what you read, what you could
not verify and every decision you made. Then stay in your turn with
`hc wait --children any`, so the owner can send updates after each merge and the
user can come to the "Understanding" tab to be taught or quizzed.
```

## Task agent

Use the [builder brief](../ship-loop/roles.md#builder) for delivery work, or the
misty brief for research and checks. Add the agent's labels
(`misty.role=task`, `misty.project=<project>`), the owner to report to under
herdr rule 6, and whether it should stay alive after it reports.
