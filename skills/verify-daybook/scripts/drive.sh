#!/usr/bin/env bash
# Drive Daybook's daily flows and write evidence. Write flows run only on disposable fixtures;
# the real vault is only observed, read-only.
#
# Usage: drive.sh FEATURE [EVIDENCE_DIR|-] [RUN_DIR]
#   FEATURE: doctor sign-in path-guards capture-readwise capture-sessions sync
#            layer-marks synthesis site all
#   EVIDENCE_DIR: where <feature>.txt transcripts and summary.tsv go; default (or "-")
#            ~/.cache/tmp/verify-daybook-evidence/<UTC date>/. It must be outside every Git
#            checkout of Daybook and outside every run dir (else exit 2), so evidence never
#            enters Git and cleanup.sh keeps it
#   RUN_DIR: scratch root, default ~/.cache/tmp/verify-daybook-<UTC time>-<pid>; it must
#            resolve below ~/.cache/tmp/verify-daybook-<runid> (else exit 2, nothing written);
#            remove it with cleanup.sh when done
# Env: DAYBOOK_INGEST_SCRIPT=<path> drives another copy of daybook_ingest.py (for example
#      the origin/master copy, to show what a journey catches before a fix).
#      DAYBOOK_SYNC_SCRIPT=<executable> selects the real synchronizer under test.
#      DAYBOOK_SYNC_SLOW=1 adds 24 sync runs, saves every 2s, and 1s Git latency.
#      Default portable proof: drive.sh sync "$E" "$RUN"
#      Continued-save proof: DAYBOOK_SYNC_SLOW=1 drive.sh sync "$E" "$RUN"
# Each check prints PASS|FAIL <id>: <what it proves> and appends a row to summary.tsv.
# Exit 1 if any check failed.
set -uo pipefail
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE READWISE_ACCESS_TOKEN
export GIT_OPTIONAL_LOCKS=0 LC_ALL=C
SCRIPTS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
REPO=$(cd "${DAYBOOK_VAULT:?set DAYBOOK_VAULT to the selected checkout}" && pwd -P)
FEATURE=${1:?feature}
# shellcheck source=run-guard.sh
. "$SCRIPTS/run-guard.sh"
RUN=$(run_dir "${3:-$HOME/.cache/tmp/verify-daybook-$(date -u +%Y%m%dT%H%M%SZ)-$$}") ||
  { echo "drive: refusing: RUN_DIR '${3:-}' does not resolve under ~/.cache/tmp/verify-daybook-<runid>" >&2; exit 2; }
EVARG=${2:--}
[ "$EVARG" = - ] && EVARG="$HOME/.cache/tmp/verify-daybook-evidence/$(date -u +%F)"
EVID=$(canonical_path "$EVARG")
anc=$EVID; while [ ! -d "$anc" ]; do anc=$(dirname "$anc"); done
if run_dir "$EVID" >/dev/null || git -C "$anc" rev-parse --git-dir >/dev/null 2>&1; then
  echo "drive: refusing: EVIDENCE_DIR '$EVARG' is inside a Git checkout or a run dir; evidence stays outside Git" >&2; exit 2
fi
mkdir -p "$EVID"
INGEST=${DAYBOOK_INGEST_SCRIPT:-$REPO/scripts/ingest/daybook_ingest.py}
MAIN=$(canonical_path "${DAYBOOK_VAULT:-$REPO}")
HOST=$(uname -n)
TOKEN=fixture-readwise-token
PY=${PYTHON:-python3}
mkdir -p "$RUN"

# ---------------------------------------------------------------- transcript helpers
ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
red() { sed -e "s#$RUN#\$RUN#g" -e "s#$HOME#~#g"; }
say() { printf '\n## [%s] %s\n' "$(ts)" "$*"; }
run() { # run CMD...: show it, run it, keep OUT and RC
  printf '[%s] $ %s\n' "$(ts)" "$*" | red
  OUT=$("$@" 2>&1); RC=$?
  [ -n "$OUT" ] && printf '%s\n' "$OUT" | red | sed 's/^/    /'
  printf 'exit=%s\n' "$RC"
  return 0
}
show() { printf '  %s: %s\n' "$1" "$(shift; "$@" 2>&1 | tr '\n' ' ' | red)"; }
check() { # check ID DESCRIPTION CMD...: PASS when CMD succeeds
  local id=$1 desc=$2 r; shift 2
  if "$@" >/dev/null 2>&1; then r=PASS; else r=FAIL; echo FAIL >>"$RUN/.failed"; fi
  printf '%s %s: %s\n' "$r" "$id" "$desc"
  printf '%s\t%s\t%s\t%s\t%s\n' "$(ts)" "$CUR" "$id" "$r" "$desc" >>"$EVID/summary.tsv"
}
has() { grep -qE -- "$1" <<<"$2"; }        # has REGEX TEXT
hasnt() { ! grep -qE -- "$1" <<<"$2"; }
same() { [ "$1" = "$2" ]; }

