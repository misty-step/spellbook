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

## Prime Agent: completion-brief fallback

Reviewed **Prime Agent 0.10.3**, 2026-11-17: `prime-agent --help`,
`prime-agent help package`, `/opt/prime-agent/share/prime-agent/README.md`, and
local `~/.prime/agent/settings.json` (settings keys only; no auth file).
These surfaces document skills, prompt templates and autonomous quality gates,
but no native turn/session-finish callback capable of eliciting reflection.
This is evidence of no documented supported hook in this version, not proof that
no internal extension could exist. A quality gate is not a finish hook. No
`prime.json` or `hook prime` native integration is supplied.

Load the [completion brief](../../tools/friction/README.md#completion-brief-any-harness-including-grok)
as an explicit instruction in the bounded Prime task (or append-system-prompt),
not as an automatically discovered hook. At completion, run:

```sh
printf '%s\n' '{"session_id":"your-unique-run-id"}' |
  node /ABSOLUTE/mistystack/tools/friction/cli.mjs ask prime
```

Only if a brief is returned, reflect once and follow its `capture` instruction
with a concrete positive answer; a clean answer records nothing. The returned
`decision` wrapper is portable brief output, **not** a Prime hook protocol.
Use a stable explicit run ID, `FRICTION_MODEL=claude-sonnet-5` when selected by
runtime, a private `FRICTION_OUTBOX`, and `FRICTION_STORAGE_MODULE` pointing to the reviewed
Supercortex `tools/friction/storage.mjs`. That module persists locally; upload is
a separate operation and is not performed by capture. Retrying the identical
capture returns the same ID and does not replace or duplicate the saved record.
The brief uses the same persistent private pre-ask guard as other harnesses;
capture failure never clears it or licenses another reflection.

This fallback depends on the agent following the task instruction. It does not
cover abandoned/crashed sessions, automatic lifecycle delivery, future final
turns of open-ended chats, or independently finishing native subagents. Neither
capture nor ask reads transcripts or last messages.

## Pi: native extension

Reviewed **@mariozechner/pi-coding-agent 0.73.1**, 2026-11-17, from its
installed README, `docs/extensions.md`, `examples/extensions/send-user-message.ts`
and session-manager type declaration. The documented **agent_end** event fires
once per user prompt, after the agent finishes its tool turns. The extension
uses `sendMessage` with `triggerTurn: true`, `deliverAs: "followUp"` and
`display: false` to deliver the private completion brief. It ignores the event
payload entirely; it reads only session ID, working directory and runtime model
metadata. It never reads messages, transcripts or session entries.
See the [upstream extension API](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md).

Load explicitly without changing the default Mistystack package or operator
settings:

```sh
pi --extension /ABSOLUTE/mistystack/adapters/friction/pi/index.ts
```

Set a private `FRICTION_OUTBOX` and the required `FRICTION_STORAGE_MODULE` to
reviewed Supercortex storage before running. No storage implementation or default
storage-module path is supplied here. The generic CLI already supports
`hook pi`; its decision wrapper is consumed by this extension, not returned
as a Pi hook protocol.

The shared CLI claims its private persistent guard **before** the continuation.
Only the first bounded completion in a session can ask; the reflection's own
agent_end, subsequent prompts, reloaded extensions and capture failures cannot
ask again. Clean answers write nothing. This is not a final-future-turn hook.
Shutdown, cancellation, crashes, provider failure and independent subagents are
not qualified. Hidden delivery is a Pi UI flag, not a promise that a model will
keep its answer out of the user response.

Native delivery was exercised in **Pi 0.73.1 RPC mode** with the existing
OpenAI Codex OAuth subscription and custom model ID `gpt-6.1-sol` (accepted by
Pi despite being absent from its bundled model catalog). The client kept the
process alive through the task's agent_end and the reflection's agent_end.
Seeded validation hit a missing required system command and captured one
`harness=pi` observation; clean shell arithmetic captured none. Replaying the
seeded capture returned the same ID without modifying the stored file; replaying
its hook produced no new brief. These runs used externally pinned Supercortex
storage and local-only outboxes, with no upload.

**Do not rely on `pi --print` for this asynchronous adapter in the reviewed
version.** A retained print-mode attempt claimed the guard but exited before
delivering reflection; the successful qualification used persistent RPC transport.
Interactive delivery is documented by the same API but was not separately
exercised. A prior RPC missing-input task also yielded no observation: delivery
does not guarantee that a model judges a particular obstacle to be system
friction. All failed/superseded attempts remain attributed in the worker-local
MIS-1218 evidence, not counted as successful seeded proof.

Earlier readiness attempts used unsupported Codex model IDs or Anthropic's
funding-gated extra usage; they were superseded by successful subscription-only
`gpt-6.1-sol` readiness. No credentials, model definitions or billing settings
were changed. The repository's separate default-package inventory check uses
fork-specific Pi flags; its preinstalled-fork inventory is not canonical Pi live
proof. Contract tests use a fake Pi API and real shared CLI; real-session
evidence is retained separately under `~/m1218/evidence/`.
