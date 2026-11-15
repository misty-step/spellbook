#!/usr/bin/env bash
# Build one disposable Daybook fixture: a vault repo on master, a local bare origin, a second
# clone ("another machine"), a fake HOME and a private state directory.
#
# Usage: make-fixture.sh RUN_DIR NAME
#   RUN_DIR must resolve (symlinks and .. followed) to ~/.cache/tmp/verify-daybook-<runid> or
#   below; NAME is one plain path component. A refusal exits 2 and creates nothing.
#   Prints the path of an env file; `source` it to get RUN, FIX, VAULT, ORIGIN, OTHER, FHOME,
#   FSTATE and fx().
#   fx CMD... runs CMD with HOME, XDG_STATE_HOME and XDG_CONFIG_HOME pointed at the fixture,
#   so the ingester's state, lock, gitleaks config and session sources are the fixture's, and
#   git uses the fixture's identity, not the owner's global config.
# The seed is synthetic: no real note, journal or capture is copied.
set -euo pipefail
# shellcheck source=run-guard.sh
. "$(dirname "${BASH_SOURCE[0]}")/run-guard.sh"
NAME=${2:?NAME}
RUN=$(run_dir "${1:?RUN_DIR}") || { echo "make-fixture: refusing: '$1' does not resolve under ~/.cache/tmp/verify-daybook-<runid>" >&2; exit 2; }
case $NAME in ""|.|..|*/*) echo "make-fixture: refusing: NAME '$NAME' must be one plain path component" >&2; exit 2 ;; esac
FIX="$RUN/$NAME"
[ -e "$FIX" ] && { echo "make-fixture: $FIX already exists" >&2; exit 2; }
mkdir -p "$FIX/home/.config/daybook-ingest" "$FIX/state" "$FIX/tmp"
FHOME="$FIX/home"
cat >"$FHOME/.gitconfig" <<'EOF'
[user]
	name = Fixture Human
	email = human@fixture.invalid
[init]
	defaultBranch = master
[advice]
	detachedHead = false
EOF
# Reuse the capture scanner's configured rules when they exist.
if [ -f "$HOME/.config/daybook-ingest/gitleaks.toml" ]; then
  cp "$HOME/.config/daybook-ingest/gitleaks.toml" "$FHOME/.config/daybook-ingest/gitleaks.toml"
fi

fx() { env HOME="$FHOME" XDG_STATE_HOME="$FIX/state" XDG_CONFIG_HOME="$FHOME/.config" TMPDIR="$FIX/tmp" "$@"; }

fx git init -q --bare "$FIX/origin.git"
fx git init -q "$FIX/vault"
V="$FIX/vault"
mkdir -p "$V/journal/2026/10" "$V/notes" "$V/raw/sessions/2026/10" "$V/docs"
printf -- '---\ntype: Journal\ncreated: 2026-10-19\n---\n\nFixture journal entry (synthetic).\n' >"$V/journal/2026/10/19.md"
printf -- '---\ntype: Note\ncreated: 2026-01-01\n---\n\nFixture human note: no layer mark, so it is his.\n' >"$V/notes/his-note.md"
printf -- '---\ntype: Note\nlayer: derived\ncreated: 2026-01-02\n---\n\nFixture derived note.\n' >"$V/notes/derived-note.md"
printf -- '---\ntype: Note\nlayer: derived\ncreated: 2026-01-03\n---\n\nFixture note that will be renamed.\n' >"$V/notes/old-name.md"
printf -- '---\ntype: Note\nlayer: derived\ncreated: 2026-01-04\n---\n\nFixture note that will be deleted.\n' >"$V/notes/to-delete.md"
printf -- '---\ntype: Map\nlayer: derived\ncreated: 2026-10-20\n---\n\n# Raw layer (fixture)\n' >"$V/raw/README.md"
printf -- '---\ntype: SessionIndex\nlayer: raw\nsource: agent-sessions\nhost: otherhost\ndate: 2026-10-20\ncreated: 2026-10-20\n---\n\n# Another host (fixture)\n' >"$V/raw/sessions/2026/10/2026-10-20-otherhost.md"
fx git -C "$V" add -A
fx git -C "$V" commit -q -m "fixture: seed"
fx git -C "$V" remote add origin "$FIX/origin.git"
fx git -C "$V" push -q -u origin master
fx git clone -q "$FIX/origin.git" "$FIX/other"

cat >"$FIX/env" <<EOF
RUN='$RUN'
FIX='$FIX'
VAULT='$V'
ORIGIN='$FIX/origin.git'
OTHER='$FIX/other'
FHOME='$FHOME'
FSTATE='$FIX/state'
fx() { env HOME="\$FHOME" XDG_STATE_HOME="\$FSTATE" XDG_CONFIG_HOME="\$FHOME/.config" TMPDIR="\$FIX/tmp" "\$@"; }
EOF
echo "$FIX/env"