# ---------------------------------------------------------------- fixture helpers
fixture() { # fixture NAME: build and load a fresh fixture
  local envf
  if ! envf=$("$SCRIPTS/make-fixture.sh" "$RUN" "$1" 2>&1); then
    printf '%s\n' "$envf" | red
    check "fixture-$1" "the fixture builds (use a fresh RUN_DIR)" false
    exit 1
  fi
  # shellcheck disable=SC1090
  source "$envf"
  printf 'fixture %s: vault, bare origin, second clone, fake HOME, private state\n' "$1" | red
}
g() { fx git -C "$VAULT" "$@"; }
head_sha() { g rev-parse HEAD; }
origin_sha() { fx git -C "$ORIGIN" rev-parse master; }
subject() { g log -1 --format=%s; }
author() { g log -1 --format=%an; }
commit_files() { g show --name-only --format= HEAD; }
own_only() { ! commit_files | grep -vE "^raw/readwise/|^raw/sessions/.*-$HOST\.md$" | grep -q .; }
manifest() { (cd "$VAULT" && find . -path ./.git -prune -o -type f -printf '%P\0' | sort -z | xargs -0 sha256sum); }
others_state() { # status, staged list and bytes of every path the ingester does not own
  g status --porcelain=v1 --untracked-files=all | grep -vE '^.. raw/(readwise|sessions)/'
  echo "-- staged"; g diff --cached --name-only
  echo "-- bytes"; (cd "$VAULT" && sha256sum notes/*.md inbox/*.md 2>/dev/null)
}
start_stub() {
  "$PY" -I "$SCRIPTS/readwise-stub.py" --port-file "$FIX/stub.port" --log "$FIX/stub.log" &
  echo $! >"$FIX/stub.pid"
  for _ in $(seq 100); do [ -s "$FIX/stub.port" ] && break; sleep 0.1; done
  STUBPORT=$(cat "$FIX/stub.port")
  echo "readwise stub on 127.0.0.1:$STUBPORT (pid file \$FIX/stub.pid)" | red
}
stop_stub() { [ -f "$FIX/stub.pid" ] && kill "$(cat "$FIX/stub.pid")" 2>/dev/null; rm -f "$FIX/stub.pid"; }
closed_port() { "$PY" -I -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()'; }
ingest() { # ingest MODE ARGS...: the real ingester on the fixture; MODE is a stub mode, down or none
  local url=""
  case $1 in none) ;; down) url="http://127.0.0.1:$(closed_port)/api/v3/list/" ;;
    *) url="http://127.0.0.1:$STUBPORT/$1/api/v3/list/" ;; esac
  shift
  run fx "$PY" -I "$SCRIPTS/run-ingest.py" --vault "$VAULT" --script "$INGEST" ${url:+--reader-url "$url"} -- "$@"
}
transcripts_exist() { # transcripts_exist NOTE_TEXT N: N Transcript: lines, each an existing file
  local n=0 p
  while IFS= read -r p; do
    n=$((n + 1)); [ -f "$FHOME/${p#\~/}" ] || return 1
  done < <(sed -n 's/^- Transcript: `\(.*\)`$/\1/p' <<<"$1")
  [ "$n" = "$2" ]
}
unchanged_since() { # unchanged_since MANIFEST PATH...: each PATH has the bytes it had in MANIFEST
  local m=$1 f; shift
  for f; do [ "$(grep -F "  $f" <<<"$m" | head -1)" = "$(cd "$VAULT" && sha256sum "$f")" ] || return 1; done
}
secret_like() { "$PY" -I -c 'import secrets,string; a=string.ascii_letters+string.digits; print("ghp_"+"".join(secrets.choice(a) for _ in range(36)))'; }
add_session() { # add_session HARNESS DAYS_AGO TAG [SECRET]: one synthetic transcript in the fake HOME
  "$PY" -I - "$FHOME" "$@" <<'EOF'
import datetime as dt, json, sys, uuid, pathlib
home, harness, days, tag = pathlib.Path(sys.argv[1]), sys.argv[2], int(sys.argv[3]), sys.argv[4]
secret = sys.argv[5] if len(sys.argv) > 5 else ""
now = dt.datetime.now().astimezone()
start = (now - dt.timedelta(days=days)).replace(hour=min(now.hour, 12), minute=0, second=0, microsecond=0) if days else now - dt.timedelta(minutes=20)
t = lambda m: (start + dt.timedelta(minutes=m)).isoformat()
sid = str(uuid.uuid4())
first = f"Fixture {tag} first message {secret}".strip()
if harness == "claude":
    p = home / ".claude/projects/-fixture-project" / f"{sid}.jsonl"
    rows = [{"type": "user", "timestamp": t(0), "cwd": str(home / "fixture-project"), "message": {"content": "<system-reminder>NOISE-SENTINEL</system-reminder>"}},
            {"type": "user", "timestamp": t(1), "entrypoint": "cli", "message": {"content": first}},
            {"type": "assistant", "timestamp": t(2), "message": {"content": "ASSISTANT-SENTINEL must not reach the vault"}},
            {"type": "user", "timestamp": t(3), "message": {"content": "SECOND-USER-SENTINEL must not reach the vault"}}]
elif harness == "codex":
    p = home / ".codex/sessions" / f"{start:%Y/%m/%d}" / f"rollout-{start:%Y-%m-%dT%H-%M-%S}-{sid}.jsonl"
    rows = [{"type": "session_meta", "timestamp": t(0), "payload": {"id": sid, "cwd": str(home / "fixture-project"), "originator": "codex_cli_fixture"}},
            {"type": "event_msg", "timestamp": t(1), "payload": {"type": "item_completed", "item": {"type": "UserMessage", "content": [{"type": "input_text", "text": first}]}}}]
else:
    p = home / ".omp/agent/sessions/fixture" / f"{start:%Y%m%dT%H%M%S}_{sid}.jsonl"
    rows = [{"type": "session", "timestamp": t(0), "cwd": str(home / "fixture-project")},
            {"type": "title", "timestamp": t(0), "title": f"Fixture {tag} title"},
            {"type": "message", "timestamp": t(1), "message": {"role": "user", "content": first}}]
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text("".join(json.dumps(r) + "\n" for r in rows))
print(p)
EOF
}

# ---------------------------------------------------------------- features
f_doctor() {
  say "doctor: read-only health of the real Daybook on $HOST"
  run "$SCRIPTS/doctor.sh"
  check doctor "doctor.sh reports no FAIL on the real machine" same "$RC" 0
}

f_sign_in() {
  say "owner access (stands in for sign-in): configured Git and capture credentials"
  run "$SCRIPTS/doctor.sh" --only owner,schedule,freshness
  local id
  while IFS= read -r line; do
    id=${line#* }; id=${id%%:*}
    case $line in PASS*) check "owner-$id" "${line#*: }" true ;; FAIL*) check "owner-$id" "${line#*: }" false ;; esac
  done < <(grep -E '^(PASS|FAIL) ' <<<"$OUT")
}

f_site() {
  say "site: the selected URL as a signed-out visitor and as the QA service token"
  run "$SCRIPTS/check-site.sh" "$REPO"
  local id
  while IFS= read -r line; do
    id=${line#* }; id=${id%%:*}
    case $line in
      PASS*) check "site-$id" "${line#*: }" true ;;
      FAIL*) check "site-$id" "${line#*: }" false ;;
      BLOCKED*) echo "BLOCKED site-$id: ${line#*: }" ;;
    esac
  done < <(grep -E '^(PASS|FAIL|BLOCKED) ' <<<"$OUT")
}

f_path_guards() {
  # The escape must start at the top-level run dir: RUN_DIR may be a subdirectory of it.
  local base root id out
  base=$(canonical_path "$HOME/.cache/tmp"); root=${RUN#"$base"/}; root="$base/${root%%/*}"; id=${root##*/}
  out="$base/not-a-run/$id"   # a harmless scratch dir outside the allowed prefix
  say "setup: decoy $(printf %s "$out" | red) with a marker file; \$RUN/escape is a symlink to it"
  mkdir -p "$out"; printf 'decoy marker\n' >"$out/marker"; ln -sfn "$out" "$RUN/escape"
  decoy() { (cd "$out" && find . -printf '%P %y %s\n' | sort && sha256sum marker); }
  local before; before=$(decoy)
  refused() { [ "$RC" = 2 ] && has refusing "$OUT"; }
  local esc="$root/../not-a-run/$id"

  say "G1 make-fixture.sh refuses an escape, a symlink out and a bad NAME"
  run "$SCRIPTS/make-fixture.sh" "$esc" g1
  check g1-dotdot "make-fixture refuses <run root>/../not-a-run/<id> (exit 2) and creates nothing there" eval 'refused && [ ! -e "$out/g1" ]'
  run "$SCRIPTS/make-fixture.sh" "$RUN/escape" g2
  check g1-symlink "make-fixture refuses a run dir that is a symlink out (exit 2)" eval 'refused && [ ! -e "$out/g2" ]'
  run "$SCRIPTS/make-fixture.sh" "$RUN" ../g3
  check g1-name "make-fixture refuses NAME ../g3 (exit 2)" eval 'refused && [ ! -e "$HOME/.cache/tmp/g3" ]'

  say "G2 cleanup.sh refuses the same escapes and deletes nothing"
  run "$SCRIPTS/cleanup.sh" "$esc"
  check g2-dotdot "cleanup refuses <run root>/../not-a-run/<id> (exit 2); the decoy is intact" eval 'refused && same "$(decoy)" "$before"'
  run "$SCRIPTS/cleanup.sh" "$RUN/escape"
  check g2-symlink "cleanup refuses a symlink out (exit 2); the decoy and the link are intact" eval 'refused && same "$(decoy)" "$before" && [ -L "$RUN/escape" ]'
  run "$SCRIPTS/cleanup.sh" "$HOME/.cache/tmp/verify-daybook-"
  check g2-empty-id "cleanup refuses a run dir with an empty run id (exit 2)" refused
  run "$SCRIPTS/cleanup.sh" "$HOME/.cache/tmp"
  check g2-parent "cleanup refuses ~/.cache/tmp itself (exit 2)" refused

  say "G3 drive.sh refuses an escaping RUN_DIR before it writes anything"
  run "$SCRIPTS/drive.sh" doctor "$out/evidence" "$esc"
  check g3-drive "drive refuses <run root>/../not-a-run/<id> (exit 2); no evidence dir is created" eval 'refused && [ ! -e "$out/evidence" ]'
  run "$SCRIPTS/drive.sh" doctor "$REPO/.verify-evidence-probe" "$RUN/g3"
  check g3-evidence-in-git "drive refuses an EVIDENCE_DIR inside the checkout (exit 2); evidence never enters Git" \
    eval 'refused && [ ! -e "$REPO/.verify-evidence-probe" ] && [ ! -e "$RUN/g3" ]'
  run "$SCRIPTS/drive.sh" doctor "$RUN/evidence" "$RUN/g3"
  check g3-evidence-in-run "drive refuses an EVIDENCE_DIR inside a run dir (exit 2), so cleanup.sh cannot delete evidence" \
    eval 'refused && [ ! -e "$RUN/evidence" ]'

  fixture guards
  printf 'Pending fixture edit.\n' >>"$VAULT/notes/his-note.md"
  local h; h=$(head_sha)
  local ri=("$PY" -I "$SCRIPTS/run-ingest.py" --script "$INGEST")
  say "G4 run-ingest.py refuses a second vault in any form, an outside vault and an outside HOME"
  run fx "${ri[@]}" --vault "$VAULT" -- --vault "$out" --only sessions
  check g4-repeat "refuses --vault repeated after -- (exit 2)" refused
  run fx "${ri[@]}" --vault "$VAULT" -- --v "$out" --only sessions
  check g4-abbrev "refuses the abbreviation --v <outside> after -- (exit 2)" refused
  run fx "${ri[@]}" --vault "$VAULT" -- "--vault=$out" --only sessions
  check g4-equals "refuses --vault=<outside> after -- (exit 2)" refused
  run fx "${ri[@]}" --vault "$VAULT" -- "--va=$out" --only sessions
  check g4-abbrev-equals "refuses --va=<outside> after -- (exit 2)" refused
  run fx "${ri[@]}" --vault "$VAULT" --vault "$out" -- --only sessions
  check g4-wrapper-repeat "refuses two wrapper --vault options (exit 2)" refused
  run fx "${ri[@]}" --v "$out" -- --only sessions
  check g4-wrapper-abbrev "refuses a wrapper --v abbreviation (exit 2)" refused
  run fx "${ri[@]}" "--vault=$out" -- --only sessions
  check g4-wrapper-equals "refuses a wrapper --vault=<path> (exit 2)" refused
  run fx "${ri[@]}" --vault "$out" -- --only sessions
  check g4-outside "refuses a vault outside the prefix (exit 2)" refused
  run fx "${ri[@]}" --vault "$esc" -- --only sessions
  check g4-dotdot "refuses a vault <run root>/../not-a-run/<id> (exit 2)" refused
  run fx "${ri[@]}" --vault "$RUN/escape" -- --only sessions
  check g4-symlink "refuses a vault that is a symlink out (exit 2)" refused
  run env HOME="$out" XDG_STATE_HOME="$FSTATE" "${ri[@]}" --vault "$VAULT" -- --only sessions
  check g4-home "refuses a HOME outside the prefix (exit 2)" refused
  check g4-untouched "after all refusals the decoy is unchanged and the fixture HEAD did not move" \
    eval 'same "$(decoy)" "$before" && same "$(head_sha)" "$h"'

  say "G5 the normal fixture run still works"
  add_session claude 0 guards >/dev/null
  run fx "${ri[@]}" --vault "$VAULT" -- --only sessions --days 2
  check g5-normal "normal session capture commits only its own paths and leaves the pending human edit alone" \
    eval '[ "$RC" = 0 ] && ! same "$(head_sha)" "$h" && same "$(author)" daybook-ingest && own_only && g status --porcelain | grep -q notes/his-note.md'
  rm -rf "$out"; rmdir "$HOME/.cache/tmp/not-a-run" 2>/dev/null
  check g5-decoy-removed "the decoy this journey created is removed" test ! -e "$out"
}

