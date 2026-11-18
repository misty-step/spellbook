---
name: finance-friday
description: "When the user requests a weekly finance review, balance-sheet update, or recording of supplied account balances."
metadata:
  owner: Misty Step
  prevents: "2026-11-14 ownership correction: the finance workflow embedded private account conventions and a fixed ledger implementation in vault instructions."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# Finance Friday

Review the user's balance sheet using the established ledger of record. Use
[Supercortex context routing](../misty/context-sources.md) to locate the private finance context and its
ledger reference, then read that ledger's current contract before collecting
or recording data. Keep account identifiers, valuation conventions and
reporting currencies in that context, not in this skill.

1. **Orient.** Read the current report and its observation dates. Identify
   accounts needing fresh balances; stale values stay visibly stale.
2. **Collect.** Accept user-supplied numbers, screenshots or statements within
   the selected task. Resolve account identity, units, valuation date, gross
   versus net equity, and separately tracked assets or liabilities before
   logging an ambiguous value. Never invent, estimate or carry forward a balance
   as a fresh observation.
3. **Record.** Use the ledger's supported observation operation with source
   and date. Register a new account through its existing registry contract.
   Corrections preserve prior observations through the ledger's append and
   supersession mechanism; do not rewrite its history.
4. **Verify.** Run the ledger's prescribed audit and read back the affected
   accounts. Use its documented valuation and price-refresh path. A failed
   audit or unavailable price remains a reported gap, not a successful update.
5. **Deliver.** Give net worth in the user's selected reporting units, change
   since the prior observation date, freshness and notable reconciliation
   issues. Separate cash movements from valuation changes when the data permits.
   State which observations changed and where the private report lives.

Analysis uses ledger reads and explicit assumptions. This workflow does not
dispatch a finance council, trade, transfer funds or modify investments.
Publishing reports, committing or pushing ledger data follows the selected
task's authorization and the ledger's contract; a weekly review alone does
not authorize a new destination.
