# Mistystack specification

Mistystack is Misty Step's harness-neutral engineering method for humans and coding agents, paired with a public handbook and skill-finder site. One canonical content tree in open Agent Skills format serves every supported harness through universal instructions and thin native adapters, while a small always-on core stands alone for small work and routes nontrivial work to one self-contained mode page and on-demand task skills.

Private fleet runtime setup, credentials, host automation and operator scheduling belong outside Mistystack in `misty-step/workstation`, never copied into the public method.

## Terms

- **Specification (`SPEC.md`):** a program's single, implementation-free, present-tense target state owning purpose, domain terms, invariants and observable user capabilities.
- **Homeostasis:** the state where the live running application and `SPEC.md` agree with zero drift, removing the need to materialize a specification into ticket backlogs.
- **Content tree:** the canonical Agent Skills package (`SKILL.md` entry points with supporting files beside each procedure).
- **Universal install:** installing the shared content tree in a harness's Agent Skills directory and placing the core in its always-on instruction file so Cursor, Prime Agent, OpenCode, Gemini CLI and any compatible runtime share one method without a dedicated plugin.
- **Native adapter:** thin repository-owned integration for Claude Code, Codex, pi or Antigravity exposing that same tree and core through the harness's own lifecycle without a custom installer or a second copy of the method.
- **Core rule:** the always-applied entry guardrails and routing (`<= 20` lines).
- **Mode:** `misty`, one self-contained page holding the work loop, ownership, autonomy, delegation, reporting and routes to every task skill, with no base document beneath it.
- **Principle:** an engineering taste heuristic consulted on demand when its trigger matches, never cited as a blanket bureaucratic rule.
- **Conformance:** the finished-deliverable contract of all twelve Foundation articles, separate from the audit procedure.
- **Skill:** a focused procedure directory with a `SKILL.md` entry point and optional supporting files; references resolve within the shared tree while native adapters handle host loading mechanics.
- **Vendored skill:** an upstream skill retained byte-for-byte under a hash-verified lock so local adaptations live in companion shaping facts rather than hand edits to upstream prose.
- **Recompile review:** the monthly and model-capability-triggered review considering a blank-sheet rebuild from `SPEC.md` (explicitly choosing whether to keep or regenerate UI craft in `DESIGN.md`, and protecting live user data at cutover). Keeping the current system is a valid conclusion.
- **Exemplar:** a person, codebase, piece of writing or product whose perspective Mistystack deliberately channels ([Exemplars](docs/exemplars.md)).
- **Rigor role:** `rigor-light`, `rigor-standard` or `rigor-critical`, classifying changed-path risk independently of any specific model; model and reasoning assignments live solely in harness-native configuration.
- **Task agent:** an independent worker briefed with outcome, terms, raw material, Oracle, owned scope, preserved behavior, rigor and return expectations.
- **Oracle:** a check outside the agent that can disprove completion, stated as a concrete command or real user path.
- **Local development environment:** the environment where the agent executes; each harness note owns its environment constraints.
- **Slice worker:** one isolated machine started from a clean, credential-free toolchain snapshot, reused across a slice's builds, suites and browser checks, stopped while idle and deleted once its evidence is collected.
- **Verified cursor (`verified`):** the fast-forward-only Git branch (`refs/heads/verified`, falling back to the default branch where absent) marking the latest trunk revision proven across its affected surfaces, from which new slices branch.
- **Surface closure:** a repository's complete mapping of tracked files to `non-exec`, named runtime `surfaces` or `shared` (all surfaces), failing closed to every surface on unmapped files so unaffected edits skip runtime replay cleanly.
- **Check budget:** a repository's self-enforced wall-clock limit on `./scripts/check` (`<= 120s` for `fast`; `<= 300s` per surface or shard for `verify`), failing `check_budget_exceeded` until bloated checks are checkpointed, sharded or pruned.
- **Proof receipt:** a content-addressed verification record binding a surface, git-blob Merkle hashes of its surface closure and shared core, runner/snapshot identity, command digest and exit status, trusted for release only when minted by a clean-checkout non-author runner.
- **Watchdog:** the active supervisor that periodically compares observed agent work against its brief, steers drift and recovers stalls until acceptance and worker cleanup finish, with no wall-clock deadline on completion.
- **Release gate:** the pre-publication and pre-deployment gate pinning one candidate revision so newer trunk landings wait for the next train, consuming valid clean-runner proof receipts or running fast checks directly alongside one critical-correctness/security assessment, then advancing `verified` (where no sweep daemon runs) and proving live release identity and a critical user journey.
- **Workstation plugin:** the private `misty-step/workstation` plugin owning host runtime setup, credentials and fleet bots; it consumes Mistystack without duplicating it.

