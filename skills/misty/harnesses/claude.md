# Claude Code mechanics

Use this reference when running Mistystack in Claude Code. The adapter exposes
one shared Agent Skills tree; it does not maintain a Claude-only method. These
mechanics were exercised with Claude Code 2.1.309.

## Install and refresh

With Claude Code installed, add the marketplace and install the plugin:

```sh
claude plugin marketplace add misty-step/mistystack
claude plugin install mistystack@mistystack
```

For an existing install:

```sh
claude plugin marketplace update mistystack
claude plugin update mistystack@mistystack
```

The Claude manifest omits `version`, so Claude Code 2.1.309 uses commit-based
updates. Content refresh does not require a release-version bump or synchronized
version changes across adapters. Refresh the catalog and installed plugin, inspect
the installed revision/content, then start a fresh session; a successful update
command alone does not prove the intended revision is loaded.
Explicitly invoke [setup-mistystack](../../setup-mistystack/SKILL.md) for native rigor assignments.
Preserve unrelated plugins, settings, credentials and runtime data.

The same marketplace lists the pinned [companion packs](any.md#companion-packs);
install one by name, for example `claude plugin install impeccable@mistystack`.

## Core, skills and relative links

The plugin's `SessionStart` command hook reads
`"${CLAUDE_PLUGIN_ROOT}/rules/core.md"`; its output supplies the shared always-on
core to a new session. Installed files alone do not prove that hook ran. Claude
Code reads repository `AGENTS.md` natively from 2.1.277 onward; this adapter does
not require `CLAUDE.md` or a duplicate standing-instruction file.

Invoke `/mistystack:misty` or `/mistystack:<skill-name>` through Claude's native
skill mechanism. Follow Misty's [ship-loop link](../../ship-loop/SKILL.md) relative to
the installed skill file, not the working directory or a source checkout.
Recompile, setup-mistystack and coordinator retain
`disable-model-invocation: true`: Claude does not invoke them automatically,
while a user can invoke them explicitly or read their installed files.
Check discovery and explicit reachability separately.

## Dispatch and rigor

Use Claude Code's native subagents with the [Misty briefing contract](../SKILL.md).
The plugin explicitly lists
[rigor-light](../../../adapters/claude/agents/rigor-light.md),
[rigor-standard](../../../adapters/claude/agents/rigor-standard.md) and
[rigor-critical](../../../adapters/claude/agents/rigor-critical.md).
The explicit `adapters/claude/agents/` manifest array replaces Claude's default
root `agents/` scan. Select the matching agent for
the [rigor tier](../../ship-loop/roles.md#rigor), and put the worker's responsibility
in the brief. The author proves the running path and merges. A separately briefed
reviewer performs the single critical-correctness/security assessment at release.

The native agent frontmatter is the model authority. The supplied agents set
`model: inherit`, so a worker runs on the session's model, and vary `effort`:
`low` for light, `medium` for standard and `high` for critical. A tier that sent
critical work to a weaker model than its parent would invert the tier. Lower
effort is the cheap way to run a fully specified slice; raise a tier to `xhigh`
only where you have measured a gain. To put light work on a cheaper model,
change that agent's `model` field in the target installation.
These are Claude-native selections. Inspect native agent
configuration and any overrides in the target installation; do not maintain model
choices in skill prose or edit plugin-cache copies as durable configuration.
Retain actual agent/model identity from an authorized dispatch before claiming a
chosen mapping works.

## Long turns

The [routing reference](../routing.md) sets effort by role. During a long turn the
model may go quiet between tool calls; that is expected for unattended work, and
the closing report carries what the reader needs.

## Drive the real UI

This adapter does not supply a browser integration. Use only a browser integration actually available and
authorized in the current Claude session, after reading its native contract.
Without one, report the browser path as unverified rather than manufacturing UI
proof. The [design review procedure](../../design/review.md) owns state selection.

## Prove installation and fresh-session loading

Use isolated Claude configuration and a scratch project for adapter verification;
keep the operator's live configuration and credentials untouched. Retain the
Claude version, candidate revision, native install/refresh output and installed
artifact readback. Installation and file checks without inference are
`artifact verified`, not live behavior proven.

In a fresh destination session, retain evidence that the `SessionStart` hook
supplied the installed core, Misty is discoverable, and an actual skill/read event
opens installed Misty and follows its relative ship-loop link to the first step.
Check that recompile is excluded from automatic invocation but explicitly
reachable. Prove native rigor-agent discovery separately; a short authorized
dispatch must retain its selected agent, actual model identity and result before
claiming live dispatch. A model's self-report alone is not loading proof.
