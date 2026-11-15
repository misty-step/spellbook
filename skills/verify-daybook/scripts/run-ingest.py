#!/usr/bin/env python3
"""Run the real Daybook ingester against a fixture vault, with Readwise pointed at a stub.

Usage:
  python3 -I run-ingest.py --vault FIXTURE_VAULT [--script PATH] [--reader-url URL] -- [ARGS]

It loads `scripts/ingest/daybook_ingest.py` from this checkout (or --script), replaces only
the Readwise list URL when --reader-url is given, and calls the ingester's own main(). Every
other line of the ingester runs unchanged: git, gitleaks, state, the lock and the exit code.

Guards (each refusal exits 2 before the ingester loads):
  - --vault is given exactly once, and it, HOME and XDG_STATE_HOME each resolve (symlinks and
    .. followed) to a path below ~/.cache/tmp/verify-daybook-<runid>/ of the real user;
  - ARGS may hold only these exact ingester flags: --only V, --days N, --horizon N, --full,
    --no-commit. Anything else is refused, so no --vault, --vault=X or
    abbreviation such as --v X can reach the ingester's argparse (which takes the last value
    and accepts abbreviations).
The wrapper builds the ingester's argv itself, with the checked vault first.
The caller must set HOME, XDG_STATE_HOME and XDG_CONFIG_HOME to the fixture (see
make-fixture.sh), because the ingester reads them when it loads. The exit code is the
ingester's.
"""
import argparse
import importlib.util
import os
import pwd
import sys
from pathlib import Path

RUNS = os.path.realpath(os.path.join(pwd.getpwuid(os.getuid()).pw_dir, ".cache/tmp"))
FLAGS = {"--full", "--no-commit"}
VALUED = {"--only", "--days", "--horizon"}


def refuse(msg):
    print(f"run-ingest: refusing: {msg}", file=sys.stderr)
    sys.exit(2)


def in_run(path):
    """True when `path` resolves below ~/.cache/tmp/verify-daybook-<runid>/."""
    rel = os.path.relpath(os.path.realpath(path), RUNS)
    parts = rel.split(os.sep)
    return (not rel.startswith("..") and len(parts) >= 2
            and parts[0].startswith("verify-daybook-") and len(parts[0]) > len("verify-daybook-")
            and parts[0] != "verify-daybook-evidence")


def checked_args(rest):
    out, i = [], 0
    while i < len(rest):
        arg = rest[i]
        if arg in FLAGS:
            out.append(arg)
        elif arg in VALUED and i + 1 < len(rest) and not rest[i + 1].startswith("-"):
            out += [arg, rest[i + 1]]
            i += 1
        else:
            refuse(f"ingester argument {arg!r} is not one of {sorted(FLAGS | VALUED)} (pass the vault only as the wrapper's --vault)")
        i += 1
    return out


def main():
    own = sys.argv[1:sys.argv.index("--")] if "--" in sys.argv else sys.argv[1:]
    vaults = [a for a in own if a.startswith("--v") or a.startswith("--vault=")]
    if len(vaults) != 1 or vaults[0] != "--vault":
        refuse("give --vault PATH exactly once, spelled in full, before --")
    ap = argparse.ArgumentParser(allow_abbrev=False)
    ap.add_argument("--vault", required=True)
    ap.add_argument("--script", type=Path, required=True)
    ap.add_argument("--reader-url")
    ap.add_argument("rest", nargs=argparse.REMAINDER)
    a = ap.parse_args()
    rest = checked_args(a.rest[1:] if a.rest[:1] == ["--"] else a.rest)
    for name in ("HOME", "XDG_STATE_HOME"):
        if not in_run(os.environ.get(name) or "/"):
            refuse(f"{name} must resolve below ~/.cache/tmp/verify-daybook-<runid>/")
    if not in_run(a.vault):
        refuse(f"--vault {a.vault!r} does not resolve below ~/.cache/tmp/verify-daybook-<runid>/")
    vault = os.path.realpath(a.vault)
    sys.dont_write_bytecode = True  # leave no __pycache__ beside the ingester
    spec = importlib.util.spec_from_file_location("daybook_ingest", a.script)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if a.reader_url:
        mod.READER_LIST = a.reader_url
    sys.argv = [str(a.script), "--vault", vault, *rest]
    sys.exit(mod.main())


if __name__ == "__main__":
    main()
