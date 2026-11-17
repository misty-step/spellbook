# Private friction at bounded completion

This step covers a journey through Misty's loop, including its linked playbooks,
not each nested skill call. If the runtime has enabled a native
[finish adapter](../../adapters/friction/README.md), let that adapter ask; do not
also run a completion brief. Without one, use the existing
[portable completion brief](../../tools/friction/README.md#completion-brief-any-harness-including-grok):

1. Resolve the installed Mistystack root from this file. Use the current harness
   name and its stable session ID from runtime metadata (or an explicitly supplied
   unique bounded-run ID). Do not inspect transcripts or last messages to find it.
2. With the operator's private `FRICTION_OUTBOX` and required
   `FRICTION_STORAGE_MODULE` configured, pass `{"session_id":"<stable ID>"}` to
   `node <installed-root>/tools/friction/cli.mjs ask <harness>`.
3. If a brief is returned, reflect once and follow its `capture` instruction for
   a concrete positive answer only. A clean answer writes nothing. Empty output
   means already asked or disabled; finish without another reflection. Capture
   failure never licenses another ask. Keep reflection out of the user response.

If the CLI, runtime identity or external storage is unavailable, finish the work
and report that capture was unavailable, without inventing a session identity or
installing storage. This step neither enables hooks nor uploads observations.
Direct skill invocations that bypass Misty's loop are not covered by this step.
