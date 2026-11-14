# Release convention

Status: accepted 2026-10-14; delivery placement superseded by
[ADR 0023](decisions/0023-live-verification-and-release-gate.md) on 2026-11-03
and refined by [ADR 0029](decisions/0029-agentic-verification-and-release-trains.md) on 2026-11-14.
This is the one convention for versions, changelogs and release notes in the
repositories we ship. [Ship-loop](../skills/ship-loop/SKILL.md) owns delivery;
[Foundation](../skills/foundation/checklist.md#article-6) owns releasability.

## Pipeline

```text
slice from origin/verified → pre-land checks + author real-path proof → direct land
  → coalesced trunk sweep advances refs/heads/verified (or release advances on standalone repos)
  → pinned release train: generate notes + merge generator-only PR
  → clean-runner Merkle receipt or fast CI + one critical-correctness/security assessment
  → immutable tag / GitHub Release, deploy checked artifact and advance verified
  → live release identity and critical-journey proof
```

PR CI queues and PR review bots never block merges; coalesced trunk sweeps keep `refs/heads/verified` current while pre-deploy certification runs once on the pinned release candidate. The release assessment covers the candidate's changes since live (excluding changes already checked on the same executable closure in trusted-main pre-land review), not one review per PR.
A critical defect stops deployment and receives a targeted repair and real-path
proof; noncritical findings go to the owning tracker.

## Versions and notes

1. **One generator.** A release unit is one independently deployable or installable
   program. Exactly one maintained generator owns its semantic version and notes.
   Version files, manifests and CHANGELOG.md are generator output, never
   hand-synchronized. Record local release units, baseline and pre-1.0 policy in
   a repository decision record.
2. **Conventional Commits.** Squash PRs with `type(scope): summary` as their title.
   Configure `squash_merge_commit_title: PR_TITLE` and an empty squash body.
   The generator reads landed commits since the previous immutable release tag.
   `fix` produces a patch, `feat` a minor and `!` a major under the generator's
   documented pre-1.0 policy. `docs`, `chore`, `test`, `build`, `ci`, `refactor`
   and `style` do not alone require a release.
3. **Useful public titles.** Name the consumer's improvement or required action.
   Keep ticket IDs, private names, internal hosts and credentials out of published
   titles. Put migration and rollback detail in the linked PR description.
4. **Baseline once.** Use the previous immutable release tag. At adoption, record
   the starting version and baseline commit. Never infer the baseline from a
   package file or reset versions, retag history or edit published notes. Use the
   generator's documented override when a deliberate version is needed.
5. **Generated-notes PR.** Merge only generator output in the release PR, without
   CI or review. Check that its notes match the included commits and contain no
   private material. Correct wrong notes at their source through the generator's
   supported input, not by editing generated history. Publication refuses an
   unlanded candidate or a tag naming another commit.

## The release gate

Pin one concrete candidate revision for each release train so concurrent landings enter the next train without resetting countdowns or in-flight work. Verify valid clean-runner Merkle proof receipts covering the candidate's executable closures, or run one fast cached `./scripts/check` pass on the landed release candidate. Reuse cached toolchains and dependencies; build each artifact once, retain it, and deploy the same bytes.
Do not add PR workflows, required merge checks or repeated full-suite reruns.
Measure a slow gate (`> 120s` fast / `> 300s` per verify shard) and prune, checkpoint or shard it without losing independent consumer coverage.

One reviewer assesses critical correctness and security at this boundary. Its
receipt identifies the candidate, scope, evidence and critical findings or none.
The release owner repairs a critical failure and proves its affected behavior;
there is no broad review cycle. The repository's native pipeline publishes and
deploys after the gate without a human approval handoff.

Serialize releases without cancelling an in-flight promotion. A newer release
must descend from live; a rerun must not overwrite it with an older candidate.
Use native rollback for an already verified compatible release when a live journey
fails. A code rollback never implies restoring data or credentials.

A GitHub Release records source publication, not deployment. Serve `/changelog`
from the deployed revision's canonical generated notes; no separate release-note
service or browser credential is needed. Report the semantic version beside the
full source revision wherever the product reports release identity.

## Mistystack's native path

Landmark remains Mistystack's generator. The `Verify and Release` workflow is
explicitly dispatched after source changes have merged and the single critical
assessment is recorded on GitHub:

```sh
gh workflow run landmark-release.yml --ref master \
  -f source=<landed-full-SHA> \
  -f critical-review=<GitHub-assessment-URL>
```

The source must still be the release's selected default-branch revision at
preparation. The workflow prepares the generated changelog, opens and merges
its PR immediately, selects the landed candidate, runs `doctor` plus cached release CI once,
publishes the protected immutable release, advances `refs/heads/verified`, and deploys the already checked site
artifact. The deploy reads back serving identity and exercises delivery/watchdog
reading routes. There is no PR, push or standalone site-deploy CI trigger.

After publication, refresh installed consumers with
[setup-mistystack](../skills/setup-mistystack/SKILL.md). Retain the source PR,
generated release PR, assessment, CI run, immutable release, serving identity,
live journey and fresh installed-session evidence. Name an unexercised boundary
as unverified rather than inferring it from an exit code.

## Other generators

New integrations use pinned
[release-please](https://github.com/googleapis/release-please-action) in manifest
mode. Working [Landmark](https://github.com/misty-step/landmark),
[semantic-release](https://github.com/semantic-release/semantic-release) and
release-please paths remain when they follow this convention; uniformity alone
does not justify replacing one. Keep existing tag immutability, release-state,
privacy and rollback protections at publication, not as PR merge requirements.
