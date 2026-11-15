# Native repository integrations

Entire owns the generated hook bodies. Read the installed `entire --help`,
`entire agent add --help` and `entire configure --help`; use `entire agent add
<agent-name>` for each already-enabled native consumer. Preserve credentials,
checkpoint settings, permissions and unrelated hooks. Do not enable a new
integration merely because this reference exists.

Generated `.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json`,
`.gemini/settings.json`, `.omp/extensions/entire/` and `.entire/` runtime files
belong to the local installation and are ignored by the vault. Vendor plugins
own integrations absent from the built-in agent table; use their existing
installer instead of copying or hand-editing generated extension code.

For a tracked-to-local cutover, retain scoped private backups, preserve native
configuration through the ordinary repository synchronizer, regenerate through
the installed vendor command and compare the resulting enabled consumers and
settings. Never change the synchronizer's locks/index/refs or restart the core.
Do not claim preservation until installed readback succeeds.

The adjacent `entire-redactors.yaml` is the maintained generic token-shape
redaction pack. Copy it as a regular file into the native `.entire/redactors/`
directory when preserving an existing deployment; Entire 0.12.2 skips symlinked
packs. Read back the installed bytes and native pack loading. The resource
contains generic patterns, not private matching inputs.
Private matching inputs and auth state stay in local configuration. Reuse the
vendor's native validation/probe for a change; moving ownership does not grant
permission to publish session captures.
