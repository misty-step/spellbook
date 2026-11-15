# shellcheck shell=bash
# Sourced by make-fixture.sh, cleanup.sh and drive.sh. Not executable on its own.
# run_dir PATH: print PATH fully resolved (symlinks and `..` followed), and
# succeed only when the result is ~/.cache/tmp/verify-daybook-<runid> or a path below it.
# ~/.cache/tmp/verify-daybook-evidence/ is the evidence root, never a run dir, so cleanup.sh
# can never delete evidence.
# Every write and delete in those helpers uses the printed path, never the raw argument.
canonical_path() {
  "${PYTHON:-python3}" -I -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$1"
}

run_dir() {
  local base r rel top
  base=$(canonical_path "$HOME/.cache/tmp") || return 1
  r=$(canonical_path "$1") || return 1
  rel=${r#"$base"/}
  [ "$rel" != "$r" ] || return 1          # not below ~/.cache/tmp
  top=${rel%%/*}
  case $top in verify-daybook-evidence) return 1 ;; verify-daybook-?*) printf '%s\n' "$r" ;; *) return 1 ;; esac
}
