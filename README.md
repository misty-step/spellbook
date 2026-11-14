# mistystack

Misty Step's harness-neutral engineering method. One content tree uses the open
Agent Skills format, `skills/<name>/SKILL.md`; thin native adapters from this
repository connect it to a harness without copying the method or adding a custom
installer. A small always-on core
stands alone for small work and routes nontrivial work through
[misty](skills/misty/SKILL.md), one page that holds the work loop, ownership,
autonomy, delegation and reporting.

The method carries what a capable model cannot work out from a repository: who
approves what, where work is tracked, how a change is proved and how a release
ships. It leaves general engineering knowledge to the model.
[Agent design](skills/agent-design/SKILL.md) owns skill-writing,
[verification](skills/verification/SKILL.md) owns real-path proof and
[release-watch](skills/release-watch/SKILL.md) owns live-break recovery.
[ADR 0026](docs/decisions/0026-one-page-method.md) records why the method is one
page and no longer vendors pstack. [ADR 0023](docs/decisions/0023-live-verification-and-release-gate.md)
records author-owned running-product proof before merge, the fast pre-deploy CI
and single critical assessment, and open-ended watchdog-supervised agents.
Matt Pocock's shaping skills and Warp's merge skills are vendored unchanged under
[their locks](vendor/).

Fleet machinery lives in the private `misty-step/workstation` repository.

## Harness support

Mistystack works on any harness that reads Agent Skills and an always-on
instruction file. That covers Cursor, Prime Agent, OpenCode, Gemini CLI and
others through one path:

- [Any harness](skills/misty/harnesses/any.md): `npx skills add misty-step/mistystack -g`, then the core in `AGENTS.md`.

Four harnesses also have a native plugin that does both steps:

- [Claude Code](skills/misty/harnesses/claude.md): marketplace plugin, core hook and native agents.
- [Codex](skills/misty/harnesses/codex.md): marketplace plugin, core hook and user-installed agent templates.
- [pi](skills/misty/harnesses/pi.md): Git package and core extension; rigor runs inline.
- [Antigravity](skills/misty/harnesses/antigravity.md): native plugin (`agy`), always-on rule and remote-project discovery.

Grok Bot runtime setup is private fleet machinery, not a public adapter.
Grok Build CLI is not a target; there is no `.grok-plugin` adapter.

Explicitly invoke [setup-mistystack](skills/setup-mistystack/SKILL.md) to install,
refresh or assign native rigor roles. Setup and [recompile](skills/recompile/SKILL.md)
are user-invoked, not automatically discovered by the model; Misty's links keep
their procedures readable on demand.

## Operating default

