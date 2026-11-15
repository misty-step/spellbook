#!/usr/bin/env python3
"""Check Daybook's layer-mark invariants over a vault. Read-only; safe on the real vault.

Usage:
  python3 -I check-invariants.py --vault PATH
      [--tsv PATH --approved derived:high,raw:* [--exclude PATH]]
      [--recovery DIR] [--git] [--read-journal-frontmatter] [--paths]

Checks (FAIL unless noted):
  invalid-layer       a top-level `layer:` value other than raw or derived
  raw-unmarked        a note under raw/readwise/ or raw/sessions/ without `layer: raw`
  approved-unmarked   an approved TSV row whose note lacks the approved mark
  wrong-layer         an approved TSV row whose note carries the other mark
  protected-marked    a TSV row that was not approved (his, excluded, unapproved confidence)
                      whose note now carries a mark: an agent edited his note
  missing (WARN)      a TSV row whose note is gone or moved since the proposal
  recovery-journal    the marks run's recovery paths.tsv names a journal/ path
  git-ingest-scope    an `ingest:` commit by daybook-ingest touched a path outside raw/
  journal-marked      (--read-journal-frontmatter, fixtures only) a journal/ note with a mark

journal/ content is never opened unless --read-journal-frontmatter is given; on the real
vault the journal invariant comes from Git metadata (--git). Output is counts only; --paths
also prints offending paths (use it on fixtures, not on the real vault).
"""
import argparse
import collections
import csv
import re
import subprocess
import sys
from pathlib import Path

import yaml

SKIP_DIRS = {".git", ".obsidian", ".trash", "node_modules"}
LAYER_RE = re.compile(rb"(?m)^[ \t]*['\"]?layer['\"]?[ \t]*:[ \t]*['\"]?([A-Za-z_-]*)")


def layer_of(path):
    """The top-level `layer` value, '' when absent. Reads frontmatter only."""
    with open(path, "rb") as f:
        head = f.read(65536)
    head = head.removeprefix(b"\xef\xbb\xbf")
    lines = head.splitlines(keepends=True)
    if not lines or lines[0].rstrip(b"\r\n") != b"---":
        return ""
    end = next((i for i in range(1, len(lines)) if lines[i].rstrip(b"\r\n") == b"---"), None)
    if end is None:
        return ""
    fm = b"".join(lines[1:end])
    try:
        data = yaml.safe_load(fm)
        if isinstance(data, dict):
            v = data.get("layer")
            return "" if v is None else str(v)
    except yaml.YAMLError:
        pass
    m = LAYER_RE.search(fm)  # malformed YAML: fall back to a top-level-looking line
    return m.group(1).decode() if m else ""


def notes(vault, read_journal):
    for p in vault.rglob("*.md"):
        rel = p.relative_to(vault)
        if any(part in SKIP_DIRS or part.startswith(".") for part in rel.parts[:-1]):
            continue
        if rel.parts[0] == "journal" and not read_journal:
            continue
        if p.is_file() and not p.is_symlink():
            yield rel.as_posix(), p


def parse_approved(spec):
    out = set()
    for item in (spec or "").split(","):
        if item:
            layer, _, conf = item.partition(":")
            out.add((layer.strip(), (conf or "*").strip()))
    return out


def is_approved(approved, layer, conf):
    return (layer, conf) in approved or (layer, "*") in approved


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--vault", type=Path, required=True)
    ap.add_argument("--tsv", type=Path)
    ap.add_argument("--approved", help="comma list of layer:confidence (confidence may be *)")
    ap.add_argument("--exclude", type=Path, help="vault-relative paths left out of the marks run")
    ap.add_argument("--recovery", type=Path, help="the marks run's recovery directory")
    ap.add_argument("--git", action="store_true", help="check daybook-ingest commit scopes")
    ap.add_argument("--read-journal-frontmatter", action="store_true")
    ap.add_argument("--paths", action="store_true")
    a = ap.parse_args()
    vault = a.vault.resolve()
    fails, warns = collections.defaultdict(list), collections.defaultdict(list)
    counts = collections.Counter()

    layers = {}
    for rel, p in notes(vault, a.read_journal_frontmatter):
        layers[rel] = layer_of(p)
        counts["layer:" + (layers[rel] or "unmarked")] += 1
        if layers[rel] and layers[rel] not in ("raw", "derived"):
            fails["invalid-layer"].append(rel)
        if rel.startswith(("raw/readwise/", "raw/sessions/")) and layers[rel] != "raw":
            fails["raw-unmarked"].append(rel)
        if rel.startswith("journal/") and layers[rel]:
            fails["journal-marked"].append(rel)
    counts["notes-read"] = len(layers)

    if a.tsv:
        approved = parse_approved(a.approved)
        excluded = set(a.exclude.read_text().splitlines()) if a.exclude else set()
        with a.tsv.open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f, delimiter="\t"):
                rel, layer, conf = row["path"], row["proposed_layer"], row.get("confidence", "")
                ok = layer in ("raw", "derived") and rel not in excluded and is_approved(approved, layer, conf)
                counts["tsv-approved" if ok else "tsv-protected"] += 1
                have = layers.get(rel)
                if have is None:
                    have = layer_of(vault / rel) if (vault / rel).is_file() else None
                if have is None:
                    warns["missing"].append(rel)
                elif ok and have == "":
                    fails["approved-unmarked"].append(rel)
                elif ok and have != layer:
                    fails["wrong-layer"].append(rel)
                elif not ok and have:
                    fails["protected-marked"].append(rel)
                elif ok:
                    counts["tsv-approved-marked"] += 1
                else:
                    counts["tsv-protected-unmarked"] += 1

    if a.recovery:
        rows = list(csv.reader((a.recovery / "paths.tsv").open(encoding="utf-8"), delimiter="\t"))
        counts["recovery-rows"] = len(rows)
        for _, rel in rows:
            if rel.startswith("journal/"):
                fails["recovery-journal"].append(rel)

    if a.git:
        log = subprocess.run(["git", "-C", str(vault), "log", "--author=^daybook-ingest <", "--grep=^ingest:", "--format=%x00%s",
                              "--name-only", "--no-renames"], capture_output=True, text=True, check=True).stdout
        for block in log.split("\0")[1:]:
            subject, *paths = [line for line in block.split("\n") if line]
            if subject.startswith("ingest:"):
                counts["git-ingest-commits"] += 1
                for p in paths:
                    if not p.startswith(("raw/readwise/", "raw/sessions/")):
                        fails["git-ingest-scope"].append(f"{subject[:40]}: {p}")

    for k in sorted(counts):
        print(f"COUNT {k}: {counts[k]}")
    for k in sorted(warns):
        print(f"WARN {k}: {len(warns[k])}")
        if a.paths:
            for p in warns[k][:50]:
                print(f"  {p}")
    for k in sorted(fails):
        print(f"FAIL {k}: {len(fails[k])}")
        if a.paths:
            for p in fails[k][:50]:
                print(f"  {p}")
    print("RESULT", "FAIL" if fails else "PASS")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
