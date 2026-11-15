#!/usr/bin/env bash
# Read-only health of the configured Daybook checkout and scheduled synchronizer.
# Usage: doctor.sh [--only privacy,owner,schedule,freshness,layers,gitleaks,checkout]
# PASS|FAIL|WARN|INFO lines contain metadata only. No installation or job mutation.
set -uo pipefail
SCRIPTS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
REPO=$(cd "${DAYBOOK_VAULT:?set DAYBOOK_VAULT to the selected checkout}" && pwd -P)
PY=${PYTHON:-python3}
# shellcheck source=run-guard.sh
. "$SCRIPTS/run-guard.sh"
MAIN=$(canonical_path "${DAYBOOK_VAULT:-$REPO}")
STATE=${DAYBOOK_SYNC_STATE:-${XDG_STATE_HOME:-$HOME/.local/state}/daybook-sync}
REF="$HOME/.config/daybook-ingest.env.pass"
ONLY=""
[ "${1:-}" = "--only" ] && ONLY=${2:?sections}
export GIT_OPTIONAL_LOCKS=0
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE
SLUG=${DAYBOOK_REPOSITORY:-$(gh repo view --repo "$(git -C "$MAIN" remote get-url origin)" --json nameWithOwner -q .nameWithOwner 2>/dev/null)}

HOST=$(uname -n)
FAILS=0
out() { printf '%s %s: %s\n' "$1" "$2" "$3"; [ "$1" = FAIL ] && FAILS=$((FAILS + 1)); return 0; }
want() { [ -z "$ONLY" ] || [[ ",$ONLY," == *",$1,"* ]]; }
tl() { local p=$1; [[ $p == "$HOME"* ]] && p="~${p#"$HOME"}"; printf %s "$p"; }
bounded() {
  "$PY" -I -c 'import subprocess, sys
try:
    sys.exit(subprocess.run(sys.argv[1:], timeout=60).returncode)
except subprocess.TimeoutExpired:
    sys.exit(124)' "$@"
}
if ! git -C "$MAIN" rev-parse --git-dir >/dev/null 2>&1; then
  out FAIL vault "DAYBOOK_VAULT is not a Git checkout ($(tl "$MAIN"))"
  exit 1
fi
out INFO vault "observing $(tl "$MAIN"); change DAYBOOK_VAULT to select another checkout"

if want privacy; then
  vis=$(gh repo view "$SLUG" --json visibility -q .visibility 2>/dev/null)
  [ "$vis" = PRIVATE ] && out PASS repo-private "$SLUG visibility PRIVATE" || out FAIL repo-private "private visibility could not be confirmed"
  for repo in "$MAIN" "$REPO"; do
    names=$(git -C "$repo" remote | sort -u | tr '\n' ' ')
    bad=$(git -C "$repo" remote -v | awk '{print $2}' | sort -u |
      grep -v -E "^(https://github\\.com/|git@github\\.com:|ssh://git@github\\.com/)$SLUG(\\.git)?$")
    if [ "$names" = "origin " ] && [ -z "$bad" ]; then
      out PASS remote-only-private "$(tl "$repo"): only origin, pointing to the private repository"
    else
      out FAIL remote-only-private "$(tl "$repo"): unexpected remote configuration (URLs withheld)"
    fi
  done
fi

if want owner; then
  login=$(gh api user -q .login 2>/dev/null)
  [ -n "${DAYBOOK_OWNER:-}" ] && [ "$login" = "$DAYBOOK_OWNER" ] && out PASS gh-account "gh is signed in as the repository owner" || out FAIL gh-account "gh owner identity is not confirmed"
  perm=$(gh repo view "$SLUG" --json viewerPermission -q .viewerPermission 2>/dev/null)
  case $perm in ADMIN|MAINTAIN|WRITE) out PASS repo-write "viewerPermission $perm on the private repo" ;;
    *) out FAIL repo-write "write permission is not confirmed" ;; esac
  if bounded git -C "$MAIN" ls-remote --exit-code origin refs/heads/master >/dev/null 2>&1; then
    out PASS ls-remote "origin master is reachable through this checkout's Git credentials"
  else out FAIL ls-remote "origin master is unreachable"; fi
  if bounded git -C "$MAIN" push --dry-run -q origin HEAD:refs/heads/verify-daybook-push-probe >/dev/null 2>&1; then
    out PASS push-auth "Git accepts a dry-run push; no ref is created"
  else out FAIL push-auth "Git refused the dry-run push"; fi
  if git -C "$MAIN" var GIT_AUTHOR_IDENT >/dev/null 2>&1; then
    out PASS git-identity "a Git author name and email are configured"
  else out FAIL git-identity "configure this checkout's Git author name and email"; fi
  # Retired ingestion has no live credential/probe requirement.
  out INFO readwise-ingest "retired ingestion: live Readwise credential/probe not checked"
