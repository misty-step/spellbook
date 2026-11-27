# Spellbook architecture

How the repository runs today: what each part does, how one skill reaches a
session, how a release is cut, and where trust changes hands. This page is
descriptive. Target behavior is in [SPEC.md](SPEC.md) and the reasons for each
choice are in [decision records](docs/decisions/index.md). When this page and
the code disagree, the code is right and this page is stale.

Baseline: traced at `master` `d442a18` (release `v0.5.6`) on 2026-11-15, then
updated through `22b7938` (#715 coordinator spaces, #716 provisioning, #717
recompile grading). Citations are `path:line` at `22b7938`. Claims marked **(inferred)** come
from reading code or docs without running them. The evidence section at the end
lists what was actually run.

## Components

| Component | Files | Role |
| --- | --- | --- |
| Content tree | `skills/<name>/SKILL.md` (38 skills) | The method. One copy, Agent Skills format, used by every harness. |
| Core | `rules/core.md` | Seven always-on lines. They route nontrivial work to `misty` (`rules/core.md:11`). |
| Mode | `skills/misty/SKILL.md` | The method on one page, linking to each task skill (`skills/misty/SKILL.md:24`, `:108-134`). |
| Harness notes | `skills/misty/harnesses/{any,claude,codex,pi,antigravity}.md` | The only place where per-harness mechanics are allowed. |
| Roles and provisioning | `skills/ship-loop/roles.md` | Rigor tiers (`:8`); the Provisioning section points to the routing reference (`skills/misty/routing.md`), which holds models, tiers, harness facts and stall handoffs. |
| Coordination | `skills/coordinator/SKILL.md`, `skills/coordinator/briefs.md` | One Herdr space per project with Ownership and Understanding tabs (`SKILL.md:23-35`), and copy-ready launch briefs (`briefs.md`). |
| Recompile | `skills/recompile/SKILL.md`, `skills/recompile/grading.md` | Rebuild rounds and their grading protocol: gates, then classify and decide (`grading.md:9-56`). This is method only; no code in this repository runs it. |
| Claude adapter | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `adapters/claude/agents/*.md` | Skills, three rigor agents, and a SessionStart hook that injects the core. |
| Codex adapter | `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `adapters/codex/hooks.json`, `adapters/codex/agents/*.toml` | Skills plus the SessionStart hook. The rigor agents ship as templates the user installs separately. |
| pi adapter | `package.json` (`pi` key), `adapters/pi/core.ts` | Skills plus an extension that appends the core to the system prompt. |
| Antigravity adapter | `.antigravity-plugin/plugin.json`, `.agents/skills.json`, `.agents/rules.json` | Skills plus the `rules/` directory, which carries the core. |
| Vendored skills | `vendor/pocock.lock.json`, `vendor/warp.lock.json`, `scripts/skill-locks.mjs`, `scripts/sync-skills.ts` | Upstream skill bytes pinned by commit and SHA-256. |
| Checks | `scripts/check` → `scripts/verify` → `scripts/check-runner.ts`, `scripts/verify-plugin.ts` | One gate entry point with `doctor`, `fast`, `verify`, and the older `plugin`/`all` selections. |
| Site | `site/` (Astro, Pagefind, Cloudflare Worker) | Public handbook, library and skill finder at `stack.mistystep.io`. |
| Release | `.github/workflows/{landmark-release,ci,site-deploy}.yml`, `.landmark.yml`, `scripts/stamp-version.ts`, `scripts/protected-release-check.ts` | A manually dispatched train: notes, CI, tag, `verified` cursor, deploy. |
| Secret scanning | `scripts/bootstrap`, `.githooks/*`, `.gitleaks.toml`, `.gitleaksignore` | Local pre-commit and pre-push scans, enabled per clone. |
| Repo-local proof skill | `.agents/skills/verify-mistystack/SKILL.md` | How to prove a change to this repository. It is not part of the shipped tree. |

## The load path of one skill, end to end

The example is `skills/ship-loop/SKILL.md`, from commit to a fresh session.

### 1. Author and land

The author edits `skills/ship-loop/SKILL.md` and runs `./scripts/check fast`.
That command runs `sh -n` on the shell scripts, checks the manifest versions,
and runs strict lint plus every maintained test (`scripts/check-runner.ts:371-389`,
`scripts/verify-plugin.ts:674-685`). Strict lint checks five things:

- Skill frontmatter: the name matches the directory, and Misty-authored skills
  carry `owner`/`prevents`/`source`/`sunset` (`scripts/verify-plugin.ts:235-254`).
- The core length limit (`:256-264`).
- That every relative Markdown link and every "the `x` skill" reference
  resolves inside `skills/` and `rules/` (`:266-297`).
- The native manifests (`:44-220`).
- Vendored lock integrity (`:230-231`).

`./scripts/check verify --changed` sorts the changed paths into surfaces. A
`skills/**/*.md` file maps to both `plugin` and `site` (`scripts/check-runner.ts:86-93`).
An unmapped path fails closed to every surface (`:130-133`). The change lands
on `master` by squash merge. No CI runs on PRs or pushes: `doctor` rejects any
`pull_request` workflow trigger (`scripts/check-runner.ts:171-202`).

### 2. Distribution: `master` is the channel

Each native adapter installs from the repository itself:

- Claude: `claude plugin marketplace add misty-step/spellbook`
  (`skills/misty/harnesses/claude.md:11-14`). The marketplace entry's source is
  `./` (`.claude-plugin/marketplace.json:12-13`).
- Codex: `codex plugin marketplace add misty-step/spellbook`
  (`skills/misty/harnesses/codex.md:11-14`). Its marketplace uses a local source
  `./` (`.agents/plugins/marketplace.json:6-9`).
- pi: `pi install git:github.com/misty-step/spellbook` (`skills/misty/harnesses/pi.md:11-13`).
- Antigravity: `agy plugin install https://github.com/misty-step/spellbook`
  (`skills/misty/harnesses/antigravity.md:9-11`).
