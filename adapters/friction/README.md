# Finish-hook adapters

Opt-in examples for the portable [friction CLI](../../tools/friction/README.md).
These do not alter the default plugin hooks or live operator settings. Review the
command before enabling it. A native hook is a delivery mechanism, not a guarantee
that the model will answer or capture.

## Native loading

- **Codex 0.169.0:** `codex.json` uses plugin-native `$PLUGIN_ROOT`. For a
  scratch project, put its `hooks` object in `.codex/hooks.json` and replace the
  plugin-root path with the reviewed absolute CLI path. Project hooks require
  project trust and hook trust. One-off automation can supply the same inline
  `hooks.Stop`/`hooks.SubagentStop` config via `-c` and the native
  `--dangerously-bypass-hook-trust` flag after reviewing these exact commands;
  this does not persist trust. Use `--no-daemon` for isolated execution.
- **Claude Code 2.1.326:** `claude.json` uses `$CLAUDE_PLUGIN_ROOT`. For
  `claude -p --settings /PRIVATE/settings.json`, replace that path with the
  reviewed absolute CLI path. Stop and SubagentStop both support one model
  continuation; SessionEnd is advisory and cannot elicit an answer.
- **Antigravity:** `antigravity.json` uses its named-hook schema, not the
  Codex/Claude top-level `hooks` schema. Set `FRICTION_CLI` to the absolute CLI
  path, then opt into the file as workspace `.agents/hooks.json` or merge it
  into global `~/.gemini/config/hooks.json` without replacing other hooks.
  Antigravity CLI settings.json does NOT load hook definitions. Stop uses
  camelCase payload fields and `decision: continue`; only fully idle stops
  qualify. No native subagent-finish event is documented, so that path remains
  unsupported, not implied by the main-agent fixture.

## Guard and limits

Stop means a response/turn completion, not necessarily the end of a long
conversation. This adapter deliberately asks only at the **first bounded
completion per session** (and separately per named subagent), not every turn.
A persistent private guard is written before asking. `stop_hook_active` prevents
continuation recursion where supplied; the guard handles Antigravity, which has
no documented equivalent field. Capture failure cannot clear the guard or request
another continuation. Clean answers write no observation. Crashes, cancellation,
API failures and advisory SessionEnd cannot always solicit reflection; the
completion brief is the fallback, not a claim of universal finish coverage.

Hooks never read `transcript_path`, `transcriptPath`, `last_assistant_message`,
last user input or error bodies. Those fields may contain private transcript or
secret content. Evidence is a run pointer only. Use the explicit model override
for Claude, whose common payload does not promise a model field.

## References and fixture provenance

Reviewed 2026-11-17 against installed CLI help/features and official references:
[Codex hooks](https://learn.chatgpt.com/docs/hooks),
[Claude hooks](https://code.claude.com/docs/en/hooks), and
[Antigravity hooks](https://antigravity.google/docs/hooks).
The [Antigravity fixture](antigravity-stop.fixture.json) follows the documented
Stop example and proves only payload compatibility, not an authenticated run.
Local execution evidence and coverage status belong to the MIS-1194 worker
summary, not this version-independent adapter contract.