f_capture_readwise() {
  fixture readwise
  start_stub
  export READWISE_ACCESS_TOKEN=$TOKEN
  say "setup: other authors' pending work the ingester must not touch"
  printf 'His fixture edit.\n' >>"$VAULT/notes/his-note.md"
  printf 'Another agent staged this.\n' >>"$VAULT/notes/derived-note.md"; g add notes/derived-note.md
  mkdir -p "$VAULT/inbox"; printf -- '---\ntype: Note\n---\nUntracked capture by someone else.\n' >"$VAULT/inbox/new-capture.md"
  local before; before=$(others_state)
  local initial_origin; initial_origin=$(origin_sha)
  run g status --short

  say "R1 hourly run, two saved documents, one highlight, one unread feed item"
  ingest ok --days 2
  local rw; rw=$(cd "$VAULT" && ls raw/readwise/2026/ 2>/dev/null)
  show "raw/readwise/2026" echo "$rw"
  show "HEAD" g log -1 --format='%an | %s'
  show "commit files" commit_files
  check r1-exit "the run exits 0" same "$RC" 0
  check r1-log "the log reports 3 documents seen and 2 notes written" has 'readwise: 3 changed documents seen, 2 notes written' "$OUT"
  check r1-notes "two notes exist in raw/readwise/2026/, named by saved date, slug and reader id" \
    same "$(wc -l <<<"$rw")" 2
  check r1-feed-skipped "the unread feed item has no note" hasnt 'feed' "$rw"
  local a
  # shellcheck disable=SC2034  # read by the eval in r1-highlight
  a="$VAULT/raw/readwise/2026/$(grep article-one <<<"$rw")"
  check r1-layer "every new note carries layer: raw and source: readwise-reader" \
    eval '(for f in "$VAULT"/raw/readwise/2026/*.md; do grep -qx "layer: raw" "$f" && grep -qx "source: readwise-reader" "$f" || exit 1; done)'
  check r1-highlight "the highlight and his note are in the article's note" \
    eval 'grep -q "> Fixture highlighted sentence." "$a" && grep -q "## His note" "$a"'
  check r1-commit "HEAD is a daybook-ingest commit 'ingest: 2 Readwise notes, 0 session days'" \
    same "$(author) | $(subject)" "daybook-ingest | ingest: 2 Readwise notes, 0 session days"
  check r1-scope "the commit holds only files the ingester owns" own_only
  check r1-local "the capture commit remains local; origin has not moved" same "$(origin_sha)" "$initial_origin"
  check r1-others "other authors' edits, staged file and untracked file are unchanged" same "$(others_state)" "$before"
  check r1-paging "the ingester followed the second page" grep -q '"pageCursor"' "$FIX/stub.log"
  check r1-cursor "the Readwise cursor is saved in the private state dir, not the vault" \
    eval 'test -s "$FSTATE/daybook-ingest/readwise.json" && ! g ls-files | grep -q readwise.json'

  say "R2 next hour, nothing new: incremental fetch, no commit"
  local h; h=$(head_sha)
  ingest ok --days 2
  check r2-exit "the run exits 0" same "$RC" 0
  check r2-incremental "the request carried updatedAfter" eval 'tail -1 "$FIX/stub.log" | grep -q "\"updatedAfter\": \"20"'
  check r2-zero "the log reports 0 documents and 0 notes" has 'readwise: 0 changed documents seen, 0 notes written' "$OUT"
  check r2-no-commit "no commit was made" same "$(head_sha)" "$h"

  say "R3 empty day with a new agent session: 0 Readwise notes is normal"
  add_session claude 0 r3 >/dev/null
  ingest empty --days 2
  check r3-exit "the run exits 0" same "$RC" 0
  check r3-commit "the commit says 'ingest: 0 Readwise notes, 1 session days'" same "$(subject)" "ingest: 0 Readwise notes, 1 session days"
  check r3-local "the session capture is local and origin is unchanged" same "$(origin_sha)" "$initial_origin"

  say "R4 token missing (pass entry gone or not injected)"
  unset READWISE_ACCESS_TOKEN
  add_session codex 0 r4 >/dev/null
  ingest ok --days 2
  show "HEAD" g log -1 --format='%an | %s'
  check r4-exit "the run reports the missing credential with a non-zero exit" test "$RC" -ne 0
  check r4-log "the log names the missing token as a failure" has 'readwise failed: .*READWISE_ACCESS_TOKEN' "$OUT"
  check r4-commit "the session commit does not claim '0 Readwise notes'" same "$(subject)" "ingest: 1 session days"
  check r4-local "the session note is committed locally without publishing" \
    eval '! same "$(head_sha)" "$initial_origin" && same "$(origin_sha)" "$initial_origin"'

  say "R5 invalid or expired token: Readwise answers 401"
  export READWISE_ACCESS_TOKEN=expired-fixture-token
  local st; st=$(sha256sum "$FSTATE/daybook-ingest/readwise.json")
  add_session omp 0 r5 >/dev/null
  ingest ok --days 2
  check r5-exit "the run exits non-zero" test "$RC" -ne 0
  check r5-log "the log shows HTTP 401" has 'readwise failed: HTTPError: HTTP Error 401' "$OUT"
  check r5-cursor "the cursor did not advance" same "$(sha256sum "$FSTATE/daybook-ingest/readwise.json")" "$st"
  check r5-commit "the commit is 'ingest: 1 session days'" same "$(subject)" "ingest: 1 session days"
  export READWISE_ACCESS_TOKEN=$TOKEN

  say "R6 Readwise returns HTTP 500 once (Retry-After: 0), then recovers"
  ingest error500 --days 2
  check r6-exit "the run exits 0 after one retry" same "$RC" 0
  check r6-retried "the stub saw two error500 requests" test "$(grep -c '"mode": "error500"' "$FIX/stub.log")" -ge 2
  check r6-log "the log reports a normal result" has 'readwise: [0-9]+ changed documents seen' "$OUT"

  say "R7 slow API (5 s per page), weekly full refetch: unchanged notes are not rewritten"
  rm -f "$FSTATE/daybook-ingest/readwise.json"
  h=$(head_sha); local t0=$SECONDS
  ingest slow --days 2
  check r7-exit "the run exits 0" same "$RC" 0
  check r7-slow "the run waited for the slow pages (>= 10 s)" test $((SECONDS - t0)) -ge 10
  check r7-idempotent "3 documents seen, 0 notes written, no commit" \
    eval 'has "readwise: 3 changed documents seen, 0 notes written" "$OUT" && same "$(head_sha)" "$h"'

  say "R8 Readwise down (connection refused): 6 attempts, about 150 s, then the sessions still commit"
  add_session claude 0 r8 >/dev/null
  t0=$SECONDS
  ingest down --days 2
  show "elapsed seconds" echo $((SECONDS - t0))
  check r8-exit "the run exits non-zero" test "$RC" -ne 0
  check r8-log "the log shows the connection failure" has 'readwise failed: URLError' "$OUT"
  check r8-commit "the session commit is local and origin is unchanged" \
    eval 'same "$(subject)" "ingest: 1 session days" && same "$(origin_sha)" "$initial_origin"'

  say "R9 concurrent remote write: capture stays local and leaves both histories alone"
  printf -- '---\ntype: Note\nlayer: derived\n---\nPushed from another machine.\n' >"$OTHER/remote-edit.md"
  fx git -C "$OTHER" add remote-edit.md
  fx git -C "$OTHER" commit -q -m "fixture: another machine"; fx git -C "$OTHER" push -q
  local remote; remote=$(fx git -C "$OTHER" rev-parse HEAD)
  add_session codex 0 r9 >/dev/null
  h=$(head_sha)
  ingest ok --days 2
  check r9-exit "the capture exits 0 without trying to synchronize" same "$RC" 0
  check r9-local "the old local history and new capture commit are retained" \
    eval 'g merge-base --is-ancestor "$h" HEAD && ! same "$(head_sha)" "$h"'
  check r9-origin "origin still contains only the other writer's publication" same "$(origin_sha)" "$remote"
  check r9-independent "the remote edit is not materialized and no Git operation remains in progress" \
    eval '[ ! -e "$VAULT/remote-edit.md" ] && [ ! -e "$VAULT/.git/MERGE_HEAD" ] && [ ! -e "$VAULT/.git/rebase-merge" ]'
  check r9-others "other authors' work is still unchanged" same "$(others_state)" "$before"
  stop_stub
}

