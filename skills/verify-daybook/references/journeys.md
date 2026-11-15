# Running verification journeys

Use the installed `verify-daybook` entrypoint first. `DAYBOOK_VERIFY` selects
this installed skill directory; `DAYBOOK_VAULT` selects the authorized checkout.
Neither location implies the other. Read the selected product's contextual
expectations without treating historical run commands as current instructions.

Run portable suites on the task's Boat worker. Transfer only the necessary
program sources and synthetic fixtures, never private vault contents or host
credentials. Native schedule and installation observations stay on the host.

## Select a feature

Run `"$DAYBOOK_VERIFY/scripts/drive.sh" FEATURE EVIDENCE RUN`. Use a fresh RUN
below `~/.cache/tmp/verify-daybook-<runid>/`; EVIDENCE must be outside every Git
checkout and run directory. Read the script header for its exact arguments.
Select the changed feature rather than `all` when unrelated live access is absent.

| Feature | Consumer and evidence | Prerequisites and limits |
| --- | --- | --- |
| `path-guards` | Real helper refusal of escaping, symlinked and ambiguous paths; harmless decoy and pending fixture bytes survive | Synthetic fixtures only; never use the actual vault as a refusal target |
| `capture-readwise` | Real ingester against a local API stub: normal, empty, retry, rejected credentials, unreachable API and concurrent writer cases | Set `DAYBOOK_INGEST_SCRIPT` for a candidate; otherwise it uses the selected vault's ingester. Real retry delays remain part of the proof; no live account is used |
| `capture-sessions` | Synthetic harness transcripts, redaction, horizon, idempotence and host-scoped commits | Live freshness observes header metadata only. Fixture JSONL compatibility does not prove current native transcript compatibility |
| `sync` | Actual runtime CLI, real Git and scanner, disposable origins, races, conflicts, secret rejection and confirmation receipts | Defaults to installed `~/.local/libexec/daybook/sync`; `DAYBOOK_SYNC_SCRIPT` selects a reviewed candidate. Requires real gitleaks; agent-command receipts do not prove an LLM repair |
| `layer-marks` | Synthetic provenance migration, byte preservation, refusal and recovery; contextual historical classification checks | Journal frontmatter reading is fixture-only. Historical classification is not current permission to edit |
| `synthesis` | Real checker against cited notes, repaired links, preserved source bytes, selected commits and negative controls | Semantic fidelity still needs authorized source review. Live baseline reports counts only; it does not authorize bulk repair |
| `sign-in` | Native owner identity, Git reachability, configured schedule and freshness observations | Requires the host's existing authorized access. Missing inputs and WARN results remain unproved; no credential values enter output |
| `site` | Configured site's signed-out and signed-in access, indexed revision, note/media bytes and search | Only for an authorized active deployment with explicit URLs, QA identity and permitted note/title/query inputs. A historical recipe does not establish a live site |

## Runtime and host proof

For standalone synchronizer proof, run
`python3 "$DAYBOOK_VERIFY/scripts/check-sync.py" --script PATH --run-dir RUN/sync`.
Retain both writers' bytes, commit identity, remote history, exit codes and
failure-episode receipts. `DAYBOOK_SYNC_SLOW=1` adds the continued-save/load case
to `drive.sh sync`; run it when that boundary changed. Current timeout behavior
is implementation evidence, not approval to change the method's supervision policy.

Read-only health uses `"$DAYBOOK_VERIFY/scripts/doctor.sh"`; its `--only` option
selects relevant sections. Host identity and schedule inputs are explicit in the
skill entrypoint. Do not run a live runner as a health check, bootstrap a real
schedule, change state, or install credentials merely to obtain a passing result.

Runtime ownership and deployment proof belong to the selected private runtime's
native install contract. Observe installed hashes, existing registrations and
later natural outcomes. A loaded schedule or a daily-gated invocation does not
prove a full maintenance pass. For a separately authorized pass, compare the
published revision, journal tree identity, navigation output and success receipt;
inspect only the permitted diff needed to assess source preservation. Failures
and retained patches are incomplete outcomes, not successful maintenance.

A synthetic schedule test uses only a disposable label, fixture checkout and
recording command, then removes only its own registration. An actual agent repair
needs separate authorization and an isolated fixture with real publication
blocked; inspect both writers' persisted bytes and the next confirmed outcome.
Use canonical Daybook remediation guidance rather than inventing another policy.

## Evidence and cleanup

Keep the command, source and installed identities, exit status, transcript and
`summary.tsv` outside the vault. Counts and Git metadata suffice for host privacy
checks. Never print credential resolution output. A dry-run push proves endpoint
access, not publication; stubbed providers prove local handling, not provider behavior.

Scan evidence before authorized publication. Run
`"$DAYBOOK_VERIFY/scripts/cleanup.sh" RUN EVIDENCE`, confirm evidence survives,
and clean owned worker resources through the Boat skill. Private classifier,
fleet gate and retired monitor checks belong to their runtime owner's procedures;
they are not implicit Daybook verification actions.
