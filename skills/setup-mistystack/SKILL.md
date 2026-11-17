---
name: setup-mistystack
description: "When installing or refreshing mistystack, or assigning native model, reasoning or rigor settings for the active harness."
disable-model-invocation: true
metadata:
  owner: phaedrus
  prevents: "Model choices duplicated in method prose, setup written to the wrong harness, and install readback mistaken for live proof; #533 Q2/Q14 and #591."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-11-27"
---

# Setup mistystack

Model and reasoning choices belong in the active harness's native authority, not
a second roster in method prose. One root `skills/` tree and `rules/core.md`
supply the method to every adapter.

1. **Detect.** Establish the active session's harness, native version and target
   profile/home from the runtime itself. An installed executable alone does not
   identify the active harness. If configuring a different destination, name it
   explicitly and keep every operation in that destination's scope. Read the
   matching note before writing:

   | Harness | Native mechanics |
   | --- | --- |
   | Claude Code | [Claude Code](../misty/harnesses/claude.md) |
   | Codex | [Codex](../misty/harnesses/codex.md) |
   | pi | [pi](../misty/harnesses/pi.md) |
   | Antigravity | [Antigravity](../misty/harnesses/antigravity.md) |
   | Cursor, Prime Agent and any other | [Any harness](../misty/harnesses/any.md) |

   Grok Bot runtime setup is private fleet machinery, outside this adapter table.
   **Complete when:** the runtime, version, destination scope and matching native
   contract are known.

2. **Inspect and install.** Read existing native settings, plugin/package state,
   role definitions and relevant project/user overrides. Follow the note's native
   install or refresh path, including any required hook trust. Preserve unrelated
   configuration, agents, plugins, credentials and runtime data; merge owned
   entries instead of replacing whole files. Never copy live credentials into a
   scratch proof home. Inspect the installed artifact after refresh rather than
   assuming the catalog or an unchanged version means the files are current.
   **Complete when:** the intended artifact is installed in the intended scope,
   core/skill wiring is configured, and foreign state is preserved. This is not
   yet live loading proof.

3. **Choose.** Read [roles.md](../ship-loop/roles.md#rigor) for the tier and required
   responsibilities. Inspect the active harness's accessible models, supported
   reasoning levels and existing assignments without exposing credentials. A
   catalog entry or shipped template is not proof of provider entitlement. Keep
   usable existing choices; carry settled budget choices forward. Choose model
   and effort from the [routing reference](../misty/routing.md).
   Then ask for missing budget or provider choices together. The matching note's dispatch and rigor
   section says what is assignable in that harness, including harnesses that run
   rigor inline.
   **Complete when:** every applicable native assignment uses an accessible model
   and supported reasoning setting. Builder, supervision and release-review
   responsibilities follow ship-loop; setup does not add PR approval roles.

4. **Persist through native authority.** Apply and read back only the selected
   harness's owned assignments, exactly as its note's dispatch and rigor section
   describes: [Claude Code](../misty/harnesses/claude.md#dispatch-and-rigor),
   [Codex](../misty/harnesses/codex.md#dispatch-and-rigor),
   [pi](../misty/harnesses/pi.md#rigor-inline-without-subagents),
   [Antigravity](../misty/harnesses/antigravity.md#dispatch-and-rigor),
   [any other](../misty/harnesses/any.md#3-roles-and-effort).
   Prove an unfamiliar config mechanism in an isolated home first.
   **Complete when:** native readback matches the chosen assignments and any
   shadowing is resolved explicitly. Readback proves persistence, not provider
   access or successful inference.

5. **Prove a fresh destination session.** Follow the matching note's consumer
   proof. Retain runtime version, candidate revision, install/config results and
   actual events showing the core loaded, installed Misty was discovered/read,
   and its relative ship-loop link reached the installed skill. Check explicit-only
   discovery policy and explicit reachability separately. Where native rigor
   agents exist, prove their discovery and a short authorized dispatch with actual
   agent/model identity and result. In pi, prove the main-session path instead.
   **Complete when:** the claimed consumer path has observed evidence. Report
   no-model installation and file/config readback as `artifact verified`, not live
   behavior proven; name missing inference, browser or dispatch proof explicitly.

Re-running setup reconciles the same owned native entries. Retire an entry only
after its callers migrate; never remove unrelated configuration or credentials.