f_capture_sessions() {
  fixture sessions
  start_stub
  export READWISE_ACCESS_TOKEN=$TOKEN
  local initial_origin; initial_origin=$(origin_sha)
  local secret; secret=$(secret_like)
  say "setup: today's sessions in three harnesses, yesterday's session, a 20-day-old one, another host's note"
  add_session claude 0 today-claude "$secret" >/dev/null
  add_session codex 0 today-codex >/dev/null
  add_session omp 0 today-omp >/dev/null
  add_session claude 1 yesterday >/dev/null
  add_session claude 20 old >/dev/null
  printf 'edit by the other host\n' >>"$VAULT/raw/sessions/2026/10/2026-10-20-otherhost.md"
  local today yday; today=$(date +%F); yday=$(date -d yesterday +%F)
  local tn="raw/sessions/${today:0:4}/${today:5:2}/$today-$HOST.md" yn="raw/sessions/${yday:0:4}/${yday:5:2}/$yday-$HOST.md"

  say "S1 hourly run"
  ingest empty --days 2
  local rc=$RC log=$OUT
  run sed -n '1,12p' "$VAULT/$tn"
  local note; note=$(cat "$VAULT/$tn" 2>/dev/null)
  check s1-exit "the run exits 0" same "$rc" 0
  check s1-log "the log reports 2 day notes written" has 'sessions: [0-9]+ sessions scanned, 2 day notes written' "$log"
  check s1-today "today's index exists at $tn with layer: raw and type: SessionIndex" \
    eval 'has "^layer: raw$" "$note" && has "^type: SessionIndex$" "$note"'
  check s1-counts "it counts one session per harness" has '^Counts: claude-code 1, codex 1, omp 1$' "$note"
  check s1-paths "three Transcript: lines, each naming a file that exists in harness storage" transcripts_exist "$note" 3
  check s1-no-transcript "no assistant text, later user text or system noise is copied" \
    hasnt 'ASSISTANT-SENTINEL|SECOND-USER-SENTINEL|NOISE-SENTINEL' "$note"
  check s1-redacted "the token-shaped string in a first message is redacted" \
    eval '! grep -qF "$secret" <<<"$note" && grep -qF "[redacted]" <<<"$note"'
  check s1-yesterday "yesterday's index exists" test -f "$VAULT/$yn"
  check s1-horizon "no index is written for the 20-day-old session" \
    eval '! ls "$VAULT"/raw/sessions/*/*/*-"$HOST".md | grep -q "$(date -d "20 days ago" +%F)"'
  check s1-commit "HEAD is 'ingest: 0 Readwise notes, 2 session days' by daybook-ingest" \
    same "$(author) | $(subject)" "daybook-ingest | ingest: 0 Readwise notes, 2 session days"
  check s1-own-host "the commit holds only this host's notes; the other host's edit stays pending" \
    eval '! commit_files | grep -qv -- "-$HOST.md" && g status --porcelain | grep -q otherhost'
  check s1-local "the session commit is local; origin is unchanged" same "$(origin_sha)" "$initial_origin"

  say "S2 next hour, no new sessions"
  local h; h=$(head_sha)
  ingest empty --days 2
  check s2-no-rewrite "0 day notes written and no commit" eval 'has "0 day notes written" "$OUT" && same "$(head_sha)" "$h"'

  say "S3 a second session for yesterday: that day is rebuilt from all its transcripts"
  add_session codex 1 yesterday-2 >/dev/null
  ingest empty --days 2
  run grep '^Counts:' "$VAULT/$yn"
  check s3-rebuilt "yesterday's index now counts both sessions" has 'claude-code 1, codex 1' "$OUT"
  check s3-scope "the commit changed only yesterday's index" same "$(commit_files)" "$yn"
  stop_stub

  say "S4 the real vault (read-only): the newest session index for $HOST"
  local newest; newest=$(find "$MAIN/raw/sessions" -name "*-$HOST.md" -printf '%T@ %P\n' | sort -n | tail -1)
  show "newest" echo "raw/sessions/${newest#* } modified $(( ($(date +%s) - ${newest%%.*}) / 60 )) min ago"
  run sed -n '2,8p' "$MAIN/raw/sessions/${newest#* }"
  check s4-real-fresh "the real index was rewritten within the last 2 hours" test $(( $(date +%s) - ${newest%%.*} )) -le 7200
  check s4-real-raw "the real index carries layer: raw" has '^layer: raw$' "$OUT"
}