fi

if want schedule; then
  while IFS= read -r line; do
    set -- $line
    out "$1" "${2%:}" "${line#* * }"
  done < <("$PY" -I - "$MAIN" "$STATE" "$REPO" 2>/dev/null <<'PY'
import os, pathlib, plistlib, re, shlex, shutil, subprocess, sys, time
vault, state, repo = map(pathlib.Path, sys.argv[1:])
def out(level, key, text):
    print(f"{level} {key}: {text}")
failures = state / "failures"
if failures.exists():
    count = failures.read_text().strip()
    if not count.isdigit():
        out("FAIL", "sync-failures", "consecutive-failure state is invalid")
    elif int(count):
        out("FAIL", "sync-failures", f"{count} consecutive failed runs; inspect private state locally")
    else:
        out("PASS", "sync-failures", "the latest completed sync cleared consecutive failures")
else:
    out("WARN", "sync-failures", "no completed scheduled sync is recorded in the selected state directory")
episode = state / "episode"
if episode.is_dir():
    out("FAIL", "sync-episode", "remediation is pending; this episode permits no new report, agent or notification until synchronization succeeds")
elif episode.exists():
    out("FAIL", "sync-episode", "the escalation episode marker is not a directory")
else:
    out("PASS", "sync-episode", "no escalation episode is pending")
try:
    bound = int(os.environ.get("DAYBOOK_SYNC_AGENT_TIMEOUT", "300"))
    if bound <= 0:
        raise ValueError
except ValueError:
    bound = None
    out("FAIL", "sync-agent-bound", "DAYBOOK_SYNC_AGENT_TIMEOUT must be a positive number of seconds")
else:
    out("INFO", "sync-agent-bound", f"agent wall bound is {bound} seconds, then TERM and a two-second KILL grace")
pidfile = state / "agent.pid"
agent_over_bound = False
if pidfile.exists():
    pid = pidfile.read_text().strip()
    try:
        if not pid.isdigit() or int(pid) <= 1:
            raise ProcessLookupError
        os.kill(int(pid), 0)
    except (ProcessLookupError, PermissionError):
        out("WARN", "sync-agent", "remediation supervisor pid is stale or cannot be inspected")
    else:
        try:
            started = int((state / "agent.started").read_text().strip())
            token = (state / "agent.episode").read_text().strip()
            if started <= 0 or started > time.time() or not token:
                raise ValueError
        except (OSError, ValueError):
            out("FAIL", "sync-agent", "live supervisor has missing or invalid lifetime/episode context")
        else:
            age = max(0, int(time.time() - started))
            if bound is not None and age >= bound:
                agent_over_bound = True
                out("FAIL", "sync-agent", f"supervisor is live at {age} seconds, past its {bound}-second bound; scheduled runs must not skip")
            elif bound is not None:
                out("WARN", "sync-agent", f"remediation supervisor is live within its bound ({age}/{bound} seconds); scheduled runs may skip")
if not shutil.which("launchctl"):
    out("WARN", "sync-schedule", "schedule is platform-owned and unverified here; no job is installed by this doctor")
    sys.exit(0)
try:
    with pathlib.Path(os.environ["DAYBOOK_SYNC_PLIST"]).open("rb") as stream:
        expected = plistlib.load(stream)
    if not isinstance(expected, dict):
        raise ValueError
except (OSError, ValueError, KeyError, plistlib.InvalidFileException):
    out("FAIL", "sync-schedule", "the repository's sync LaunchAgent definition cannot be read")
    sys.exit(0)
label = expected["Label"]
plist = pathlib.Path.home() / "Library/LaunchAgents" / f"{label}.plist"
try:
    with plist.open("rb") as stream:
        config = plistlib.load(stream)
    if not isinstance(config, dict):
        raise ValueError
except (OSError, ValueError, KeyError, plistlib.InvalidFileException):
    out("FAIL", "sync-schedule", "the configured sync LaunchAgent property list is absent or unreadable")
    sys.exit(0)
args = config.get("ProgramArguments", [])
interval = config.get("StartInterval")
wrapper = isinstance(args, list) and len(args) == 3 and args[:2] == ["/bin/zsh", "-lc"] and isinstance(args[2], str)
if (config != expected or not wrapper or type(interval) is not int or interval != 30
        or config.get("RunAtLoad") is not True or config.get("AbandonProcessGroup") is not True):
    out("FAIL", "sync-schedule", "installed LaunchAgent must match the shipped login-shell definition, run at load/every 30 seconds and preserve child processes")
else:
    out("PASS", "sync-schedule", "installed LaunchAgent matches the shipped login shell, load/30-second schedule and AbandonProcessGroup=true")
# Parse only; never execute the wrapper or read its environment from launchctl.
try:
    words = shlex.split(args[2]) if wrapper else []
except ValueError:
    words = []
if len(words) != 6 or words[0] != "exec" or words[3] != ">>" or words[5] != "2>&1":
    out("FAIL", "sync-script", "the schedule lacks the installed-copy exec, explicit checkout and log redirection")
    sys.exit(0)
script = pathlib.Path(os.path.expandvars(words[1]))
target = pathlib.Path(os.path.expandvars(words[2]))
installed = pathlib.Path.home() / ".local/libexec/daybook/sync"
if (script != installed or script.is_symlink() or not script.is_file()
        or not os.access(script, os.X_OK) or target.resolve() in script.resolve().parents):
    out("FAIL", "sync-script", "the scheduled executable must be a real executable copy at the installed path outside the synchronized checkout")
else:
    out("PASS", "sync-script", "the schedule runs the installed executable copy, not checkout source")
if target.resolve() != vault.resolve():
    out("WARN", "sync-checkout", "the explicit schedule argument targets another checkout; select it with DAYBOOK_VAULT")
else:
    out("PASS", "sync-checkout", "the schedule explicitly targets the selected checkout")
job = subprocess.run(["launchctl", "print", f"gui/{os.getuid()}/{label}"], capture_output=True, text=True, timeout=15)
if job.returncode:
    out("FAIL", "sync-loaded", "the configured sync LaunchAgent is not loaded")
else:
    out("PASS", "sync-loaded", "the configured sync LaunchAgent is loaded (not proof of a successful run)")
    code = re.search(r"last exit code = (\d+)", job.stdout)
    if code and int(code.group(1)):
        out("FAIL", "sync-last-exit", f"last recorded process exit is {code.group(1)}")
log = pathlib.Path(os.path.expandvars(words[4]))
try:
    age = max(0, int(time.time() - log.stat().st_mtime))
    with log.open("rb") as stream:
        stream.seek(max(0, log.stat().st_size - 8192))
        lines = [line for line in stream.read().decode(errors="replace").splitlines() if line.strip()]
    last = lines[-1] if lines else ""
except OSError:
    out("FAIL", "sync-last-run", "the configured sync log has no readable run receipt")
else:
    if age > 1800:
        out("FAIL", "sync-last-run", f"sync log is stale ({age} seconds old; limit 1800)")
    elif last.startswith("sync: synchronized"):
        out("PASS", "sync-last-run", f"latest log outcome is synchronized ({age} seconds ago)")
    elif last.startswith("sync: skipped"):
        level = "FAIL" if agent_over_bound else "WARN"
        out(level, "sync-last-run", f"latest log outcome is an agent-live skip ({age} seconds ago); not synchronization proof")
    elif last.startswith("sync: deferred"):
        out("WARN", "sync-last-run", f"latest log outcome defers recently saved edits ({age} seconds ago); not synchronization proof")
    elif last.startswith(("sync: failed", "sync: escalated", "sync: remediation pending")):
        out("FAIL", "sync-last-run", "latest log outcome is a failure or pending remediation; inspect its private report locally")
    else:
        out("FAIL", "sync-last-run", "latest log line is not a recognized sync outcome (contents withheld)")
PY
    [ "$?" = 0 ] || echo "FAIL sync-health: configured schedule health could not be read"
  )
