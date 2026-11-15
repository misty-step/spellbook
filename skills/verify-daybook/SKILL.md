---
name: verify-daybook
description: "When checking Daybook synchronization, ingestion, privacy, synthesis, maintenance or delivery after a change."
metadata:
  owner: phaedrus
  prevents: "2026-11-14: active agent guidance lived in a context vault, coupling instruction discovery to private data."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# Verify Daybook

Locate the selected vault through [daybook](../daybook/SKILL.md). Set `DAYBOOK_VAULT` to its absolute checkout path. This installed skill owns
the `scripts/` helpers; set `DAYBOOK_VERIFY` to this installed skill directory.
The vault's `docs/verification/` holds product expectations and feature recipes.
Helpers never infer a vault from their installed location. Read the changed journey's recipe first.

1. Run `$DAYBOOK_VERIFY/scripts/doctor.sh` for read-only configured health. Select
   live checkout with `DAYBOOK_VAULT`; keep FAIL and WARN/unverified explicit.
2. Run the changed feature with `$DAYBOOK_VERIFY/scripts/drive.sh FEATURE EVIDENCE RUN`.
   The runner creates synthetic fixtures only below
   `~/.cache/tmp/verify-daybook-<runid>/` and refuses unsafe paths. Evidence must
   remain outside the checkout and scratch run directory. Read its transcript
   and `summary.tsv`; a missing prerequisite is unverified.
3. For new syntheses, use `$DAYBOOK_VERIFY/scripts/check-synthesis.py --vault PATH
   --base OWNED_BASE NOTE...` in an owned worktree, or `--summary` without a base
   for read-only counts. The checker does not establish semantic fidelity.
4. Record revision, command, observed end states and uncovered claims. Scan
   evidence for secrets before authorized publication. Run
   `$DAYBOOK_VERIFY/scripts/cleanup.sh RUN EVIDENCE` and verify evidence remains.

The actual vault is observed read-only during verification. Do not run capture,
sync or Git mutations there. Use `GIT_OPTIONAL_LOCKS=0`. Journal checks use Git
metadata, not private bodies; fixtures use synthetic data. Never open personal
note bodies merely to prove health. Stop only processes the run created.
Fixture proof does not establish live schedule installation, publication,
credentials, transcript compatibility or an LLM repair; exercise each claimed
live boundary separately. Follow [boat-workers](../boat-workers/SKILL.md) for
portable suites; macOS-specific host observations stay on the actual host.

Host health inputs are explicit: `DAYBOOK_REPOSITORY` (`owner/repo`),
`DAYBOOK_OWNER`, and `DAYBOOK_SYNC_PLIST` name local identity/schedule facts.
The optional retired-site check also requires explicit deployment URLs and a
permitted QA note/title/query; read its script header before use. Missing inputs
leave those checks unproved. `check-sync.py --script` and `run-ingest.py --script`
select the actual product executable; no helper resolves it from the skill path.

The sync journey defaults to the installed `~/.local/libexec/daybook/sync`;
set `DAYBOOK_SYNC_SCRIPT` to test a reviewed candidate from its runtime owner.
The vault does not own that executable.
