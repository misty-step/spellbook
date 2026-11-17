# Portable friction contract (MIS-1194)

Implements Supercortex initiative decision 28; collection separation follows decision 26.
Native hook integration is opt-in, not installed into the operator's profile by this change.

`node tools/friction/cli.mjs capture` accepts one JSON line on stdin:

```json
{"answer":true,"harness":"other","session":"run-1","boundary":"completion:main","project":"project-name","model":"unknown","collection":"business","evidence":"run:run-1","impact":"Blocked verification","text":"The configured check executable was missing from the worker."}
```

Set `FRICTION_STORAGE_MODULE` to the absolute path of Supercortex
`tools/friction/storage.mjs`. `FRICTION_OUTBOX` selects a private directory (default
`~/.local/state/misty/friction`). The storage implementation owns atomic persistence.
No network is used by capture. `FRICTION_MODEL` overrides submitted model identity. Model is `unknown` unless supplied from runtime;
never infer provider identity from a model's self-report.

Schema 1 records retain the fields above (without `answer`) plus `timestamp`, `schema`
and `id`. ID is SHA-256 of JSON `[harness,session,boundary,normalized text]`; NFKC,
trim and whitespace collapse normalize text. At most 2000 text characters, bounded
metadata, pointer-only evidence. Secret screening rejects recognizable credentials,
assignment-like secrets, private keys and long opaque strings; it is conservative,
not a proof against every possible encoded secret. Do not submit transcript bodies.

## Completion brief (any harness, including Grok)

At the end of the assigned bounded work, privately ask yourself once:
“Did anything about the system annoy or hinder you?” If no, write nothing. If yes,
write one concrete observation JSON line to the capture command above. Name what
happened and its consequence; reference evidence, never copy its contents. Set the
real harness/run/model (or `unknown` model), collection and completion boundary.
First invoke `node tools/friction/cli.mjs ask HARNESS` with
`{"session_id":"run-1"}` on stdin; only reflect if it returns a question. Repeated
calls return nothing. Never include the reflection in the user-facing answer.
Capture is best effort. Failure does not justify a second reflection or agent run.
Do not use this brief or hooks for upload/synthesis bookkeeping (`FRICTION_DISABLED=1`).

## Lifecycle and limits

`hook HARNESS` consumes native JSON. A durable exclusive guard per harness/session/
agent is created **before** returning one blocking reflection request. It ignores
`stop_hook_active`; a failure is fail-open. A crash after claiming the guard can
lose the prompt: at-most-once is preferred to continuation loops. Stop is normally
turn-scoped, not a true conversation-end signal: opt in for bounded execution,
not an open-ended chat expecting reflection on its final future turn. Guarding
means multiple turns cannot prompt repeatedly. SessionEnd cannot ask a departed
model; it is advisory/no-op. Failure/abandonment with no model continuation remains
unsupported. No daemon, polling, model call or transcript parsing is introduced.

Run `node --test tools/friction/*.test.mjs`. Native availability and exercised
versions belong in the worker proof matrix, not an assertion of universal support.
See `adapters/friction/` for native settings and documented fixture coverage.