- Universal: `npx skills add misty-step/spellbook -g` (`skills/misty/harnesses/any.md:9-11`).

None of these commands names a tag. The Claude manifest deliberately has no
`version`, so Claude Code updates by commit (`skills/misty/harnesses/claude.md:23-27`).
The Codex and pi notes record content refreshing while the manifest version
stayed unchanged (`codex.md:23-27`, `pi.md:22-25`). **(Inferred)** A skill
merged to `master` reaches a plugin user at their next marketplace update,
whether or not a release has run. The release gate protects the tag, the
manifest version labels and the site. It does not gate plugin content.

### 3. Install into a harness

- **Claude Code.** The plugin manifest registers `./skills`, three agent files
  and a SessionStart hook that runs `cat "${CLAUDE_PLUGIN_ROOT}/rules/core.md"`
  (`.claude-plugin/plugin.json:10-27`). The explicit `agents` array replaces
  Claude's default `agents/` scan (`skills/misty/harnesses/claude.md:57-58`).
- **Codex.** The manifest points at `./skills/` and at `adapters/codex/hooks.json`
  (`.codex-plugin/plugin.json:5-6`). That file runs `cat "$PLUGIN_ROOT/rules/core.md"`
  (`adapters/codex/hooks.json:8`). Codex will not run the hook until the user
  trusts it, and it pins that trust to a content hash, so a refresh can
  require trusting it again (`skills/misty/harnesses/codex.md:36-44`). The Codex
  plugin does not deliver custom agents. The rigor TOMLs must be copied into
  `$CODEX_HOME/agents/` by `setup-mistystack` (`codex.md:57-66`).
- **pi.** `package.json:13-20` registers `./skills` and the extension
  `adapters/pi/core.ts`. The extension reads `rules/core.md` and appends it to
  the system prompt on `before_agent_start` (`adapters/pi/core.ts:4-6`). pi has
  no subagents, so rigor runs inline (`skills/misty/harnesses/pi.md:48-55`).
- **Antigravity.** The manifest declares `skills`
  (`.antigravity-plugin/plugin.json:19`). Lint forbids a `rules` key because
  `agy` loads `rules/` directly (`scripts/verify-plugin.ts:186-189`). The core's
  frontmatter `trigger: always_on` / `alwaysApply: true` (`rules/core.md:1-4`)
  is what Antigravity and Cursor rule loaders read **(inferred)**.