## Invariants

1. **Small, always-on core.** The core rule remains at most 20 lines (including frontmatter) and loads automatically in every enabled session; detailed procedures load only on demand.
2. **Skill provenance.** Misty-authored skills use a directory-matching `name`, trigger-first `description`, observed-failure `prevents` evidence, `owner`, quoted ISO `sunset` review date and short `source` identity backed by full directory records in [Attribution](ATTRIBUTION.md#skill-provenance). Vendored upstream skills keep upstream metadata unchanged under registered hash locks (`vendor/`), retain required notices and are regenerated only from pinned upstream revisions.
3. **One page, no layers.** The mode page states the method directly with no base rule document beneath it; method edits update `misty` or a task skill rather than layering overrides.
4. **Harness-neutral method.** One content tree defines the method without naming host-specific tools, private endpoints or model rosters; native adapters and harness notes carry runtime-specific mechanics.
5. **One home per fact.** Domain terms, invariants and observable product capabilities have one authoritative home in `SPEC.md`; visual aesthetic lives separately in `DESIGN.md` for UI projects; architecture, stack choices and historical trade-offs live in [decision records](docs/decisions/index.md); cutovers migrate callers and remove retired homes.
6. **Owned boundary.** Verification and setup operate strictly in isolated state and never overwrite live operator profiles, foreign plugins, credentials or runtime configuration.

## Method

### Always-on core and one-page mode

- Every enabled session loads the concise core automatically (without requiring the user to invoke a skill), enabling small tasks inline (`name intent, finish the work, inspect real running behavior, keep code simple`) and routing nontrivial work to `misty`.
- `misty` equips any capable agent with local Misty Step rules the codebase alone cannot establish:
  - **Work loop:** inspect real sources before summaries; answer empirical questions by running them; bring unsettled product intent to the owner through shaping; name an outside falsifiable check before designing; build minimal complete slices (reshaping structurally when needed); cut accumulated complexity from the first draft before proof; prove on the built running product; deliver and report honestly.
  - **Ownership and autonomy:** repositories owned by Misty Step are freely shaped (merging duplication, fixing adjacent defects, deleting dead code); foreign repositories receive minimal targeted changes. Routine reversible work, slice lifecycle, merging self-proved PRs and native pipeline deploys require no confirmation, while destructive data/resource deletion, shared force-pushes, external outreach, non-pipeline deploys and mandatory team tooling changes wait for explicit owner approval.
  - **Delegation and briefing:** work stays inline by default and delegates only for parallel disjoint slices, bulk research, cross-family second opinions or open-ended supervision, using the brief contract (`Outcome and why`, `Terms`, `Raw material`, `Oracle`, `Scope and keep`, `Effort`, `Return`). Model selection lives in native configuration selected via rigor role (`rigor-critical` never weaker than the dispatching session).
  - **Reporting:** outcome first, claims separated as measured vs inferred vs guessed, explicit gaps left uncovered, owner-behalf decisions stated, and `merged`, `released`, `artifact verified` and `live behavior proven` never conflated.

### Install, setup and verification gate

- `setup-mistystack` and `recompile` remain excluded from automatic model discovery (`disable-model-invocation`) while staying readable directly via `misty`'s route table.
- Explicitly invoking `setup-mistystack` installs or upgrades the shared tree through the active harness's native lifecycle without disturbing unrelated plugins, foreign settings or credentials, maps `rigor-light`, `rigor-standard` and `rigor-critical` in native configuration where subagents exist (inline on pi and universal installs), reads back persisted assignments and honors symlink safety.
- One verification entrypoint (`./scripts/check`) enforces fast (`<= 120s`), verify (`<= 300s` per surface/shard, `--changed`, `--surface`, `--shard`) and `doctor` (repo workflow hygiene plus complete tracked-file closure coverage, including non-exec cutoffs and fail-closed unmapped paths), checking release-protection, secret-scanning, manifest/skill metadata contracts, offline vendored lock integrity, relative Markdown link and skill-name resolution, and disposable isolated native installations across all available Claude Code, Codex, pi and Antigravity CLIs (naming missing CLIs or lint-only runs explicitly as unproved rather than passes).

### Shaping, living specs and homeostasis

- Unsettled product intent routes through vendored shaping skills (`grilling`, `grill-me`, `grill-with-docs`, `domain-modeling`, `to-questionnaire`) so agents gather facts and owners settle product decisions into present-tense `SPEC.md` and stack/architecture choices into decision records.
- The `spec` skill authors, consolidates and reconciles one implementation-free `SPEC.md` per program using the Amnesia check (nothing missing that could cause wrong, spiritless, insecure or data-losing builds) and Bitter-Lesson check (nothing over-specified that blocks a cleaner future stack or design), reconciling `SPEC.md` directly against the live running product until homeostasis without generating ticket backlogs.
- `deepen` explores source code first to sharpen vague or ambitious requests and cold-checks nontrivial subagent briefs before handoff. `retro` reviews completed sessions for structural fixes, instruction pruning and harness/spend improvements.

### Design, verification, audits and conformance

- **Interface craft (`design`):** generates structural and behavioral UI alternatives grounded in the project's `DESIGN.md`, subtracts unneeded visual clutter before shipping, declares named visual state matrices and inspects every rendered capture at full size (keeping generated captures outside version control).
- **Consumer verification (`verification`):** proves running behavior on real user surfaces (success, rejection and recovery) using dedicated QA credentials for signed-in roles or explicit composition checks for internal packages, adding reproducible formal property checks (including broken-variant rejection) where ordering, concurrency or durability matter. Checks jump to decision points via deterministic state fixtures after one cold-onboarding smoke journey, prove parameter combinations at narrow state boundaries with one representative on the full surface, assert observable behavior rather than source-text snapshots or generated docs, and stay inside zero-sum `./scripts/check` budgets (`<= 120s` `fast`, `<= 300s` per `verify` surface/shard) under fail-closed surface closures.
- **Specialist audits (`test-audit`, `security-audit`, `foundation`):** prunes noisy tests while preserving independent consumer contracts; performs focused vulnerability audits (reading full pinned workflows upstream only when commissioned); and evaluates all twelve Constitution articles against [Conformance](skills/foundation/checklist.md#conformance), reconciling findings directly or marking owner-blocked items unverified.

### Isolated execution, delivery, release and recompile

- **Execution and supervision (`boat-workers`, `watchdog`):** each slice reuses one credential-free toolchain-snapshot worker (stopped while idle, deleted after exporting artifacts and evidence, reserving fresh egress-blocked machines for untrusted code) supervised periodically without arbitrary wall-clock caps until acceptance and cleanup finish; clean non-author runners mint release-trusted Merkle proof receipts and run parallel shards or bisection checks across independent workers.
- **Delivery and release (`ship-loop`, `merge-risk`, `resolve-merge-conflicts`, `release-watch`):** author-proved slices branch from `origin/verified` (falling back to default branch), pass `./scripts/check fast`, affected `./scripts/check verify --changed` and real-path proof with consumer rationale, reconciled `SPEC.md` section, rigor tier, observed proof, uncovered gaps and category-level Merge Danger verdicts, then land directly without PR CI queues or review bots (either via author squash-merge or pre-reviewed direct push-to-main). Coalesced single-flight sweeps advance `refs/heads/verified` with single-retry flake defect tracking and parallel first-parent bisection + auto-revert (capped at two reverts before hold). Release trains pin one candidate revision without resetting on subsequent trunk commits, consume clean-runner Merkle proof receipts or run fast checks directly alongside one critical-correctness/security assessment, deploy the verified artifact (`prepare → verify → publish → deploy`), advance `refs/heads/verified` where no sweep daemon runs, confirm live serving identity plus a critical journey, and recover safely on failure.
- **Recompile (`recompile`):** reviews active programs monthly and on model capability jumps by designing the simplest blank-sheet system from `SPEC.md` before comparing against legacy code, choosing explicitly whether to retain or regenerate `DESIGN.md`, and gating stateful cutovers on dry-run, unsafe-conversion refusal and rehearsed rollback over realistic user data.

## Public site

### Understand and adopt

- A visitor can understand what Mistystack is, which observed failures it addresses, how `core → misty → relevant method → outside proof` fits together, and how native adapters connect to that same tree without prior repository knowledge.
- The visitor can choose a destination harness and reach its canonical install, refresh, core-loading, rigor and proof instructions; commands come strictly from that harness's maintained reference.
- Integration status distinguishes an available native adapter, a universal-install runtime brief, existing private consumption and missing public setup/loading evidence instead of inventing commands or borrowing another harness's pass.

### Read and find the method

- Guide, Library and Evals are primary reading destinations; Foundation, Decisions, the Specification, Exemplars, Attribution, Changelog and source links remain reachable. Retired `/domain/`, `/stories/` and `/library/skills/to-spec/` / `/library/skills/to-tickets/` URLs redirect cleanly to `/spec/` and `/library/skills/spec/`.
- The library exposes the canonical core, mode and every task skill, including explicit-only skills and supporting documents. Each skill displays its exact installed name and trigger; Misty-authored skills also display prevented failure, owner, provenance and review/sunset date; vendored skills disclose upstream provenance from the lock without invented Misty metadata; supporting documents disclose inherited provenance.
- Every page identifies its source path and revision; headings and Foundation articles have shareable anchors (including numeric Foundation aliases); historical ADR references to retired files resolve via explicit archive links; decision status badges display plain text.
- Keyword search finds canonical documents and headings by name, phrase and prevented failure with content-type filters, shareable queries, empty/error states and accessible browse fallback when JavaScript is unavailable.
- Visitors can describe arbitrary tasks at the semantic skill finder and receive every scored preferred-set skill ranked by closeness, disclosing source pack, pin, description, invocation/install command and upstream link alongside served model, known cost, incomplete-scoring status and explicit failure states without fabricated scores.
- Mobile layouts keep navigation, titles, metadata, tables and code readable without horizontal page scroll or hover-only controls; keyboard focus and heading navigation stay operable; light and dark themes follow system preference with user toggle, readable without JavaScript or WebGL under reduced motion.

### Trust content and evidence

- Pages, counts, links, raw source projections and search indexes derive from a single checked-out source revision; publication fails hard on unresolved metadata, broken internal links, missing anchors or duplicate routes rather than shipping a partial library.
- Each evaluation reports task count, arm denominators, method, harness/model, revision limits, measurements, limitations and honest artifact visibility together so new rounds become discoverable automatically.

### Review and operate

- Review previews identify their reviewed commit, link affected pages and carry `noindex` without exposing deploy credentials to untrusted code.
- Production releases expose their serving content revision, promote tested artifacts safely, return real `404` status with search/library recovery on unknown routes, protect query/private text from telemetry, and keep telemetry non-blocking and evidence-backed under the [Foundation checklist](skills/foundation/checklist.md).

## Decision records

Stack exceptions, deployment commissions and historical choices live in [decision records](docs/decisions/index.md), including static publishing ([ADR 0018](docs/decisions/0018-static-publishing-stack.md)), live verification and release gating ([ADR 0023](docs/decisions/0023-live-verification-and-release-gate.md)), semantic skill discovery ([ADR 0025](docs/decisions/0025-skill-finder-worker.md)), the one-page method ([ADR 0026](docs/decisions/0026-one-page-method.md)), dropping OMP ([ADR 0027](docs/decisions/0027-drop-omp.md)), specification-driven homeostasis ([ADR 0028](docs/decisions/0028-spec-drives-the-application.md)) and agentic verification, surface closures and release trains ([ADR 0029](docs/decisions/0029-agentic-verification-and-release-trains.md)).
