#!/usr/bin/env bash
# Remove what one verification run created, keep its evidence, and prove the evidence survived.
#
# Usage: cleanup.sh RUN_DIR [EVIDENCE_DIR]
#   Stops each Readwise stub the run started (by its pid file, and only when that pid is still
#   readwise-stub.py), then deletes RUN_DIR. RUN_DIR must resolve (symlinks and .. followed)
#   to ~/.cache/tmp/verify-daybook-<runid>
#   or below, or cleanup refuses with exit 2 and deletes nothing. It never kills by process name.
#   With EVIDENCE_DIR it then lists the evidence files and exits 1 if summary.tsv is gone.
set -uo pipefail
# shellcheck source=run-guard.sh
. "$(dirname "${BASH_SOURCE[0]}")/run-guard.sh"
EVID=${2:-}
RUN=$(run_dir "${1:?RUN_DIR}") || { echo "cleanup: refusing: '$1' does not resolve under ~/.cache/tmp/verify-daybook-<runid>" >&2; exit 2; }
for pf in "$RUN"/*/stub.pid; do
  [ -f "$pf" ] || continue
  pid=$(cat "$pf")
  if ps -p "$pid" -o command= 2>/dev/null | grep -qF "$RUN/" && ps -p "$pid" -o command= 2>/dev/null | grep -q 'readwise-stub.py'; then
    kill "$pid" && echo "stopped readwise stub pid $pid"
  fi
done
rm -rf "$RUN"
[ -e "$RUN" ] && { echo "cleanup: $RUN still exists" >&2; exit 1; }
echo "removed ${RUN/#"$HOME"/\~}"
if [ -n "$EVID" ]; then
  ls -l "$EVID"
  [ -s "$EVID/summary.tsv" ] || { echo "cleanup: evidence summary is missing in $EVID" >&2; exit 1; }
  echo "evidence kept: $(ls "$EVID" | wc -l) files in ${EVID/#"$HOME"/\~}"
fi