- **Universal install.** The user copies `skills/` and pastes the core's body
  between `<!-- mistystack:core -->` markers in an always-on `AGENTS.md`
  (`skills/misty/harnesses/any.md:31-43`).

### 4. A fresh session

1. The harness injects the core: the Claude and Codex SessionStart hook, the
   pi extension, the Antigravity rule, or the universal `AGENTS.md` block.
2. The core tells the agent to load `misty` for nontrivial work (`rules/core.md:11`).
3. `misty` links to `../ship-loop/SKILL.md` (`skills/misty/SKILL.md:24`, `:122`).
   That relative link resolves inside the installed tree, which is why skills
   are always installed as a whole tree (`skills/misty/harnesses/any.md:7`, `:29`).
4. Rigor agents point back into the tree. The Claude agents link
   `../../../skills/ship-loop/roles.md` and set `model: inherit` with a
   per-tier `effort` (`adapters/claude/agents/rigor-*.md:1-11`). The Codex
   agents name the installed skill and pin a model
   (`adapters/codex/agents/rigor-*.toml:1-11`).
   Which model class and effort each agent gets is chosen from the
   routing reference (`skills/misty/routing.md`). The harness note
   says how to set them (`skills/misty/SKILL.md:76`).
5. Explicit-only skills set `disable-model-invocation: true`. Codex does not
   honor that flag, so `recompile`, `setup-mistystack`, `coordinator` and
   `daily-retro` also carry `agents/openai.yaml` with
   `allow_implicit_invocation: false` (`skills/misty/harnesses/codex.md:49-53`).

### How the repository proves loading

`./scripts/check plugin --strict`, or `verify --surface plugin`, runs
`verifyNativeInstall` against each harness CLI found on `PATH`. A missing CLI is
reported as SKIP, never PASS (`scripts/verify-plugin.ts:638-654`). Each proof
runs in a scratch HOME:

- It redirects HOME, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `PI_CODING_AGENT_DIR`,
  `TMPDIR` and the XDG directories into the scratch directory, and refuses any
  path that escapes it (`:321-376`).
- It requires an empty catalog first (`:508-509`, `:528-531`, `:564-567`, `:604-607`).
- It installs through the native lifecycle.
- It compares the installed bytes with the working tree (`:389-399`).
- It reads back the harness's own inventory: `claude plugin details`, Codex
  app-server `skills/list` and `hooks/list`, pi RPC `get_commands`, and
  `agy plugin list` (`:503-636`).

These proofs make no model call. They show that the plugin is installed and
registered. They do not show that a hook ran in a live session: Codex trust and
hook execution are not exercised (`:560`), and neither is pi extension
invocation (`:602`).

## Vendored skills

Eight skills are upstream bytes rather than Misty-authored:

- From `mattpocock/skills@4ae2317d…`: `grilling`, `grill-me`, `grill-with-docs`,
  `domain-modeling`, `to-questionnaire` and `retro` (`vendor/pocock.lock.json:2-11`).
- From `warpdotdev/common-skills@8792394f…`: `merge-risk` and
  `resolve-merge-conflicts` (`vendor/warp.lock.json`).

- **Lock shape.** Each lock has `repo`, a 40-hex `commit`, a `skills` map from
  destination to upstream path, and a SHA-256 for every file. The upstream list
  is hard-coded, so a new pack needs a code change (`scripts/skill-locks.mjs:5-8`).
- **Integrity check (offline, part of every lint).** `readSkillLocks` runs
  these checks:
  - The lock names the expected repo and has a full commit (`scripts/skill-locks.mjs:34-36`).
  - Each mapping is a valid `skills/<name>` destination from the expected
    upstream path shape (`:11`, `:38-40`).
  - Every file under a vendored skill is recorded (`:47-50`).
  - There are no symlinks (`:18`).
  - Every recorded digest matches the file on disk. A mismatch reports
    "vendored bytes are not hand-edited" (`:61`).

  Vendored skills are exempt from Misty metadata requirements (`scripts/verify-plugin.ts:244-250`).