Follow [the core's placement rule](rules/core.md) through your environment's isolation skill.

Security questions use the [focused security review](skills/security-audit/SKILL.md)
and its execution-safety contract. Only an explicitly commissioned full audit
follows that skill's pinned Cloudflare upstream route, read in place from GitHub;
the full workflow, companion references, report schema and validators are not bundled.
Retired reference-page URLs redirect to the focused security review.

## Layout

```text
.claude-plugin/       Claude Code plugin; marketplace with the pinned companion packs
.codex-plugin/        Codex plugin
.antigravity-plugin/  Antigravity plugin
.agents/              Codex marketplace, Antigravity workspace discovery and repo verification
package.json          pi package resource declarations
rules/core.md      always-on routing and guardrails
skills/misty/      the method page, principles and harness references
skills/            one Agent Skills content tree
adapters/          harness-specific agents, hooks and extensions
.agents/skills/    repository verification
scripts/           checks, Git hook setup and release protection
vendor/*.lock.json upstream pins, source mappings and file hashes for unchanged skills
docs/guide/        human guide
```

Terms, invariants and consumer contracts live in [SPEC.md](SPEC.md). Maintainers start at
[AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Verify

```sh
./scripts/bootstrap
./scripts/check doctor
./scripts/check fast
./scripts/check verify [--changed [base]] [--surface <plugin|site>] [--shard <i>/<n>]
./scripts/check plugin --strict
```

`doctor` validates required tools, workflow/review-bot hygiene and complete
`git ls-files` coverage in the surface closure. `fast` (`<= 120s`) runs shell,
version, strict link/skill lint and maintained unit/contract suites. `verify`
(`<= 300s` per surface or shard) runs the real `plugin` and `site` checks across
`--changed` closures (`non-exec` edits skip runtime suites cleanly while
unmapped paths fail closed) or explicit `--surface` / `--shard` selections.
Release CI runs `./scripts/check doctor` and `./scripts/check plugin --strict --lint-only`:
strict lint checks relative Markdown link resolution, named skill references and
native manifests while leaving native installation unproved. The full `plugin --strict`
selection installs in disposable homes through every available Claude Code, Codex,
pi and Antigravity CLI. Missing CLIs are named as skipped, not passed. These
no-model checks prove native installation, skill inventory and core
hook/extension registration, not live model behavior. See the harness notes for
fresh-session proof, `./scripts/check --help` for gate options and
[verify-mistystack](.agents/skills/verify-mistystack/SKILL.md) for the complete
evidence contract. No check installs into an operator's live profile.

## Release

Landmark prepares a generated changelog PR, then publishes only its verified,
landed commit. Keep [CHANGELOG.md](CHANGELOG.md) generated. The same PR carries
the release version in every native manifest, written by
`scripts/stamp-version.ts`, so a harness that detects upgrades by version sees
each release; `./scripts/check` fails when a manifest and the changelog disagree. The shared
[release convention](docs/release-convention.md) stays at its existing path for
external callers.

## Public site

The static pitch and handbook live in `site/`, with isolated tooling. The root
package remains the native pi package. With Node 22.23.4 or later:

```sh
npm --prefix site ci
npm --prefix site run build
npm --prefix site run check
npm --prefix site run serve
```

`build` reads the canonical repository Markdown in place, validates the content
graph and source-relative links, emits static routes and raw projections, then
indexes the artifact with Pagefind. `check` crawls those emitted routes,
fragments, assets and search indexes. `serve` uses local Wrangler static-asset
routing, including trailing slashes, redirects and a true 404. It does not deploy.

Presentation comes from the Misty Step identity package, `@misty-step/brand`
(built in `brand/` of misty-step/aesthetic), pinned to a release tarball in
`site/package.json`. Version 0.3.0 supplies the serif `mistystack` lockup, three
self-hosted fonts, light and dark tokens, theme runtime, icons, social card and
spine components. The spine also handles the home page's install tabs.
`site/src/styles/site.css` owns the responsive page layout and handbook styles
on those tokens. The home page's words live in `site/src/copy/home.mjs`;
`site/src/lib/home.mjs` reads the core lines, install commands, counts and
trial numbers from this repository and fails the build when the copy and the
tree disagree. None of these boundaries requires moving or duplicating method
content; route and link normalization lives in `site/src/lib/graph.mjs`.
Historical record links to removed sources use a small, explicit archive map,
labelled with their immutable revision.

The [publishing decision](docs/decisions/0018-static-publishing-stack.md) records the
stack exception and production boundaries. The
[kernel trial](docs/evals/2026-10-28-kernel-trial.md) owns the reported results,
task table and limitations. The dispatched [release workflow](.github/workflows/landmark-release.yml)
deploys <https://stack.mistystep.io> after its fast gate, using the same checked
artifact. PRs and pushes do not start CI or deployment.

## Read

- [Guide](docs/guide/): installation and the working method.
- [Specification](SPEC.md): terms, invariants and consumer contracts.
- [Foundation checklist](skills/foundation/checklist.md): the audit rubric;
  [FOUNDATIONS.md](FOUNDATIONS.md) is a pointer, not another standard.
- [Exemplars](docs/exemplars.md): people, codebases, prose and products whose perspectives we channel.
- [Attribution](ATTRIBUTION.md): sources and license notices.
- [Decisions](docs/decisions/index.md): boundaries and rejected alternatives.
