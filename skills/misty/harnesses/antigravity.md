# Antigravity mechanics

Mistystack ships a native Antigravity plugin (`.antigravity-plugin/plugin.json`) that bundles the [skills](../../../skills/) directory and the [always-on core](../../../rules/core.md) (`trigger: always_on`), plus `.agents/skills.json` and `.agents/rules.json` for workspace discovery.

## Install and update

Install the plugin locally through the Antigravity CLI (`agy`), which feeds Antigravity CLI, App, IDE and Remote Control:

```sh
agy plugin install https://github.com/misty-step/mistystack
```

Re-run the same command to update an existing installation under `~/.gemini/config/plugins/mistystack`. To test or load a local checkout directly:

```sh
agy plugin install /path/to/mistystack
```

If an earlier setup copied `mistystack` skills manually into `~/.gemini/config/skills/`, remove those copies so they do not shadow the plugin.

Verify the installed state:

```sh
agy plugin list --json
```

`mistystack` appears with `"enabled": true`, `"rules": ["core.md"]`, and all bundled skills including `misty` and `define-product`.

## Remote Agents (Antigravity Cloud) vs. Remote Control

- **Remote Control** (`agy remote-control start`, or App Remote Control) executes on your own workstation, supports local composite models such as `Orchestrator (Carbon)`, and already loads `~/.gemini/config/plugins/mistystack` across every repository without per-project setup.
- **Remote Agents (Antigravity Cloud)** run in isolated Google ACE microVMs that do not sync `~/.gemini/config/plugins/` yet, syncing account-global bundles only from the Antigravity Marketplace once published. In interactive `agy --remote-agent`, wait for login experiment flags to refresh; short-lived subcommands such as `agy --remote-agent models` can exit before refresh and report cloud conversations disabled.
- **Model selection on Remote Agents:** Composite two-phase models (`Orchestrator (Carbon)` and `Orchestrator (Argon)`) currently fail `remote:startCascade` with `INVALID_ARGUMENT (code 400)` on Antigravity Cloud. Select a direct single-model tier (`Gemini 4 Carbon (High)`, `Gemini 4 Carbon (Medium)`, `Claude Opus 5.5 (High)`, etc.) in the Cloud Project model picker, or use **Remote Control** to run `Orchestrator (Carbon)` against your workstation.

Provisioning `mistystack` in Cloud sessions (Remote Agents default to `always-proceed (turbo)`):

- **Root `AGENTS.md` (required baseline):** Include the current `<!-- mistystack:core -->` block ([Any harness](any.md)) in the target repository's root `AGENTS.md` so `# Misty Step core` loads on Turn 0 regardless of Resource settings.
- **GitHub Resource attachment (`/projects` → `Edit` → `Connections`):** Attaching `misty-step/mistystack` mounts the repository on Turn 0 at `/home/antigravity/misty-step/mistystack` (no `git clone` needed) and loads `rules/core.md`. Measured on live ACE microVMs: Antigravity Cloud's `list_skills` / `lookup_skill` index registers `.agents/skills/` only from the primary repository (not secondary Resources' `.agents/skills.json`), so read skills directly on disk at `/home/antigravity/misty-step/mistystack/skills/<name>/SKILL.md` where relative links resolve natively.
- **Without a Resource attached:** On nontrivial work, `rules/core.md` directs the agent to shallow-clone `https://github.com/misty-step/mistystack.git` to `/tmp/mistystack` and read `/tmp/mistystack/skills/misty/SKILL.md`. Read `/tmp/mistystack/skills/<name>/SKILL.md` directly on disk rather than expecting `lookup_skill` to pick up new symlinks mid-turn (`mkdir -p ~/.gemini/config/skills && ln -sfn /tmp/mistystack/skills/* ~/.gemini/config/skills/` writes to `/shared/user/.gemini`, but `lookup_skill` does not re-index within the same turn).

## Dispatch and rigor

Antigravity dispatches subagents via `invoke_subagent` (including built-in `research` and `browser` roles, plus custom `define_subagent` roles) and multi-agent boards via `swarm`. Model choices (`inherit`, `flash_lite`, `flash`, `pro`) stay in native `invoke_subagent` and `swarm` parameters rather than shared skill text.

For live web apps and browser QA, delegate directly to the built-in `browser` subagent (`Model: "flash"`) rather than scraping endpoints from the shell.

## Fresh-session proof

1. Start a fresh Antigravity session in another repository and confirm the agent states its one-line goal and planned change before its first tool call (showing `rules/core.md` loaded) and can load the `define-product` skill.
2. From a `mistystack` checkout with `agy` on `PATH`, run `./scripts/check plugin --strict` to verify isolated local installation in a disposable home directory.
