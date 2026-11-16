# Any harness

Mistystack needs two things from a harness, and nearly every coding agent provides both: it reads Agent Skills (`<name>/SKILL.md` directories) and it reads an always-on instruction file such as `AGENTS.md`. This note is the install path for every harness, including Cursor, Prime Agent, OpenCode, Gemini CLI and ones we have not met yet. [Claude Code](claude.md), [Codex](codex.md), [pi](pi.md) and [Antigravity](antigravity.md) also have a native plugin that does the same job in one step; use whichever you prefer there.

## 1. Skills

Install the whole `skills/` tree, so that the links between skills resolve:

```sh
npx skills add misty-step/mistystack -g
```

The [skills CLI](https://github.com/vercel-labs/skills) detects the agents on the machine and links each one to a single copy. Add `-a <agent>` to target one, and run `npx skills update` to refresh. Without Node, clone this repository and copy or link `skills/*` into the harness's skills directory:

| Harness | Project path | User path |
| --- | --- | --- |
| Cursor | `.agents/skills/` | `~/.cursor/skills/` |
| Antigravity | `.agents/skills/` | `~/.gemini/config/skills/` |
| Prime Agent | `.agents/skills/` or `.prime/agent/skills/` | `~/.agents/skills/` or `~/.prime/agent/skills/` |
| Codex, pi, Kimi Code, Zed, Warp | `.agents/skills/` | `~/.agents/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| OpenCode | `.agents/skills/` | `~/.config/opencode/skills/` |
| Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |
| Mistral Vibe | `.vibe/skills/` | `~/.vibe/skills/` |
| Anything else | `.agents/skills/` | the path its documentation names |

Prime Agent's row is read from its source at [`6aaa3a2`](https://github.com/PrimeIntellect-ai/prime-agent/tree/6aaa3a25518b1d01389540eabb4e3a89bca666bb): `crates/pa-core/src/packages/resolve/auto.rs` and `discovery.rs` scan `~/.agents/skills` and every ancestor's `.agents/skills` up to the repository root, and `crates/pa-cli/src/config.rs` puts its own directory at `~/.prime/agent` unless `PRIME_AGENT_CODING_AGENT_DIR` is set. The other rows come from the skills CLI's agent table, which has no Prime Agent entry, so `npx skills add -g` reaches Prime Agent only through an agent that installs to `~/.agents/skills/`, such as `-a codex`. A harness changes its paths more often than we change this file, so read its own documentation when a skill does not appear.

A skills-only install leaves out this repository's `rules/`, `docs/`, `vendor/` and root files. Copying `skills/` alone leaves 195 links between skills working and none broken; ten files link out of the tree for provenance, decisions and native agent templates, and those links are not needed to do the work. This note links to the core and the companion list by URL for that reason.

## 2. The core

The seven lines in [`rules/core.md`](https://github.com/misty-step/mistystack/blob/master/rules/core.md) must be in context at the start of every session. Put its body, without the frontmatter, into the always-on instruction file the harness reads for every project, between these markers so that a refresh replaces it instead of appending a second copy:

```markdown
<!-- mistystack:core -->
...the lines of rules/core.md...
<!-- /mistystack:core -->
```

For most harnesses that file is a user-level `AGENTS.md`. Antigravity reads `AGENTS.md` or `GEMINI.md` and `.agents/rules/*.md`; Cursor reads `AGENTS.md` and its user rules. Prime Agent reads `~/.prime/agent/AGENTS.md` first and then each `AGENTS.md` from the filesystem root down to the working directory (`crates/pa-core/src/resources/mod.rs` at the same commit). Where a harness has only per-project instructions, put the block in the project's `AGENTS.md`. Keep whatever else the file holds.

Without the core, the method still loads when the model picks the `misty` skill for nontrivial work, but small tasks lose the standing rules. Treat a missing core as a failed install.

## 3. Roles and effort

Do the work in the main session, and use the harness's own subagent mechanism with [Misty's brief](../SKILL.md#the-brief) where [delegation](../SKILL.md#delegation) has a reason. The [rigor tier](../../ship-loop/roles.md#rigor) sets how deep the proof goes; it does not need a dedicated agent definition. Choose models and effort in the harness's own configuration, by [provisioning](../../ship-loop/roles.md#provisioning).

`recompile` and `setup-mistystack` ask not to be invoked automatically. A harness that ignores that request will list them with the others, which does no harm.

## 4. Prove it loaded

Start a fresh session in a scratch project. Ask it to quote the first line of its standing instructions that mentions saying what the user wants, then to open the `misty` skill, follow its ship-loop link and quote that skill's first heading. Keep the session's actual file reads as the evidence. Files on disk and the model's own account are not proof that the method loaded.

## Prime Agent's package route

Prime Agent can also install this repository as a package: `prime-agent package install git:github.com/misty-step/mistystack`. Its source reads the `pi` manifest in `package.json` for `skills`, `prompts` and `themes` only (`read_pi_manifest_file` in `discovery.rs`), so the package brings the skills and not the core. The core still goes in `~/.prime/agent/AGENTS.md`. This is read from source and has not been run.

## Companion packs

The design and cleanup packs we use beside mistystack are listed, pinned by commit, in [`.claude-plugin/marketplace.json`](https://github.com/misty-step/mistystack/blob/master/.claude-plugin/marketplace.json), the one list of those pins. On any harness, install each from its repository at that commit, through the harness's plugin command or `npx skills add <owner>/<repo>`.
