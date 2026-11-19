# mistystack

Maintain one harness-neutral method tree in Agent Skills format
(`skills/<name>/SKILL.md`) and thin native adapters from this repository.
Read [SPEC.md](SPEC.md) for terms, invariants and consumer contracts. The
method must work on every harness we support: Claude Code, Codex, pi,
Prime Agent, Antigravity and Cursor ([ADR 0027](docs/decisions/0027-drop-omp.md)).
[The universal install](skills/misty/harnesses/any.md) is the contract; the native
adapters for Claude Code, Codex, pi and Antigravity are conveniences on top of it. Private runtime setup belongs to the workstation plugin.

## Route the change

| Path | Owns |
| --- | --- |
| `.claude-plugin/`, `.codex-plugin/`, `.antigravity-plugin/`, `.agents/plugins/`, `.agents/skills.json`, `.agents/rules.json`, `package.json` | Native plugin, marketplace, workspace discovery and pi package manifests; `.claude-plugin/marketplace.json` is the one list of pinned companion packs |
| `rules/core.md` | Always-on core; keep it at most 20 lines |
| `skills/misty/` | The method on one page: work loop, ownership, autonomy, delegation, reporting, routes; principles and native harness references beside it |
| `skills/` | Task procedures; frontmatter follows [agent-design](skills/agent-design/SKILL.md#skill-frontmatter). Skills under `vendor/*.lock.json` are upstream bytes; regenerate them through the lock |
| `adapters/` | Claude/Codex role agents and native hooks/extensions; model choices stay in harness-native configuration |
| `.agents/skills/verify-mistystack/` | This repository's consumer proof |
| `scripts/`, `.github/`, `.githooks/` | Checks, release protection and secret scanning |
| `docs/guide/`, `docs/exemplars.md`, `ATTRIBUTION.md` | Human guide, exemplars and source notices |
| `docs/decisions/`, `docs/postmortems/` | Decisions and incident records; historical paths remain historical |

This repository is yours to shape: merge duplication, fix what you find next to
your change and delete what is dead. Vendored skills are the exception; change
them only through their lock.

Edit maintained source, not installed plugin copies. Keep one home per fact;
migrate callers before deleting an old path. Fleet runtime, credentials, hosts
and launchers belong to private `misty-step/workstation`. Adapters use
native harness mechanisms, not a custom installer or duplicated method content.
Nothing in a shared skill may depend on one harness: tool names, URI schemes and
configuration belong in `skills/misty/harnesses/`.
The method is one page with no base document beneath it
([ADR 0026](docs/decisions/0026-one-page-method.md)); add to a task skill or a
sibling file before adding to [misty](skills/misty/SKILL.md), and check any new
instruction against [agent-design](skills/agent-design/SKILL.md#writing-for-current-models).
Use [boat-workers](skills/boat-workers/SKILL.md) for one snapshot-backed worker
per slice and [watchdog](skills/watchdog/SKILL.md) for open-ended agent supervision.

## Verify and release

Prove the changed running consumer through
[verify-mistystack](.agents/skills/verify-mistystack/SKILL.md), including isolated
native loading when that path changes. Report skipped/unproved paths separately.
Merge after your Boat proof passes; CI and review never gate. The release gate
runs `./scripts/check`, fast site proof and one critical-correctness/security
assessment on Boat before publishing. CI is one light scheduled battery (D-188).

`./scripts/bootstrap` installs repository secret-scanning hooks. Landmark owns
CHANGELOG.md and release publication; follow
[docs/release-convention.md](docs/release-convention.md).