- **Regeneration.** Run `bun scripts/sync-skills.ts <lock> <checkout>`. It:
  - checks that the checkout's `origin` is exactly the locked GitHub repo
    (`scripts/sync-skills.ts:19-22`);
  - refuses a dirty checkout (`:23`) and takes its `HEAD` as the new pin (`:24`);
  - refuses sources that escape the checkout (`:32`);
  - replaces each destination directory and rewrites the lock (`:36-41`).
- **Companion packs.** These are separate plugins pinned by full SHA in
  `.claude-plugin/marketplace.json:19-65`, enforced by `scripts/verify-plugin.ts:131-153`.
  They are not copied into `skills/`.

## What `./scripts/check` verifies

`scripts/check` execs `scripts/verify` (`scripts/check:3`). `scripts/verify`
requires `git`, `bun` and `python3`, creates a temporary TMPDIR, and dispatches
by selection (`scripts/verify:28-50`).

| Selection | Runs | Budget |
| --- | --- | --- |
| `doctor` | Required tools, every tracked file mapped to a surface, no `pull_request` triggers, no active CodeRabbit (`scripts/check-runner.ts:243-262`) | none |
| `fast` | `sh -n` on 5 scripts, `stamp-version --check`, `verify-plugin --strict --lint-only`, which includes all maintained `*.test.ts` outside `site/` and vendored dirs (`check-runner.ts:371-389`, `verify-plugin.ts:679-685`) | 120s, exit 124 on breach (`check-runner.ts:14-16`, `:274-321`) |
| `verify --surface plugin` | `verify-plugin --strict`: lint, tests and isolated native installs (`check-runner.ts:391-406`) | 300s per surface |
| `verify --surface site` | `npm --prefix site run build` then `run check`; requires `site/node_modules` (`check-runner.ts:408-433`) | 300s |
| `verify --changed [base]` | Surfaces from the changed-file closure. Base defaults to the working tree, then `origin/verified..HEAD`, `verified..HEAD`, `HEAD~1..HEAD` (`check-runner.ts:348-369`, `:477-493`) | 300s per surface |
| `verify --shard i/n` | Round-robin over the selected surfaces (`check-runner.ts:145-162`, `:500-506`) | |
| `plugin [--strict] [--lint-only]`, `all` | Older selections. They run `sh -n`, the version check and `verify-plugin` without a budget (`scripts/verify:51-60`) | none |

The closure classes are listed below (`scripts/check-runner.ts:73-109`):

- **`non-exec`:** `AGENTS.md`, `.gitignore`, `LICENSE` and similar files.
- **`shared`:** `scripts/`, `.github/`, `.githooks/`, `package.json` and the
  gitleaks config.
- **plugin and site:** `skills/**/*.md`, `rules/core.md`, `vendor/` and `CHANGELOG.md`.
- **plugin only:** non-Markdown skill files, `adapters/`, the manifests and `assets/`.
- **site only:** `site/`, `docs/` and the five root documents.

## The site

- **Inputs.** Astro reads repository files in place: `skills/**/*.md`,
  `rules/core.md`, `docs/**/*.md` and the root documents. A document's
  repository path is its identity (`site/src/content.config.ts:4-20`). No
  content is copied or generated in a second home.
- **Build.** `npm run build` runs four steps (`site/package.json:11`):
  1. Build the skill-finder index from pinned catalog sources (`site/scripts/build-skill-index.mjs`).
  2. `astro build` (static, trailing slash, `site/astro.config.mjs:43-53`).
  3. Pagefind keyword index.
  4. A Wrangler dry-run bundle of the Worker (`site/scripts/bundle-worker.mjs`).
- **Check.** `npm run check` runs the site unit tests and then
  `site/scripts/check.mjs`. That script inspects the built artifact rather than
  the source graph (`site/scripts/check.mjs:9-10`) and fails on any error
  (`:401-404`).
- **Release identity.** `/release.json` serves `{commit, version, builtAt}`.
  The commit comes from `SITE_COMMIT`, `GITHUB_SHA` or `git rev-parse HEAD`,
  and must be 40 hex characters. The version comes from root `package.json`
  (`site/src/lib/release.mjs:8-16`).
