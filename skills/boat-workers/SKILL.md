---
name: boat-workers
description: "Before builds, test suites, browser QA, untrusted code or long jobs: use one saved-toolchain-snapshot Boat worker per slice, stop it while idle, resume it and delete it after collecting evidence."
metadata:
  owner: phaedrus
  prevents: "Fresh-per-command setup waste and lifecycle timeouts that cut off unfinished agents; Phaedrus's 2026-11-03 owner directive."
  source: "Misty Step; provenance in ATTRIBUTION.md#skill-provenance."
  sunset: "2026-11-27"
---

# Boat workers

One slice owns one worker for its whole execution. Start it from a saved toolchain
snapshot, reuse its installed dependencies and working state, stop it when idle,
and delete it after its deliverables and evidence are collected. Fresh per
command is reserved for untrusted code. The [watchdog](../watchdog/SKILL.md)
supervises open-ended agents; elapsed time is not a termination condition.

## 1. Place the slice

Use Boat for portable builds, test suites, browser QA against running services,
Docker, unfamiliar or untrusted code, parallel experiments and long jobs.
Independent slices get separate workers, worktrees and branches. Repeated checks
within a slice use its existing worker, not another start.

Automated browser suites use the worker's Chrome. For the harness browser tool,
run services on the worker and keep `boat forward <id> --remote <port>` running
as an owned background process. Drive `localhost` and stop the forward when it
is no longer needed. Inspecting an already deployed surface needs no worker.

Keep execution where you run when acceptance requires its platform, device,
signed-in session or private network; when data cannot leave it; or for quick,
trusted inspection and edits. Follow the limits in your
[harness note](../misty/SKILL.md). A Linux worker cannot prove macOS or device
behavior. Workers do not create nested workers or dispatch independent slices;
the coordinator owns dispatch and lifecycle.
**Complete when:** each slice has one execution placement and its reason.

## 2. Check access and choose a saved toolchain

Read installed `boat --version` and the relevant command's `--help` before first
use. Use `--no-update` for reproducible orchestration. The examples below were
source-checked against Boat CLI 1.0.89 and first-party documentation; live help
and observed responses own version-specific syntax.

Use the existing Boat login. Read `boat --no-update status --json`,
`boat --no-update limits --json` and `boat --no-update list --all --json` in the
intended billing scope. Proceed only with working access, `canStart: true`,
`nextStartDollars: 0` and available included VM time. Read live size availability
and shared allowance rather than copying quotas into a brief. Recheck allowance
and `boat usage <id> --json` during supervision so open-ended work does not
silently enter paid overage. Stop idle work and ask Phaedrus before wallet
charges, paid starts, extra saved snapshots, purchases, plan changes, public
hosting, new provider connections or new/wider credentials. An unavailable
credential or allowance is a blocker, not permission to run less isolated.