f_sync() {
  say "sync: real Git/gitleaks, merge isolation, editor saves, scanner bypasses and bounded agent episodes"
  local args=(--script "${DAYBOOK_SYNC_SCRIPT:-$HOME/.local/libexec/daybook/sync}" --run-dir "$RUN/sync")
  [ "${DAYBOOK_SYNC_SLOW:-0}" = 1 ] && args+=(--slow)
  run "$PY" -I "$SCRIPTS/check-sync.py" "${args[@]}"
  check sync-behavior "real sync publication, byte preservation, seven scanner bypass rejections, installed copy and bounded remediation pass" same "$RC" 0
}


f_layer_marks() {
  fixture layers
  say "L1 the migration's own behaviour tests"
  run env TMPDIR="$FIX/tmp" "$PY" -I -B "$REPO/scripts/ingest/test_layer_marks.py"
  check l1-tests "test_layer_marks.py passes" same "$RC" 0

  say "L2 apply approved marks on a fixture: derived/high and raw are approved; medium is excluded"
  mkdir -p "$VAULT/Clippings"
  printf -- '---\ntype: Note\ncreated: 2026-01-01\n---\nAgent body A\r\n' >"$VAULT/notes/agent-a.md"
  printf 'Clipped outside text, no frontmatter\n' >"$VAULT/Clippings/clip-b.md"
  printf -- '---\ntype: Note\ncreated: 2026-01-05\n---\nMedium-confidence note.\n' >"$VAULT/notes/medium-d.md"
  printf -- '---\nlayer: derived\ntype: Note\n---\nAlready marked.\n' >"$VAULT/notes/already-e.md"
  local tsv="$FIX/proposal.tsv" ex="$FIX/exclude.txt"
  { printf 'path\tproposed_layer\tconfidence\tsha256\n'
    for r in notes/agent-a.md:derived:high Clippings/clip-b.md:raw:high notes/his-note.md:his:high \
             notes/medium-d.md:derived:medium notes/already-e.md:derived:high; do
      IFS=: read -r p l c <<<"$r"; printf '%s\t%s\t%s\t%s\n' "$p" "$l" "$c" "$(sha256sum "$VAULT/$p" | cut -d' ' -f1)"
    done; } >"$tsv"
  echo notes/medium-d.md >"$ex"
  local before; before=$(manifest)
  local marks=("$PY" -I "$REPO/scripts/ingest/apply_layer_marks.py")
  run "${marks[@]}" "$tsv" --vault "$VAULT" --exclude "$ex"
  check l2-dry-run "the default run previews 'would mark 2, already marked 1' and changes nothing" \
    eval 'has "would mark 2, already marked 1" "$OUT" && same "$(manifest)" "$before"'
  run "${marks[@]}" "$tsv" --vault "$VAULT" --exclude "$ex" --apply
  check l2-apply "--apply marks 2" has 'marked 2, already marked 1' "$OUT"
  check l2-bytes "only a layer line was added: the rest of agent-a.md is byte-identical (CRLF kept)" \
    same "$("$PY" -I -c 'import sys; a=open(sys.argv[1],"rb").read(); print(a.replace(b"layer: derived\n",b"",1)==b"---\ntype: Note\ncreated: 2026-01-01\n---\nAgent body A\r\n")' "$VAULT/notes/agent-a.md")" True
  check l2-raw "clip-b.md gained a minimal frontmatter with layer: raw and kept its body" \
    eval 'head -3 "$VAULT/Clippings/clip-b.md" | grep -qx "layer: raw" && tail -1 "$VAULT/Clippings/clip-b.md" | grep -qx "Clipped outside text, no frontmatter"'
  check l2-protected "his note, the excluded medium note and the already-marked note are byte-identical" \
    unchanged_since "$before" notes/his-note.md notes/medium-d.md notes/already-e.md
  local recdir; recdir=$(ls -d "$FIX"/.daybook-layer-recovery-* 2>/dev/null | head -1)
  check l2-recovery "the two displaced originals are kept beside the vault" eval 'same "$(wc -l <"$recdir/paths.tsv")" 2'
  run "${marks[@]}" "$tsv" --vault "$VAULT" --exclude "$ex" --apply
  check l2-idempotent "a second --apply marks 0" has 'marked 0, already marked 3' "$OUT"
  printf 'path\tproposed_layer\tconfidence\tsha256\njournal/2026/10/19.md\tderived\thigh\t%s\n' \
    "$(sha256sum "$VAULT/journal/2026/10/19.md" | cut -d' ' -f1)" >"$FIX/journal.tsv"
  before=$(manifest)
  run "${marks[@]}" "$FIX/journal.tsv" --vault "$VAULT" --apply
  check l2-journal "a journal/ row is refused and nothing is written" \
    eval '[ "$RC" != 0 ] && has "protected path" "$OUT" && same "$(manifest)" "$before"'

  say "L3 the invariants checker on the fixture, then one negative control per invariant"
  local inv=("$PY" -I "$SCRIPTS/check-invariants.py" --vault "$VAULT" --tsv "$tsv" --approved 'derived:high,raw:*'
             --exclude "$ex" --recovery "$recdir" --read-journal-frontmatter --paths)
  mkdir -p "$VAULT/raw/readwise/2026"
  printf -- '---\ntype: Source\nlayer: raw\nsource: readwise-reader\n---\nfixture\n' >"$VAULT/raw/readwise/2026/ok.md"
  run "${inv[@]}"
  check l3-pass "the fixture satisfies every invariant" same "$RC" 0
  neg() { # neg ID REASON FILE NEWCONTENT
    local f="$VAULT/$3" saved; saved=$(cat "$f" 2>/dev/null; echo x)
    printf '%s' "$4" >"$f"
    run "${inv[@]}"
    check "l3-$1" "the checker fails with $2 when $5" has "^FAIL $2: 1" "$OUT"
    if [ "$saved" = x ]; then rm -f "$f"; else printf '%s' "${saved%x}" >"$f"; fi
  }
  neg journal journal-marked journal/2026/10/19.md $'---\nlayer: derived\n---\nx\n' "a journal note carries a mark"
  neg raw raw-unmarked raw/readwise/2026/ok.md $'---\ntype: Source\n---\nx\n' "a raw capture lacks layer: raw"
  neg invalid invalid-layer notes/bad.md $'---\nlayer: human\n---\nx\n' "a mark is neither raw nor derived"
  neg his protected-marked notes/his-note.md $'---\ntype: Note\nlayer: derived\n---\nx\n' "his note was marked"
  neg approved approved-unmarked notes/agent-a.md $'---\ntype: Note\n---\nx\n' "an approved note lost its mark"
  run "${inv[@]}"
  check l3-restored "after the controls the fixture passes again" same "$RC" 0

  say "L4 the real vault (read-only): marks as they exist, recovery record, ingester commit scope"
  local rec=()
  for d in "$(dirname "$MAIN")"/.daybook-layer-recovery-*; do [ -f "$d/paths.tsv" ] && rec+=(--recovery "$d"); done
  run "$PY" -I "$SCRIPTS/check-invariants.py" --vault "$MAIN" --tsv "$MAIN/docs/layer-classification-2026-10-20.tsv" \
    --approved 'derived:high,raw:*' "${rec[@]}" --git
  check l4-real "the real vault passes: approved notes marked, protected notes unmarked, raw/ marked raw, no ingest commit outside raw/" same "$RC" 0
  check l4-real-recovery "the marks run's recovery record names no journal/ path" \
    eval 'has "^COUNT recovery-rows: [1-9]" "$OUT" && hasnt "^FAIL recovery-journal" "$OUT"'
}

