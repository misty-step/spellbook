---
name: herdr
description: "When Herdr is mentioned, inspecting its spaces or agents, or checking session identity: distinguish the current hc/herdr-app runtime from the legacy herdr CLI."
metadata:
  owner: phaedrus
  prevents: "2026-11-14: active agent guidance lived in a context vault, coupling instruction discovery to private data."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# Herdr routing

1. **Identify before choosing a manual.** Inspect `HC_TERMINAL_ID` and
   `command -v hc herdr-app herdr`. `HC_TERMINAL_ID` is a core terminal address;
   confirm it with `hc get "$HC_TERMINAL_ID"`. Use `herdr-app ls` to associate
   terminals with visible spaces, tabs and panes. A terminal may have no pane.
   If the variable is absent, `hc ls` and `herdr-app ls` can still establish
   a running core/window; absence alone does not establish unavailability.
2. **Current app:** read `hc --skill` for terminal and agent lifecycle and
   `herdr-app --skill` for visible spaces, tabs, panes and focus. These installed
   manuals own syntax. Launch Codex with `--no-daemon` so its tools run inside
   its hc terminal.
3. **Legacy CLI:** resolve `herdr` and inspect its version. PATH may select
   different installations. Read `herdr --skill` only for an explicitly legacy
   task/session, after checking its own `HERDR_ENV=1` context. That gate does
   not apply to the current app. Missing `HERDR_ENV` is normal in herdr-core;
   `TERM_PROGRAM=ghostty` is compatibility metadata, not window identity.
4. **Coordinator roles:** the Chief of Staff, project owner, understanding lane
   and task agent roles apply only when the user invokes
   [coordinator](../coordinator/SKILL.md) or a parent's launch brief assigns one.
   Read the installed manuals before any launch.
5. **Preserve the workspace.** Inspect live IDs before mutations. Discovery
   does not authorize restarting the app/core, changing credentials, granting
   hook trust or changing other sessions. Use ordinary file/skill discovery
   when automatic injection is absent. Clean up only owned resources.
6. **Message only a live agent.** A terminal whose agent exited can be a shell
   that keeps its labels, and text sent there runs as commands. Read `hc get`
   first. For `idle` or `working`, use `hc send --if <that status>`. For `done`,
   run `hc interrupt`; if it then shows `idle`, send with `--if idle`. If it
   stays `done`, or shows anything else, send nothing: tell the user, who can
   resume it in its space, and check again later. Never use `--force`. An agent
   that expects messages stays in its turn with `hc wait --children any`, where
   it shows `working`.