fi

if want freshness; then
  # Retain master's retirement facts; the separate freshness follow-up is #214.
  out INFO remote-ingest-commit "daybook-ingest retired 2026-10-30 (daybook#202); last ingest commit f802f163 (2026-10-26); not checked"
  out INFO raw-session-note "per-host session index retired with daybook-ingest (daybook#202); not checked"
  rw=$("$PY" -I - "$MAIN/raw/readwise" <<'PY'
import sys, json, pathlib
best = ""
for p in pathlib.Path(sys.argv[1]).glob("*/*.md"):
    with open(p, encoding="utf-8", errors="replace") as f:
        for n, line in enumerate(f):
            if line.startswith("saved_at:"):
                best = max(best, json.loads(line.split(":", 1)[1].strip()) or "")
                break
            if n and line.strip() == "---":
                break
print(best)
PY
)
  out INFO readwise-newest "newest saved_at among raw/readwise notes: ${rw:-none} (new notes appear only when the owner saves something)"
fi

if want layers; then
  args=(--vault "$MAIN" --git)
  [ -f "$MAIN/docs/layer-classification-2026-10-20.tsv" ] &&
    args+=(--tsv "$MAIN/docs/layer-classification-2026-10-20.tsv" --approved 'derived:high,raw:*')
  for rec in "$(dirname "$MAIN")"/.daybook-layer-recovery-*; do [ -f "$rec/paths.tsv" ] && args+=(--recovery "$rec"); done
  res=$("$PY" -I "$SCRIPTS/check-invariants.py" "${args[@]}" 2>&1); rc=$?
  counts=$(grep -E '^(COUNT|WARN|FAIL) ' <<<"$res" | tr '\n' ';')
  [ "$rc" = 0 ] && out PASS layer-invariants "$counts" || out FAIL layer-invariants "${counts:-checker did not complete}"
  jp=$(git -C "$MAIN" status --porcelain -- journal | wc -l | tr -d ' ')
  out INFO journal-pending "$jp pending journal paths (Git metadata only; contents not read)"