f_synthesis() {
  fixture synthesis
  say "setup: a raw capture committed; base = HEAD"
  mkdir -p "$VAULT/raw/readwise/2026" "$VAULT/notes/syntheses"
  local src=raw/readwise/2026/2026-10-20-fixture-article-one--aaaaaaaaa1
  printf -- '---\ntype: Source\nlayer: raw\nsource: readwise-reader\ncreated: "2026-10-20"\n---\n\n# Fixture article one\n\n> Fixture highlighted sentence.\n' >"$VAULT/$src.md"
  g add -A; g commit -q -m "fixture: capture"
  local base; base=$(head_sha)
  local syn=notes/syntheses/fixture-reading-synthesis.md
  local good
  good=$(printf -- '---\ntype: Synthesis\nlayer: derived\ncreated: 2026-10-20\ndescription: Fixture synthesis of one capture.\nsources: [%s.md]\ntags: [synthesis]\n---\n\n# Fixture reading synthesis\n\nThe capture makes one claim ([[%s]]). It connects to [[notes/his-note|his note]] without editing it.\n\n## Sources\n\n- `%s.md`\n- [[notes/derived-note]]\n' "$src" "$src" "$src")
  printf '%s\n' "$good" >"$VAULT/$syn"
  local chk=("$PY" -I "$SCRIPTS/check-synthesis.py" --vault "$VAULT" --base "$base")

  say "Y1 the agent's synthesis meets the contract"
  run fx "${chk[@]}" "$syn"
  check y1-pass "a derived, cited synthesis with no other edits passes" same "$RC" 0

  say "Y2 negative controls: each breach is caught"
  variant() { # variant ID REASON DESCRIPTION CONTENT [PATH]
    local p=${5:-notes/syntheses/variant.md}
    mkdir -p "$(dirname "$VAULT/$p")"; printf '%s\n' "$4" >"$VAULT/$p"
    run fx "${chk[@]}" "$p"
    check "y2-$1" "fails with $2 when $3" has "$2" "$OUT"
    rm -f "$VAULT/$p"
  }
  variant no-mark not-derived "the layer mark is missing" "${good/layer: derived
/}"
  variant broken unresolved-citation "a citation does not resolve" "${good/notes\/derived-note/notes/no-such-note}"
  variant uncited no-citations "nothing is cited" $'---\ntype: Synthesis\nlayer: derived\ncreated: 2026-10-20\n---\nUncited claim.\n'
  variant journal-cite cites-journal "it cites a journal entry" "${good/notes\/derived-note/journal/2026/10/19}"
  variant in-journal in-journal "it is written under journal/" "$good" journal/2026/10/21.md
  variant secret secret "it contains a token-shaped string" "$good
