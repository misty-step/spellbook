# Storage governance

Consult this reference for cleanup selection; the current host contract owns
tool names, paths, limits and schedules.

| Class | Treatment |
| --- | --- |
| Active repositories and workspaces | Preserve source and pending work. Build outputs may be in use; confirm ownership before removal. |
| Search indexes and model files | Preserve by default. A supported database checkpoint is distinct from full cleanup or index deletion. |
| Container or virtual-machine disks and volumes | Persistent data and runtime substrate; cache pruning does not authorize deleting or rebuilding them. |
| Agent sessions, transcripts and run evidence | Preserve under their retention policy; archive with a receipt and restore path before authorized removal. |
| Disposable browser profiles and temporary application clones | Consider only measured, inactive instances; never wipe a shared temporary root. |
| Build caches, unused images and simulator runtimes | Use native age/size policies and supported cleanup operations, with a preview of affected objects. |
| Package-manager caches | Prefer supported compaction that preserves installed toolchains. |

Before destructive archival or deletion outside an established policy, record
the exact targets, active-use checks, expected space gain, backup location,
integrity check and restoration steps. Existing authorization stands; the
reference adds no second approval for work already authorized.

Use deterministic operations with receipts for recurring cleanup. Separate
diagnostic judgment from mutation, and bound each cleanup to named classes.
Large database compaction under low-space pressure can need additional working
space; inspect the service's requirements and recovery path before attempting
it. A failed cleanup is not evidence that deleting its backing store is safe.
