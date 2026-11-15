#!/usr/bin/env bash
# Check the live site the way its users reach it. Read-only.
# Prints PASS|FAIL|BLOCKED <id>: <what it proves>; exit 1 on any FAIL.
#
# Usage: check-site.sh [REPO]          REPO: the explicitly selected checkout
# Env:   DAYBOOK_URL and DAYBOOK_WORKER_URL (explicit deployment targets)
#        DAYBOOK_QA_CLIENT_ID, DAYBOOK_QA_CLIENT_SECRET: the Access service token listed in
#        app/wrangler.toml PRINCIPALS as the QA reader. Without them the signed-in checks
#        report BLOCKED, never PASS.
set -uo pipefail
REPO=${1:?selected checkout}
URL=${DAYBOOK_URL:?set the authorized deployment URL}
failed=0
pass() { printf 'PASS %s: %s\n' "$1" "$2"; }
fail() { printf 'FAIL %s: %s\n' "$1" "$2"; failed=1; }
blocked() { printf 'BLOCKED %s: %s\n' "$1" "$2"; }
verdict() { if "${@:3}"; then pass "$1" "$2"; else fail "$1" "$2"; fi; }

# --- Signed out: every path ends at the Access login, nothing from the vault leaks.
for path in / /journal/ /api/status /llms.txt /index.md /meta/NOW.md; do
  read -r code location < <(curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$URL$path")
  verdict "signed-out-$(tr 'A-Z' 'a-z' <<<"${path#/}" | tr -cs 'a-z0-9\n' - | sed 's/^$/home/;s/-*$//')" \
    "signed-out request for $path redirects to the Access login (got $code)" \
    test "$code" = 302 -a "${location#https://*.cloudflareaccess.com/}" != "$location"
done
read -r code < <(curl -s -o /dev/null -w '%{http_code}\n' "${DAYBOOK_WORKER_URL:?set the worker deployment URL}")
verdict signed-out-workers-dev "the Worker has no public workers.dev route (got $code)" test "$code" != 200

# A forged assertion header is not an identity.
read -r code < <(curl -s -o /dev/null -w '%{http_code}\n' -H 'Cf-Access-Jwt-Assertion: x.y.z' "$URL/api/status")
verdict signed-out-forged "a forged Access assertion still ends at the login (got $code)" test "$code" = 302

# --- Signed in as the QA service token.
if [ -z "${DAYBOOK_QA_CLIENT_ID:-}" ] || [ -z "${DAYBOOK_QA_CLIENT_SECRET:-}" ]; then
  blocked signed-in "DAYBOOK_QA_CLIENT_ID/SECRET are not set; the signed-in checks did not run"
  exit "$failed"
fi
api() { curl -s -H "CF-Access-Client-Id: $DAYBOOK_QA_CLIENT_ID" -H "CF-Access-Client-Secret: $DAYBOOK_QA_CLIENT_SECRET" "$@"; }

status=$(api "$URL/api/status")
indexed=$(jq -r '.index.indexed_commit // empty' <<<"$status")
verdict signed-in-status "the site answers the QA identity with its indexed commit" test -n "$indexed"
master=$(git -C "$REPO" ls-remote origin refs/heads/master | cut -f1)
if [ "$indexed" = "$master" ]; then
  pass index-fresh "the index serves master's head ($indexed)"
elif git -C "$REPO" merge-base --is-ancestor "$indexed" "$master" 2>/dev/null; then
  age=$(( $(date +%s) - $(git -C "$REPO" log -1 --format=%ct "$master") ))
  verdict index-fresh "the index trails master by a commit pushed ${age}s ago (allowed under 900s while CI runs)" test "$age" -lt 900
else
  fail index-fresh "the indexed commit $indexed is not on master"
fi

note=${DAYBOOK_QA_NOTE:?set the authorized QA note path without .md}
verdict note-source "a note's Markdown on the site is byte-identical to Git at the indexed commit" \
  cmp -s <(api "$URL/$note.md") <(git -C "$REPO" show "$indexed:$note.md")
verdict note-page "the note page renders its title" \
  grep -Fq "${DAYBOOK_QA_TITLE:?set the QA note title}" <(api "$URL/$note")
verdict search "search finds the note by words from its title" \
  grep -q "\"id\":\"$note\"" <(api "$URL/api/search?q=${DAYBOOK_QA_QUERY:?set the encoded QA search query}")

file=$(git -C "$REPO" ls-tree -r --name-only "$indexed" -- attachments | grep -E '\.(png|jpg|m4a)$' | head -1)
if [ -n "$file" ]; then
  enc=$(jq -rn --arg p "$file" '$p | split("/") | map(@uri) | join("/")')
  verdict file-bytes "a tracked media file's bytes on the site equal Git's ($file)" \
    cmp -s <(api "$URL/$enc") <(git -C "$REPO" show "$indexed:$file")
  read -r code range < <(api -o /dev/null -D - -H 'Range: bytes=0-99' "$URL/$enc" | tr -d '\r' |
    awk 'NR==1{c=$2} tolower($1)=="content-range:"{r=$2" "$3} END{print c, r}')
  verdict file-range "a range request returns 206 with a content range ($code $range)" test "$code" = 206
else
  blocked file-bytes "no tracked png, jpg or m4a under attachments/ at the indexed commit"
fi

exit "$failed"