- **Runtime.** Cloudflare Workers Static Assets serves the files. Only `/api/*`
  runs the Worker first (`site/wrangler.jsonc:4-12`). The Worker routes
  `/api/find` to the skill finder, `/api/client-error` to the browser error
  beacon (`site/src/lib/client-error.mjs`), returns a JSON 404 for other `/api/*`
  paths, and serves assets for everything else (`site/worker/index.mjs:7-23`).
  A fault is logged once with the release identity and rethrown; Workers
  observability is enabled (`site/wrangler.jsonc:13`).
  `/api/find` enforces these limits (`site/src/lib/find-api.mjs:39-55`):
  - POST only, same-origin only, JSON body of at most 8 KiB.
  - It needs `OPENROUTER_API_KEY` and the `SKILL_SEARCH_LIMITER` binding.
  - 8 requests per 60 s per IP (`site/wrangler.jsonc:14-25`).
  - Every failure is an explicit degraded JSON response.
- **Headers.** Strict CSP and frame denial. `noindex` on `/source/*` and on
  `workers.dev` preview hosts (`site/public/_headers:1-15`). Retired URLs
  redirect through `site/astro.config.mjs:54-100`.

## The release path

One train per manual dispatch of **Verify and Release**
(`.github/workflows/landmark-release.yml`). Every job runs on GitHub-hosted
`ubuntu-latest` runners (`:20`, `ci.yml:13`). Only one train runs at a time; an
in-flight train is never cancelled (`landmark-release.yml:13-15`).

1. **Dispatch.** The operator supplies `source`, a full SHA, and
   `critical-review`, the URL of the single release assessment (`:3-12`,
   `docs/release-convention.md:79-83`).
2. **prepare** (`:19-97`):
   - Asserts that `source` is 40 hex characters, that the review URL starts
     with `https://github.com/misty-step/spellbook/`, and that both `HEAD` and
     `origin/master` equal `source` (`:32-41`).
   - Landmark `prepare-protected` generates notes (`:42-49`), and
     `stamp-version.ts` writes the `CHANGELOG.md` version into the Codex,
     Antigravity and pi manifests (`:54-56`, `scripts/stamp-version.ts:8`).
   - A release-bot GitHub App token opens the generated-notes PR. That PR
     touches only `CHANGELOG.md` and those three manifests. The job squash-merges
     it at once, and its merge commit becomes the **candidate** (`:57-97`).
3. **verify** calls `ci.yml` on the candidate (`:98-102`). That workflow:
   - Checks out with `persist-credentials: false`.
   - Installs Bun 1.4.2, plus gitleaks 8.30.1 and Landmark 0.28.9, both
     downloaded and checked against SHA-256 (`ci.yml:15-45`).
   - Runs `./scripts/check doctor` and `./scripts/check plugin --strict --lint-only`
     (`:46-51`). There are no native installs at release.
   - Runs `protected-release-check.ts` (`:52-56`). It runs Landmark's
     publication against a local proxy that forwards GitHub reads and refuses
     every write (`scripts/protected-release-check.ts:61-112`). It passes only
     if Landmark either has nothing to publish or would make exactly one
     `POST /releases` (`:135-138`, `:197-211`).
   - In parallel, the `site` job runs `npm ci` on a cache miss, builds and
     checks with `SITE_COMMIT=<candidate>`, and uploads `site/dist` as one
     artifact (`ci.yml:57-89`).
4. **publish.** Landmark `publish-protected` tags and creates the GitHub
   Release at the candidate (`landmark-release.yml:103-121`). The job then
   fast-forwards `refs/heads/verified` to the candidate: it creates the ref if
   it is absent, updates only if the GitHub compare result is `ahead`, and
   never forces (`:122-142`).
5. **deploy** (`site-deploy.yml`, its own concurrency group at `:11-13`):
   - Downloads the artifact that CI checked and runs `wrangler deploy` with
     the Cloudflare secrets (`:38-47`).
   - Polls `https://stack.mistystep.io/?v=<sha>` for up to 120 s until the
     page contains the candidate SHA, then fetches four reading routes (`:48-62`).