Read `boat --no-update snapshots --json`. Its `named` array supplies real saved
snapshot names and readiness; `namedAllowance` supplies their allowance. Select
an observed `ready` toolchain snapshot in the same billing scope. Do not invent
snapshot names or listing flags. The first-party
[saved snapshot API](https://docs.boat.dev/api/reference/snapshots/list-saved-snapshots.md)
also documents named inventory.

If no suitable template exists, prepare a credential-free worker once, install
the required pinned toolchain and save it:

```sh
boat --no-update snapshot <prepared-worker-id> <toolchain-name>
```

Wait for that name's `ready` status before using it or changing the source disk;
`failed` is not deployable. The documented
[GET /saved-snapshots/{name}](https://docs.boat.dev/api/reference/snapshots/get-saved-snapshot.md)
provides its save status. Collect preparation evidence and delete the preparation
worker after the save succeeds. Do not overwrite another slice's template.

Keep owner credentials, auth stores, agent homes, private data and per-slice
secrets out of the reusable snapshot. `--no-env` withholds managed credentials;
it cannot sanitize secrets you put in arbitrary files. Saved snapshots preserve
disk, not running processes, firewall rules or all caches. Put reusable tool
caches in a saved location, not `~/.cache` or `/tmp`; use
[what a snapshot saves](https://docs.boat.dev/snapshots/whats-saved.md) for the
actual Docker and filesystem contract.
**Complete when:** access, authorized capacity and a real, ready, credential-free
toolchain snapshot are identified.

## 3. Start once and reuse

```sh
boat --no-update new --from <toolchain-name> --type <type> --no-env --no-auto-stop --json
boat --no-update push <id> .
boat --no-update exec <id> --timeout 0 -- <command>
```

Retain the actual `bx_...` ID returned by creation and use it explicitly for
every operation; `current` is shell-local. `--push` copies tracked and unignored
files from the current directory. Run it from the narrowest directory the job
needs, name that directory in the brief, and never push from a notes vault or
home directory. Record the snapshot identity, source revision, worker ID and
commands in the existing slice thread with its evidence, not a second ledger.

`--no-auto-stop` keeps the actively supervised slice alive until an explicit
stop. Do not impose an agent wall-clock cap through a TTL, task deadline or
shell wrapper. A trial that refuses this setting is an explicit access blocker;
do not disguise its auto-stop as an acceptable agent deadline.

`boat exec` otherwise defaults to a 30-second command timeout. For a long check,
`--timeout 0` streams until completion and preserves its exit code. For a server
or other background process, use `--detach`, retain its process ID, and read it
with `--status <pid>` or `--attach <pid>`. A finite timeout is appropriate for an
individual probe that must fail promptly, such as a network or readiness probe;
it is not a limit on the agent or slice. After a transport failure, inspect the
existing command before retrying: it may still be running.

The default `--no-env` worker runs commands without owner secrets. Mutable author
slice workers prove PR slices and pre-land `./scripts/check` runs, never
release-trusted proof receipts: release receipts come only from clean-checkout
`--no-env` non-author Boat runners (verifier or coalesced `refs/heads/verified`
sweep) keyed by surface closure and shared-core git-blob Merkle hashes.
Parallel surface shards (`--shard`) and trunk culprit bisection run in separate
non-author Boat workers concurrently so one failure never serializes others. An integrated
agent requires an already authorized, least-privilege credential route and its
self-contained brief; a worker does not inherit the coordinator's method or
skills. Do not copy a local auth store or enable broad credentials just to make
`boat prompt` work. New credential routes and paid AI proxy use need Phaedrus.
**Complete when:** one identified worker serves the slice, long work has no
blanket deadline, and the watchdog owns its supervision.

## 4. Stop while idle and resume the same slice

When no useful command or agent is running and the slice is waiting on a
prerequisite, save needed in-memory state, stop owned forwards, then run:

```sh
boat --no-update stop <id> --json
boat --no-update info <id> --json
```

A stop request is not proof of a stopped machine. Observe the completed stop;
retain a stop ID for `boat stop <id> --status <stop-id> --json` if supplied. A
stop preserves disk, not memory or running programs. Do not stop a useful build
or active agent merely because it has run a long time. Do not force a failed
snapshot stop: `--force` can lose accepted work.

When the prerequisite is available, resume that worker:

```sh
boat --no-update resume <id> --no-auto-stop --json
```

Read readiness, restart required services and forwards, and reapply any firewall
rules before continuing. Conversations survive a stop, but manually started
processes do not. Use `boat prompt <id> --resume <conversation-id>` with the
continuation instruction for an integrated agent. Stopped disks have a retention
window, not an indefinite durability guarantee; export needed work and follow
[Boat's stop/retention contract](https://docs.boat.dev/snapshots/stop.md) for an
extended wait. Do not add a deadline that terminates the task to manage retention.
**Complete when:** idle compute is stopped and resumed work uses the same slice
state with its required protections restored.

## 5. Collect evidence and delete

Keep each command's output and exit status, source revision, artifact identity
and real-path verification evidence. A failed or interrupted check stays failed
or unverified. Transfer deliverables before deletion: return changed files,
publish the authorized branch or copy artifacts back. Stop owned forwards and
other coordinator-side processes.

```sh
boat --no-update delete <id> --yes --json
boat --no-update list --all --json
```

Retain the deletion receipt. The CLI follows deletion; if collection was
interrupted or an operation remains pending, use
`boat deletion status <operation-id> --json` until it reports `completed`.
Confirm the owned ID is absent from all-state inventory; a partial inventory or
an absent row alone does not prove data erasure. Stop is not deletion. Preserve
the reusable toolchain snapshot, not a per-slice worker indefinitely. Reconcile
an interrupted launch's actual ID before retrying, and operate only on IDs you
own.
**Complete when:** deliverables and evidence are outside the worker, all owned
slice workers are deleted, and their deletion result is retained.

## Untrusted code

For untrusted code only, use a fresh worker per command and delete it after
collection. `boat run --no-env --from <toolchain-name> --type <type> --push . --
<command>` provides create/run/delete, but `--no-env` and a VM alone are not an
egress boundary. Before executing hostile or exploit code, establish blocked
outbound IPv4 and IPv6 for a separate Linux account without sudo, and run the
code as that account. Preserve Boat's control channel. Apply and verify those
rules in each fresh worker; snapshots do not keep them. Use Boat's
[outbound isolation procedure](https://docs.boat.dev/hosting/firewall.md#block-outbound-internet-for-untrusted-code)
and the security assignment's sandbox contract. Never reuse that worker as a
trusted slice worker or promote its disk into the shared toolchain snapshot.

## Sources

- [Saved snapshots](https://docs.boat.dev/snapshots/templates.md): save once, start with `--from`, readiness and credential inheritance.
- [Auto-stop](https://docs.boat.dev/long-running-tasks/auto-stop.md): disable automatic termination; resume preserves the setting.
- [Background commands](https://docs.boat.dev/long-running-tasks/background-commands.md): no-limit execution, detached status and exit-code collection.
- [Access and credentials](https://docs.boat.dev/environments/access.md): `--no-env` protection and its limits.
- [Billing](https://docs.boat.dev/billing.md) and [deletion](https://docs.boat.dev/data-retention/delete.md): live allowance, stopped costs and deletion receipts.
