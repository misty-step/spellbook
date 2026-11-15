---
name: system-maintenance
description: "When diagnosing workstation disk pressure, pruning caches, or reviewing recurring storage maintenance for an agent workspace."
metadata:
  owner: Misty Step
  prevents: "2026-11-14 source review: storage guidance referenced an unimplemented cleanup command and mixed private host policy into portable instructions."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-12-14"
---

# System maintenance

Keep the workstation usable without destroying its development substrate or
evidence. Input is a reported pressure symptom or a requested maintenance
scope. Discover the active host and read its native maintenance contract;
private host configuration and schedules belong to the workstation owner.
Use [Daybook](../daybook/SKILL.md) only when existing private maintenance
history is relevant.

1. **Measure.** Read free space and scoped directory or service usage. Identify
   the growing class and its owner before proposing cleanup; distinguish
   reclaimable cache from active work, persistent data and retained evidence.
2. **Select the supported operation.** Read
   [storage governance](references/storage-governor.md). Use the host's
   existing deterministic maintenance operation, inspecting its current help
   and policy. Do not assume a proposed helper or old command exists.
3. **Preview and apply within authority.** Obtain an exact dry-run target list
   or equivalent read-only receipt. Check active use and restore requirements.
   Apply only the classes covered by the user's request or existing retention
   policy. For uncovered destructive changes, present the concrete targets,
   recovery plan and expected gain for approval; continue safe diagnosis.
4. **Read back.** Measure free space after cleanup and check the affected
   development or search service still works. Keep command results and recovery
   references in the approved private maintenance record. A cache that refills
   immediately needs a retention or budget decision, not repeated emergency wipes.

Deliver before/after space, exact paths or classes acted on, commands and
results, protected areas skipped and residual risk. Recurring stewardship may
review receipts and propose policy changes; creating a schedule or changing
host policy is separate work requiring the user's selected scope.
