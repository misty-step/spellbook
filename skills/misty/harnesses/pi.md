# pi mechanics

Use this reference when running Mistystack in pi. The native package exposes the
same root Agent Skills tree and core as the other adapters. These mechanics were
exercised with pi 1.4.0.

## Install and refresh

Install through pi's native Git package mechanism:

```sh
pi install git:github.com/misty-step/mistystack
```

Refresh that package explicitly:

```sh
pi update git:github.com/misty-step/mistystack
```

Do not substitute bare `pi update`: it updates pi itself, not this package.
In an isolated Git-backed refresh with pi 1.4.0, the package-specific command
pulled new skill content while the package version remained `0.2.49`. Content
refresh does not require a version bump; release labels remain independent, with
no synchronized adapter bump needed just to refresh content.

Run online with `PI_OFFLINE` unset. In pi 1.4.0, `PI_OFFLINE=1` printed `Updated`
without fetching in the isolated probe. Read the actual installed commit/content,
then start a fresh session; that success line alone is not refresh or loading
proof. Preserve unrelated packages, configuration, credentials and runtime data.

## Core, skills and relative links

The repository's `package.json` marks it as a `pi-package`, exposes root `skills/`
through `pi.skills`, and loads `adapters/pi/core.ts` through `pi.extensions`.
That extension's `before_agent_start` handler returns the existing system prompt
plus the shared `rules/core.md`; it does not replace pi's system prompt or copy
the method into an extension. A package on disk is not proof the extension ran.

Invoke `/skill:misty` or `/skill:<skill-name>`, or read the installed skill. Follow its
[ship-loop link](../../ship-loop/SKILL.md) relative to that installed file, not the
working directory or source checkout. pi enforces skill metadata and
`disable-model-invocation: true`: recompile, setup-mistystack and coordinator
remain out of automatic model invocation while explicit invocation and installed-file
reads can reach them.
Prove discovery and explicit reachability separately.

## Rigor inline, without subagents

pi 1.4.0 has no native subagent mechanism. This adapter supplies no `rigor-*`
agents, dispatch tool or per-agent model mapping. Apply the
[rigor tiers and responsibilities](../../ship-loop/roles.md#rigor) inline in the
current session, keeping the [Misty briefing contract](../SKILL.md) explicit.
Choose the main session's model and reasoning budget through pi's native model
configuration, not a fictional per-agent assignment or skill prose.

The author verifies the running path and merges without a reviewer. For the
release's single critical-correctness/security assessment, use a separately
briefed authorized session and retain its evidence. Use native observations and
steering for [watchdog](../../watchdog/SKILL.md) supervision rather than inventing
a subagent API or imposing an agent deadline.

## Drive the real UI

This adapter does not supply a browser integration. Use only an integration actually available and authorized in the
current pi session, after reading its native contract. Otherwise report the
browser path as unverified. The
[design review procedure](../../design/review.md) owns state selection; generated
screenshots or injected DOM are not real-path proof.

## Prove installation and fresh-session loading

Use isolated pi configuration and a scratch project for adapter verification;
never alter the operator's live configuration or copy live credentials into the
proof home. Retain the pi version, candidate revision, native install/refresh
output and installed-artifact readback. No-model installation is
`artifact verified`, not live behavior proven.

Start a fresh destination session and retain the system-prompt/extension evidence
that the installed core was appended before the agent ran. Demonstrate Misty
discovery and actual skill/read events that open installed Misty, follow its
relative ship-loop link and quote the first step. Check recompile's automatic
exclusion and explicit reachability separately. For any claimed model choice,
retain the actual main-session model identity and authorized task result. Do not
claim rigor-agent discovery or subagent dispatch in pi; neither is provided.