Pasted: $(secret_like)"
  printf '\nSee [[notes/derived-note]].\n' >>"$VAULT/notes/his-note.md"
  run fx "${chk[@]}" "$syn"
  check y2-his-edit "linking an unmarked human note is permitted" same "$RC" 0
  g checkout -q -- notes/his-note.md
  printf '\nRelated: [[notes/derived-note]].\n' >>"$VAULT/$src.md"
  run fx "${chk[@]}" "$syn"
  check y2-raw-edit "linking a raw capture without changing source content is permitted" same "$RC" 0
  g checkout -q -- "$src.md"
  g add "$syn"; g commit -q -m "agent: synthesis"
  run fx "${chk[@]}" "$syn"
  check y2-committed "an agent may commit its selected synthesis" same "$RC" 0

  say "Y3 moving sources preserves authorship before and after commit"
  local moved_human=notes/reorganized-human.md moved_raw=notes/reorganized-source.md moved_good
  g mv notes/his-note.md "$moved_human"
  g mv "$src.md" "$moved_raw"
  moved_good=${good//notes\/his-note/${moved_human%.md}}
  moved_good=${moved_good//"$src"/${moved_raw%.md}}
  printf '%s\n' "$moved_good" >"$VAULT/$syn"
  run fx "${chk[@]}" "$syn"
  check y3-move-uncommitted "human and raw moves with repaired citations pass before commit" same "$RC" 0
  g add "$syn"; g commit -q -m "agent: organize sources"
  run fx "${chk[@]}" "$syn"
  check y3-move-committed "human and raw moves with repaired citations pass after commit" same "$RC" 0
  check y3-human-bytes "the moved human source has identical bytes and remains unmarked" \
    cmp -s <(g show "$base:notes/his-note.md") "$VAULT/$moved_human"
  check y3-raw-bytes "the moved raw source has identical bytes and retains raw provenance" \
    cmp -s <(g show "$base:$src.md") "$VAULT/$moved_raw"
  g mv "$moved_human" notes/his-note.md
  g mv "$moved_raw" "$src.md"
  printf '%s\n' "$good" >"$VAULT/$syn"
  g add "$syn"
  g reset -q --soft "$base"
  printf '\nChanged.\n' >>"$VAULT/journal/2026/10/19.md"
  run fx "${chk[@]}" "$syn"
  check y2-journal-edit "a journal edit fails after the authority change" has 'journal-changed' "$OUT"
  g checkout -q -- journal/2026/10/19.md
  ln -s ../journal/2026/10/19.md "$VAULT/notes/journal-alias.md"
  run fx "${chk[@]}" notes/journal-alias.md
  check y2-journal-alias "a symlink cannot bypass the journal boundary" has 'protected-path' "$OUT"
  rm "$VAULT/notes/journal-alias.md"
  run fx "${chk[@]}" "$syn"
  check y3-restored "after the controls the synthesis passes again" same "$RC" 0

  say "Y4 baseline on the real vault (read-only, counts only): existing reading syntheses"
  # The glob expands inside the child shell, so note names (his reading topics) stay out of the transcript.
  run bash -c 'cd "$1" && exec "$2" -I "$3" --vault . --summary resources/reading/syntheses/*.md' _ \
    "$MAIN" "$PY" "$SCRIPTS/check-synthesis.py"
  echo "INFO y4-baseline: older syntheses predate this contract; the counts are a baseline, not a pass/fail gate"
}

case $FEATURE in
  all) LIST="doctor sign-in path-guards capture-readwise capture-sessions sync layer-marks synthesis site" ;;
  doctor|sign-in|path-guards|capture-readwise|capture-sessions|sync|layer-marks|synthesis|site) LIST=$FEATURE ;;
  *) echo "unknown feature: $FEATURE" >&2; exit 2 ;;
esac
[ -f "$EVID/summary.tsv" ] || printf 'time\tfeature\tcheck\tresult\tproves\n' >"$EVID/summary.tsv"
for CUR in $LIST; do
  {
    dirty=$(git -C "$REPO" status --porcelain -- scripts .agents | grep -q . && echo ' plus uncommitted changes')
    entry=$INGEST; [ "$CUR" = sync ] && entry="${DAYBOOK_SYNC_SCRIPT:-$HOME/.local/libexec/daybook/sync}"
    printf '# verify-daybook: %s\n\nrun %s, host %s, checkout %s at %s%s, entrypoint %s (blob %s)\n' "$CUR" "$(basename "$RUN")" \
      "$HOST" "$(git -C "$REPO" rev-parse --abbrev-ref HEAD)" "$(git -C "$REPO" rev-parse --short HEAD)" "$dirty" "$entry" \
      "$(git hash-object "$entry" | cut -c1-12)" | red
    "f_${CUR//-/_}"
    printf '\n[%s] done: %s\n' "$(ts)" "$CUR"
  } 2>&1 | tee "$EVID/$CUR.txt"
done
if [ -s "$RUN/.failed" ]; then rm -f "$RUN/.failed"; exit 1; fi