fi

if want gitleaks; then
  if command -v gitleaks >/dev/null && gitleaks version 2>/dev/null | grep -qE '^8\.30(\.|$)'; then
    out PASS gitleaks-installed "gitleaks 8.30 is on PATH"
    mkdir -p "$HOME/.cache/tmp"
    tmp=$(mktemp -d "$HOME/.cache/tmp/verify-daybook-doctor-XXXXXX")
    "$PY" -I -c 'import secrets, string; print("ghp_" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(36)))' >"$tmp/probe.txt"
    printf '[extend]\nuseDefault = true\n' >"$tmp/rules.toml"
    gitleaks dir "$tmp/probe.txt" --config "$tmp/rules.toml" --no-banner --redact --exit-code 3 --log-level error >/dev/null 2>&1; rc=$?
    rm -rf "$tmp"
    [ "$rc" = 3 ] && out PASS gitleaks-detects "the real scanner rejects a generated token-shaped probe" || out FAIL gitleaks-detects "the scanner did not reject the generated probe (exit $rc)"
  else out FAIL gitleaks-installed "real gitleaks 8.30 is required on PATH"; fi
fi

if want checkout; then
  branch=$(git -C "$MAIN" symbolic-ref --short -q HEAD || echo detached)
  pending=$(git -C "$MAIN" status --porcelain=v1 -z | tr -cd '\000' | wc -c | tr -d ' ')
  out INFO checkout-dirty "checkout is on $branch with $pending pending paths"
  for marker in index.lock rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD sequencer; do
    path=$(git -C "$MAIN" rev-parse --git-path "$marker")
    [[ $path = /* ]] || path="$MAIN/$path"
    [ -e "$path" ] && out WARN checkout-state "$marker exists; inspect locally before synchronization"
  done
  head=$(git -C "$MAIN" rev-parse HEAD)
  remote=$(bounded git -C "$MAIN" ls-remote origin refs/heads/master 2>/dev/null | cut -f1)
  if [ -z "$remote" ]; then out WARN checkout-sync "origin master is unreachable; synchronization is unverified"
  elif [ "$remote" = "$head" ]; then out PASS checkout-sync "checkout HEAD equals origin master"
  elif git -C "$MAIN" cat-file -e "$remote^{commit}" 2>/dev/null && git -C "$MAIN" merge-base --is-ancestor "$remote" "$head"; then
    out WARN checkout-sync "local commits await the scheduled synchronizer"
  else out WARN checkout-sync "checkout is behind or diverged; the next sync must reconcile it"; fi
fi

[ "$FAILS" -eq 0 ] && echo "DOCTOR PASS" || echo "DOCTOR FAIL ($FAILS)"
[ "$FAILS" -eq 0 ]
