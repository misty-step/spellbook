# Codex mechanics

Use this reference when running Mistystack in Codex. The adapter exposes the
shared Agent Skills tree and core through native plugin loading. These mechanics
were exercised with Codex 0.164.0.

## Install and refresh

With Codex installed, add the marketplace and install the plugin:

```sh
codex plugin marketplace add misty-step/mistystack
codex plugin add mistystack@mistystack
```

For an existing install:

```sh
codex plugin marketplace upgrade mistystack
codex plugin add mistystack@mistystack
```

In an isolated Git-backed refresh with Codex 0.164.0, these commands replaced
installed skill content after the source commit changed while the manifest
version remained `0.2.49`. Content refresh does not require a version bump;
release labels remain independent, with no synchronized adapter bump needed just
to refresh content. Inspect the installed revision/content and start a fresh
session: command success alone is not loaded-method proof. Preserve unrelated
plugins, configuration, agents, credentials and runtime data.

## Core, skills and relative links

Codex 0.164.0 loads this adapter from `.codex-plugin/plugin.json`, which points to
root `skills/` and `adapters/codex/hooks.json`. A root `plugin.json` suppresses
these hooks in the exercised runtime; do not add one as an equivalent manifest.
The `SessionStart` command hook reads `"$PLUGIN_ROOT/rules/core.md"` to supply the
shared always-on core. Codex requires one-time trust for plugin hooks; complete
that native trust step before claiming core injection: review it with `/hooks` in
Codex, or through Codex's own app-server RPC by reading `hooks/list` and
upserting the hook's `key` with its `currentHash` as `trusted_hash` under
`hooks.state` with `config/batchWrite`. Until trusted, `codex exec` prints
`hook: SessionStart Failed` and the core is absent. Do not bypass the check or
replace foreign trust settings. Codex stores a content hash with each trust, so
check `hooks/list` trust status again after a refresh.

Use Codex's native skill mechanism with `mistystack:misty` or
`mistystack:<skill-name>`. Follow Misty's [ship-loop link](../../ship-loop/SKILL.md)
relative to its installed file, not the working directory or a checkout copy.
Codex does not enforce `disable-model-invocation`; recompile,
setup-mistystack and coordinator also carry `agents/openai.yaml` with
`policy.allow_implicit_invocation: false`. Check that they are excluded from
implicit invocation while explicit invocation and installed-file reads still
reach them.

## Dispatch and rigor

Codex plugins do not deliver custom agents in the exercised runtime. To enable
native rigor dispatch, install the supplied
[rigor-light](../../../adapters/codex/agents/rigor-light.toml),
[rigor-standard](../../../adapters/codex/agents/rigor-standard.toml) and
[rigor-critical](../../../adapters/codex/agents/rigor-critical.toml) TOML definitions
as separate files in the target `$CODEX_HOME/agents/` directory. Resolve the target
Codex home first; do not assume a plugin's agent directory is scanned. Inspect
existing files and reconcile same-name conflicts without replacing unrelated
agents. Reconcile these Mistystack-owned definitions again on an upgrade; plugin
refresh alone does not update separately installed native agents.

The native TOML keys are `name`, `description`, `model`,
`model_reasoning_effort` and `developer_instructions`. Keep model and reasoning
choices in those native fields, not skill prose. Shipped
templates are starting choices, not proof of provider entitlement: review and
replace their model/reasoning fields as needed for the destination account before
installing. Preserve the agent instructions while selecting an accessible model
and supported reasoning level by explicitly invoking
[setup-mistystack](../../setup-mistystack/SKILL.md).

Use Codex's native subagent mechanism to select `rigor-<tier>` according to the
[rigor contract](../../ship-loop/roles.md#rigor). Supply the
[Misty briefing contract](../SKILL.md), naming builder, verification, supervisor
or release reviewer as the responsibility. The author proves and merges the PR;
the release receives one critical assessment. Confirm discovery and actual model
identity in a fresh session; a TOML file on disk is not dispatch proof.

## Drive the real UI

This adapter does not supply a browser integration. Use only an integration actually available and authorized in
the current Codex session, after reading its native contract. Otherwise report
the browser path as unverified. The
[design review procedure](../../design/review.md) owns state selection; generated
screenshots or injected DOM do not prove the real interaction.

## Prove installation and fresh-session loading

Use an isolated Codex home and scratch project for adapter verification; never
write to the operator's live configuration or copy live credentials into the
proof home. Retain the Codex version, candidate revision, native commands and
installed artifact readback. An install without a model run is
`artifact verified`, not live behavior proven.

After completing native hook trust, start a fresh destination session. Retain
actual evidence of the installed core's `SessionStart` injection, Misty discovery,
and the skill/read events that open installed Misty, follow its relative ship-loop
link and quote the first step. Check recompile's implicit exclusion and
explicit reachability separately. Discover the separately installed rigor agents
and, for live dispatch proof, retain an authorized task's agent, actual model
identity and result. A model's self-report or config readback alone is not proof
that a hook or agent was used.
