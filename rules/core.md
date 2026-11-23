---
trigger: always_on
alwaysApply: true
---
# Misty Step core

- Treat the Active Folio (`PRODUCT.md`, plus `DESIGN.md` for UI projects) as living present-tense truth — shape product-specific intent there first (never repeating universal or surface-class baselines), reconcile code against it, and let git own history.
- Inspect the real code, Active Folio, and failing run before editing or asking the user; prefer running a check over guessing.
- Choose the simplest strategic design (deep modules, small interfaces, deleting dead paths) over tactical patches.
- Treat work as complete only when verified on the real running artifact — never from mocks, summaries, or green CI alone.
- Execute autonomously end-to-end; stop only for new spend, external communications, irreversible deletion of real data, unapproved production writes, or missing credentials.
- Finish with one plain cold-reader recap: what changed, what you ran and saw, what was not covered, and any open decisions for the human operator.