After publication, installed consumers refresh through `setup-mistystack`
(`docs/release-convention.md:92-96`). No step in the workflow automates rollback.

## Trust boundaries

| Boundary | What crosses | Enforcement | Gap |
| --- | --- | --- | --- |
| Repo → every enabled session | `rules/core.md` text and the 38 skills | Write access to `master` | Plugin users take `master` directly (inferred, see "Distribution"). Release CI and the critical review come after merge, so they do not gate content. |
| SessionStart hooks (Claude, Codex) | A shell command runs on session start | The command is a fixed `cat` of a path under the plugin root (`.claude-plugin/plugin.json:22`, `adapters/codex/hooks.json:8`). Lint and install proof require that it register exactly this path (`scripts/verify-plugin.ts:90-111`, `:401-422`). Codex requires trust per content hash (`codex.md:36-44`). | Claude runs plugin hooks without a separate trust step (inferred). A manifest change on `master` changes the command. |
| pi extension | TypeScript runs in the pi process | It only reads a file and appends to the prompt (`adapters/pi/core.ts:4-6`) | Code execution at load. Not exercised by the install proof (`verify-plugin.ts:602`). |
| Core self-bootstrap | `git clone --depth 1` of unpinned `master` into `/tmp/mistystack` when skills are missing (`rules/core.md:11`) | None beyond HTTPS to GitHub | Unpinned remote content becomes instructions. A shared `/tmp` path could already hold a planted directory (inferred). |
| Vendored upstream bytes | Third-party prose executed as instructions | SHA-256 lock, remote-URL and clean-checkout checks on sync, lint on every check (see "Vendored skills") | The lock proves the bytes match the pin. It does not prove the pin is safe: the reviewer of the sync PR is the control. |
| Companion packs | Third-party plugins | Full 40-hex SHA pins in the Claude marketplace (`verify-plugin.ts:131-153`) | The user installs them separately. Nothing here inspects their content. |
| Secrets in commits | Credentials pushed to GitHub | `pre-commit` runs `gitleaks protect --staged` (`.githooks/pre-commit:11`). `pre-push` runs gitleaks over commits no remote has (`.githooks/pre-push:22-23`), then trufflehog filesystem with an exact-match allowlist (`.githooks/trufflehog-gate.py:17-54`, `:89-121`). | The hooks are opt-in per clone via `./scripts/bootstrap` (`scripts/bootstrap:13`) and skipped by `--no-verify`. Release CI installs gitleaks but no workflow step runs it (`ci.yml:29-51`). Whether Landmark calls it is unverified. |
| Release credentials | Release-bot App key, Cloudflare token, `GITHUB_TOKEN` with `contents: write` | `workflow_dispatch` only. `permissions: contents: read` by default, write only on `prepare` and `publish` (`landmark-release.yml:16-25`, `:106-108`). `persist-credentials: false`. Tools checked against SHA-256. | Self-hosted runners. `actions/checkout@v4`, `setup-bun@v2`, `cache@v4`, `setup-node@v4`, `upload-artifact@v4`, `download-artifact@v4` and `create-github-app-token@v2` are pinned to mutable tags. Landmark and create-pull-request are pinned by SHA. The `critical-review` input is checked only for a URL prefix (`:38`). |
| Native-install proof | Harness CLIs writing config | A scratch HOME and XDG dirs, escape refusal and empty-catalog preconditions (`verify-plugin.ts:321-376`, `:378-387`) | Proves isolation only for the harnesses on `PATH`. |
| Skill finder | Public text to OpenRouter | POST, same-origin, 8 KiB, rate limit, server-held key (`find-api.mjs:39-55`) | The IP-keyed limiter is per Cloudflare namespace (inferred). Query text leaves the Worker for OpenRouter by design. |

## Evidence for this page

Measured on 2026-11-15:

- `./scripts/check doctor` at `d442a18` passed: 260 tracked files mapped, 0.3 s.
  With this page mapped as `non-exec`, it passed with 261 files.
