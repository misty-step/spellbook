# Decisions

Records explain trade-offs; current method guidance lives in the
[guide](../guide/) and [foundation checklist](../../skills/foundation/checklist.md).

## Current

- [0030](0030-five-stage-flow.md): Misty's loop is Lauren Tan's five stages
  (understand, design, build, verify, ship); pstack returns as a SHA-pinned
  companion pack, not vendored; principles add default state machines, formal
  verification, bug-to-lint and context in the path. Refines 0026.
- [0029](0029-agentic-verification-and-release-trains.md): standard `./scripts/check`
  contract (`fast <= 120s`, `verify <= 300s/shard`, `doctor`), fail-closed surface
  closures, check-authoring laws, coalesced `refs/heads/verified` trunk sweeps with
  parallel bisect auto-revert, clean-runner Merkle proof receipts and pinned-SHA
  release trains. Refines [0023](0023-live-verification-and-release-gate.md) and
  supersedes its release-only CI phrasing where trunk sweeps operate.
- [0028](0028-spec-drives-the-application.md): `SPEC.md` is the single
  implementation-free target state per program (folding `DOMAIN.md` and
  `USER_STORIES.md`), reconciling drift directly to homeostasis without
  ticket-backlog materialization; adds `skills/spec` and removes `to-spec` and
  `to-tickets` from `vendor/pocock.lock.json`.
- [0027](0027-drop-omp.md): OMP is not a supported harness. Removes its adapter,
  agents, proof and lint; the companion-pack pins move unchanged to
  `.claude-plugin/marketplace.json`, their one home. OMP users may try the
  universal install at their own risk.
- [0026](0026-one-page-method.md): the method is one self-contained page and
  pstack is no longer vendored. Supersedes 0021 and the "pstack governs"
  rule of 0022; the owner's rulings in 0022 to 0024 stay in force, restated in
  the mode. Makes the three-arm comparison a tool, not a gate. Its OMP
  adapter and OMP home for companion pins are superseded by 0027.
- [0025](0025-skill-finder-worker.md): one bounded Jev skill-finder route in the
  existing Worker, with pinned preferred-set content and explicit degradation.
  Supersedes 0018's assets-only restriction for skill discovery.
- [0024](0024-pocock-shaping-skills.md): unsettled intent routes to vendored
  Matt Pocock shaping skills under a hash-checked lock. Supersedes 0022 row 7's
  unrouted owner provision; tracker-published specs and `to-spec` /
  `to-tickets` are superseded by 0028.
- [0023](0023-live-verification-and-release-gate.md): author-owned running-product
  proof, merge without CI/review, fast CI and one critical assessment at release;
  one snapshot-backed Boat worker per slice and open-ended watchdog supervision.
  Supersedes older delivery/review/lifecycle instructions, including 0022's
  shipping and placement provisions and the historical Foundation PR obligations;
  check contract, `refs/heads/verified` sweeps and pinned release trains are
  refined by [0029](0029-agentic-verification-and-release-trains.md).

- [0022](0022-pstack-governs-owner-rulings.md): pstack governs; Misty keeps only
  the owner's surviving deltas. Its governing rule is superseded by 0026; its
  rulings remain. Supersedes 0021's method override restrictions
  and 0017's public provider-specific placement rule. Removes the router's
  Git-as-task-state prohibition without superseding 0020.

- [0021](0021-pstack-is-the-foundation.md): pinned wholesale pstack foundation,
  native mappings and minimal portability patches. Superseded by 0026. [0022](0022-pstack-governs-owner-rulings.md)
  supersedes its method override restrictions, not its vendoring decisions.

- [0020](0020-github-and-linear-replace-entire.md): GitHub hosts code and pull
  requests; Misty Step tracks work items in Linear. Its retired PR-ledger
  mechanism is removed by 0023; Linear-as-product-intent-backlog is superseded
  by 0028. Supersedes [0019](0019-entire-is-the-forge.md),
  which made Entire the forge on 2026-10-30.
- [0018](0018-static-publishing-stack.md): Astro static publishing, Pagefind and
  Workers Static Assets as a recorded stack exception; deployment commissioned
  2026-10-29. The pre-deploy release gate and checked-artifact deployment now
  follow 0023; telemetry and production Foundation proof remain open.
- [0017](0017-tern-omp-and-boat-workers.md): historical operator setup and exit
  decisions. [0023](0023-live-verification-and-release-gate.md) owns the current
  snapshot-backed Boat slice lifecycle.
- [0016](0016-harness-agnostic.md): one harness-neutral Agent Skills content tree
  with thin native adapters; OMP shipped first, remaining integrations in #591.
  Its Kaylee/Hermes consumer statement is superseded by
  [0017](0017-tern-omp-and-boat-workers.md).
- [0015](0015-omp-method-plugin.md): references instead of packs, private
  workstation machinery and the Foundations redirect remain accepted; its
  OMP-only clause is superseded by [0016](0016-harness-agnostic.md).
- [0012](0012-native-release-promotion.md): retain Landmark and native GitHub
  release promotion.

## Workstation decisions

These accepted records describe machinery now owned by private
`misty-step/workstation`. Their original paths and runtime observations remain
historical evidence, not current mistystack instructions.

- [0013](0013-application-management-not-desktop-control.md): native application
  management without live-desktop control.
- [0014](0014-live-account-routing-evidence.md): account routing from fresh
  evidence instead of dated instruction prose.

## Historical

Historical numbers remain reserved. Retired executable delivery instructions
are removed; their source history and evidence remain available in Git.

- [001](historical/001-monorepo.md): one repository, three components.
- [002](historical/002-design-toolkit-trial.md): design toolkit trial.
- [003](historical/003-foundation-checks.md): foundation checks and bootstrap.
- [004](historical/004-core-project-documents.md): core project documents.
- [005](historical/005-operational-obligations.md): deployment, alerts and incident classes.
- [006](historical/006-foundation-decisions.md): constitution and agent authority.
- [008](historical/008-foundations-audits.md): audit organization.
- [010](historical/010-local-cto-summon-factory.md): local CTO pilot.
- [011](historical/011-machine-local-preferences.md): portable defaults and local preferences.
- [0019](0019-entire-is-the-forge.md): Entire as the forge interface, 2026-10-30;
  superseded by 0020.
