---
name: release-watch
description: "Verify a merged change through deployment, live build identity, and one real user journey."
---

# Release watch

A merged pull request is not a live release; follow the change through the repository's deployment or publication pipeline until the target environment updates. Confirm the live build identity — commit SHA, package version, or `/healthz` metadata — matches the merged change rather than assuming a green workflow deployed new bytes. Exercise at least one real user journey on the live surface affected by the change and check relevant error or health signals for regressions. If deployment, identity readback, or the live journey fails, recover through the repository's safe rollback path and escalate immediately to the human operator before any mutation that risks live user data. Report the exact verified state — distinguishing `merged`, `deployed`, and `live verified` — along with what ran and any unverified gaps.