- `./scripts/check fast`, run from inside a Claude Code session, **failed**
  one test of 138, in 3.8 s, on both Bun 1.4.3 and Bun 1.4.2. The test was
  "the method gate leaves upstream and isolated site suites to their own
  toolchains" (`scripts/verify-plugin.test.ts:294-310`). It expects a passing
  test's name, `(pass) maintained consumer`, in nested `bun test` output
  (`:308`). Bun omits per-test lines when `AGENT=1` or `CLAUDECODE=1` is set.
  A one-test probe printed the line with `NO_COLOR=1` and omitted it with
  either of those two variables. `env -u AGENT -u CLAUDECODE ./scripts/check fast`
  passed: 118 pass, 20 skip (the Landmark tests, which skip without
  `LANDMARK_BIN`), 4.1 s. The test helper copies the parent environment into
  the nested run (`:190`). On `d442a18`, release run `43774972013` passed
  138 of 138.
- #715 changed the assertion to `Ran 1 test across 1 file`
  (`scripts/verify-plugin.test.ts:308-309`). At `22b7938` plus this page,
  inside Claude Code with `AGENT=1` and `CLAUDECODE=1` set: `doctor` passed
  with 263 files mapped, and `fast` passed with 118 pass, 20 skip, 0 fail
  (3.6 s, within the 120 s budget).
- Release run `43774972013` (dispatched at `bb49a7a`): prepare, verify/verify,
  verify/site, publish and deploy all succeeded, and the protected release
  check said "candidate is fresh; master would publish v0.5.6".
- `https://stack.mistystep.io/release.json` serves commit `d442a18…` and
  version `0.5.6`. An unknown route returns HTTP 404. `refs/heads/verified`
  and tag `v0.5.6` both equal `d442a18`.
- This Claude Code session's SessionStart output contained the text of
  `rules/core.md`. That is one live observation of the Claude hook path; the
  installed revision behind it was not checked.

Not run:

- The native install proofs (`verify --surface plugin`). Plugin installs are
  out of scope for this lane.
- The site build (`verify --surface site`).
- `sync-skills.ts`.
- A fresh Codex session.
- Any hook or rollback path.

## Open questions: where SPEC.md disagrees with the repository

The owner decides each one: change SPEC.md, change the code, or record the
deviation. None is fixed on this branch.

1. **Explicit-only skills.** `SPEC.md:65` names four skills: `daily-retro`,
   `setup-mistystack`, `recompile` and `coordinator`. In the repository eight
   skills set `disable-model-invocation: true`. The other four are vendored
   (`grill-me`, `grill-with-docs`, `retro`, `to-questionnaire`). Lint enforces
   the flag on only three of SPEC's four and omits `daily-retro`
   (`scripts/verify-plugin.ts:241`). The harness notes list three
   (`claude.md:45-47`, `pi.md:43-45`) or two (`any.md:49`).
2. **Shaping route.** `SPEC.md:71` routes unsettled intent through `grilling`,
   `grill-me`, `grill-with-docs`, `domain-modeling` and `to-questionnaire`.
   Three of those are explicit-only, so on Claude Code and pi the model cannot
   invoke them on its own initiative. Is that intended?
3. **Core length.** `SPEC.md:45` says at most 20 lines *including
   frontmatter*. Lint counts body lines only (`scripts/verify-plugin.ts:257-261`).
   The core is 13 lines today, so nothing fails yet.
4. **Native installs in `./scripts/check`.** `SPEC.md:67` says the entry point
   checks disposable native installs across all available CLIs. Only
   `verify --surface plugin` and `plugin` do that. `fast` is lint-only
   (`check-runner.ts:380`). Release CI runs the older unbudgeted
   `plugin --strict --lint-only` rather than `fast` (`ci.yml:51`), so no release
   exercises a native install. The `plugin` and `all` selections
   (`scripts/verify:30-32`) are not in SPEC's contract.
5. **Secret scanning in the check.** `SPEC.md:67` lists secret scanning among
   what `./scripts/check` checks. The check runs *tests of* the scanner gate
   (`scripts/trufflehog-gate.test.ts`), not a scan. Real scans exist only in
   opt-in local hooks. Release CI downloads gitleaks and never invokes it.
