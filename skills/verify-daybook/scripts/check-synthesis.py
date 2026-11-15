#!/usr/bin/env python3
"""Check that an agent-written synthesis meets Daybook's contract. Read-only.

Usage:
  python3 -I check-synthesis.py --vault PATH [--base REV] [--summary] NOTE...

NOTE is a vault-relative path to a synthesis the agent wrote. Per note (FAIL each):
  in-journal / in-raw     the note lives under journal/ or raw/
  not-markdown / missing  the path is not an existing .md file
  bad-frontmatter         no parseable frontmatter, or an empty `type` or `created`
  not-derived             frontmatter lacks `layer: derived`
  no-citations            the note cites no vault path
  unresolved-citation     a cited path ([[wikilink]], markdown link, `path.md`, or a
                          frontmatter `sources:` entry) does not resolve to a vault file
  cites-journal           a citation points into journal/ (syntheses do not read journals)
  secret                  gitleaks flags the note (or the scan cannot run: fail closed)
With --base REV (a Git vault), for every other path changed since REV, committed,
staged, unstaged or untracked:
  journal-changed         a journal/ path changed
--summary prints counts per reason instead of paths (use it on the real vault).
Exit 1 when anything fails.
"""
import argparse
import collections
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

WIKI = re.compile(r"!?\[\[([^\]|#^]+)(?:[#^][^\]|]*)?(?:\|[^\]]*)?\]\]")
MDLINK = re.compile(r"\]\(([^)\s]+)\)")
TICK = re.compile(r"`([^`\s]+\.md)`")


def frontmatter(text):
    if not text.startswith("---"):
        return None
    parts = text.split("\n---", 1)
    if len(parts) < 2:
        return None
    try:
        data = yaml.safe_load(parts[0][3:])
    except yaml.YAMLError:
        return None
    return data if isinstance(data, dict) else None


def citations(text, fm):
    cites = [m.group(1).strip() for m in WIKI.finditer(text)]
    cites += [m.group(1) for m in MDLINK.finditer(text) if "://" not in m.group(1) and not m.group(1).startswith("#")]
    cites += TICK.findall(text)
    src = (fm or {}).get("sources") or []
    cites += [str(s) for s in (src if isinstance(src, list) else [src])]
    out = []
    for c in cites:
        c = c.strip().lstrip("/")
        if c.startswith("[[") and c.endswith("]]"):
            c = c[2:-2].split("|")[0]
        if c and c not in out:
            out.append(c)
    return out


def resolves(vault, cite):
    for cand in (cite, cite + ".md"):
        p = (vault / cand)
        try:
            resolved = p.resolve().relative_to(vault)
        except ValueError:
            return None
        if p.is_file():
            return resolved.as_posix()
    return None


def gitleaks_flags(path):
    if not shutil.which("gitleaks"):
        return True
    config = Path(os.environ.get("HOME", "~")).expanduser() / ".config/daybook-ingest/gitleaks.toml"
    with tempfile.TemporaryDirectory(prefix="check-synthesis-") as tmp:
        shutil.copyfile(path, Path(tmp) / "note.txt")
        cmd = ["gitleaks", "dir", tmp, "--no-banner", "--redact", "--exit-code", "3", "--log-level", "error"]
        if config.is_file():
            cmd += ["--config", str(config)]
        r = subprocess.run(cmd, capture_output=True)
    return r.returncode != 0


def changed_paths(vault, base):
    def lines(*args):
        out = subprocess.run(["git", "-C", str(vault), *args], capture_output=True, text=True, check=True).stdout
        return [p for p in out.split("\0") if p]
    paths = set(lines("diff", "--name-only", "-z", "--no-renames", base))
    paths |= set(lines("diff", "--name-only", "-z", "--no-renames", "--cached", base))
    paths |= set(lines("ls-files", "-z", "--others", "--exclude-standard"))
    return sorted(paths)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--vault", type=Path, required=True)
    ap.add_argument("--base")
    ap.add_argument("--summary", action="store_true")
    ap.add_argument("notes", nargs="+")
    a = ap.parse_args()
    vault = a.vault.resolve()
    fails = collections.defaultdict(list)
    passed = 0
    targets = [n.strip("/") for n in a.notes]
    for rel in targets:
        reasons = []
        top = rel.split("/", 1)[0]
        if top == "journal":
            reasons.append("in-journal")
        if top == "raw":
            reasons.append("in-raw")
        path = vault / rel
        if not rel.endswith(".md"):
            reasons.append("not-markdown")
        try:
            resolved = path.resolve().relative_to(vault)
            blocked = resolved.parts[0] == "journal"
        except (ValueError, IndexError):
            blocked = True
        if blocked:
            reasons.append("protected-path")
        elif not path.is_file():
            reasons.append("missing")
        else:
            text = path.read_text(encoding="utf-8", errors="replace")
            fm = frontmatter(text)
            if fm is None or not str(fm.get("type") or "").strip() or not str(fm.get("created") or "").strip():
                reasons.append("bad-frontmatter")
            if str((fm or {}).get("layer") or "") != "derived":
                reasons.append("not-derived")
            cites = citations(text, fm)
            if not cites:
                reasons.append("no-citations")
            for c in cites:
                hit = resolves(vault, c)
                if hit is None:
                    reasons.append("unresolved-citation")
                elif hit.startswith("journal/"):
                    reasons.append("cites-journal")
            if gitleaks_flags(path):
                reasons.append("secret")
        reasons = sorted(set(reasons))
        for r in reasons:
            fails[r].append(rel)
        if reasons:
            if not a.summary:
                print(f"FAIL {rel}: {', '.join(reasons)}")
        else:
            passed += 1
            if not a.summary:
                print(f"PASS {rel}")

    if a.base:
        for rel in changed_paths(vault, a.base):
            if rel in targets:
                continue
            path = vault / rel
            try:
                journal_alias = path.resolve().relative_to(vault).parts[0] == "journal"
            except (ValueError, IndexError):
                journal_alias = True
            if rel.startswith("journal/") or journal_alias:
                fails["journal-changed"].append(rel)
                continue


    if a.summary:
        print(json.dumps({"notes": len(targets), "passed": passed,
                          "fail_reasons": {k: len(v) for k, v in sorted(fails.items())}}))
    else:
        for k in ("journal-changed",):
            for p in fails.get(k, []):
                print(f"FAIL vault: {k}: {p}")
    print("RESULT", "FAIL" if fails else "PASS")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
