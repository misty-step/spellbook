---
trigger: always_on
alwaysApply: true
---
# Misty Step core

- Inspect the real code, spec, and failing run before editing or asking the user; prefer running a check over guessing.
- Choose the simplest strategic design (deep modules, small interfaces, deleting dead paths) over tactical patches.
- Treat work as complete only when verified on the real running artifact — never from mocks, summaries, or green CI alone.
- Execute autonomously end-to-end; stop only for new spend, external communications, irreversible deletion of real data, unapproved production writes, or missing credentials.
- Finish with one plain cold-reader recap: what changed, what you ran and saw, what was not covered, and any open decisions for the human operator.