6. **Proof receipts.** `SPEC.md:37`, `:40` and `:85-86` define clean-runner
   Merkle proof receipts and say the release gate consumes them. No code in
   this repository mints, stores or reads one. ADR 0029 assigns them to
   `misty-step/conductor` (`docs/decisions/0029-agentic-verification-and-release-trains.md:36`). Spellbook's release
   always takes the fallback of running checks directly.
7. **Train pinning.** `SPEC.md:40` says newer trunk landings "wait for the next
   train". In the workflow, a landing between dispatch and `prepare` fails the
   train, because `origin/master` must equal `source` (`landmark-release.yml:40`).
   Also, the tested candidate is the generated-notes merge commit, not the
   dispatched `source` (`:90-96`).
8. **Release gate versus publication.** `SPEC.md:40` calls the release gate
   "pre-publication". Plugin content is published to users when it merges to
   `master` (see "Distribution"). Only the tag, the manifest versions and the
   site wait for the gate.
9. **Review previews.** `SPEC.md:113` says review previews identify their
   commit, link affected pages and carry `noindex`. No workflow creates a
   preview. Only `preview_urls: true` (`site/wrangler.jsonc:23`) and a
   `workers.dev` `noindex` header (`site/public/_headers:14-15`) exist.
10. **Telemetry.** `SPEC.md:114` describes protected, non-blocking telemetry.
    The site sends none that this trace found, and the decision index still
    lists telemetry as open (`docs/decisions/index.md:61`).
11. **Recovery.** `SPEC.md:86` says the release recovers safely on failure, and
    `docs/release-convention.md:63-66` calls for native rollback. The workflow
    has no rollback or recovery step (inferred to be manual, `release-watch`).
12. **Rigor models in the shipped agents.** #716 sharpened this question
    rather than settling it.
    - `SPEC.md:60` and the routing reference say critical work is "frontier,
      never weaker than the dispatcher" (`skills/misty/routing.md`).
    - The Codex templates still ship a concrete model, `gpt-6.1-sol` (a
      workhorse), for all three tiers, and standard and critical share `high`
      effort (`adapters/codex/agents/rigor-*.toml:3-4`). The reference says
      standard is `medium`.
    - The Claude agents use `model: inherit`, so the light tier runs on the
      session's model rather than a quick workhorse
      (`adapters/claude/agents/rigor-light.md:4`).
13. **Harness-neutral content.** Invariant 4 (`SPEC.md:48`) forbids naming
    host-specific tools in the shared tree. #715 adds more names: the
    coordinator now names Herdr spaces and tabs (`skills/coordinator/SKILL.md:23-35`)
    and gives exact `hc` and `herdr-app` commands (`skills/coordinator/briefs.md:9-18`).
    `skills/herdr` and the `misty` route table (`skills/misty/SKILL.md:113`)
    also name them. Is Herdr a host tool that belongs in
    `skills/misty/harnesses/` or the workstation plugin, or a portable
    dependency the shared tree may name?
14. **Provenance shape.** `SPEC.md:46` requires a *quoted ISO* `sunset` and a
    `source` backed by ATTRIBUTION.md records. Lint checks only that `sunset`
    is a non-empty string and that dates are quoted
    (`scripts/verify-plugin.ts:21-23`, `:249`). It does not check the ISO
    format or ATTRIBUTION.md.

The following records disagree with the repository but are not SPEC.md:

15. ADR 0016's status note says only the OMP adapter is shipped
    (`docs/decisions/0016-harness-agnostic.md:6-11`), but OMP was dropped by
    ADR 0027 and four other adapters now ship. It also links a missing
    `skills/misty/harnesses/grok-bot.md` (`:40`). No decision record covers
    the Antigravity adapter added in #695.
16. `.gitleaks.toml:6-12` and `.githooks/trufflehog-gate.py:13`, `:25-29`
    allowlist a digest in `vendor/pstack.lock.json`, a lock that ADR 0026
    retired. These are dead allowlist entries.
17. `landmark-release.yml:81` still cites "US-015", a story ID that ADR 0028
    removed. `scripts/check:2` cites the historical "ADR-004".
18. **(Inferred)** `verify-mistystack` lives in `.agents/skills/`, which Claude
    Code does not scan natively (`skills/misty/harnesses/any.md:21`). A Claude
    session in this repository would not discover it without being told the path.
